import Ajv, { AnySchema, SchemaObject } from 'ajv';
import type { ErrorObject, SchemaCxt } from 'ajv-draft-04';
import { Request } from 'express';
import { OpenAPIV3, ValidationError } from '../framework/types';

type SchemaEnv = SchemaCxt['schemaEnv'];

export class ContentType {
  public readonly contentType: string = null;
  public readonly mediaType: string = null;
  public readonly charSet: string = null;
  public readonly withoutBoundary: string = null;
  public readonly isWildCard: boolean;
  private constructor(contentType: string | null) {
    this.contentType = contentType;
    if (contentType) {
      this.withoutBoundary = contentType
        .replace(/;\s{0,}boundary.*/, '')
        .toLowerCase();
      this.mediaType = this.withoutBoundary.split(';')[0].toLowerCase().trim();
      this.charSet = this.withoutBoundary.split(';')[1]?.toLowerCase();
      this.isWildCard = RegExp(/^[a-z]+\/\*$/).test(this.contentType);
      if (this.charSet) {
        this.charSet = this.charSet.toLowerCase().trim();
      }
    }
  }
  public static from(req: Request): ContentType {
    return new ContentType(req.headers['content-type']);
  }

  public static fromString(type: string): ContentType {
    return new ContentType(type);
  }

  public equivalents(): string[] {
    if (!this.withoutBoundary) return [];
    if (this.charSet) {
      return [this.mediaType, `${this.mediaType}; ${this.charSet}`];
    }
    return [this.withoutBoundary, `${this.mediaType}; charset=utf-8`];
  }
}

/**
 * (side-effecting) modifies the errors object
 * TODO - do this some other way
 * @param errors
 */
export function augmentAjvErrors(errors: ErrorObject[] = []): ErrorObject[] {
  errors.forEach((e) => {
    if (e.keyword === 'enum') {
      const params: any = e.params;
      const allowedEnumValues = params?.allowedValues;
      e.message = !!allowedEnumValues
        ? `${e.message}: ${allowedEnumValues.join(', ')}`
        : e.message;
    }
  });
  const serDesPaths = new Set<string>();
  return errors.filter((e) => {
    if (serDesPaths.has(e.schemaPath)) {
      return false;
    }
    if (e.params['x-eov-res-serdes']) {
      // If response serialization failed,
      // silence additional errors about not being a string.
      serDesPaths.add(e.schemaPath.replace('x-eov-res-serdes', 'x-eov-type'));
    }
    return true;
  });
}
export function ajvErrorsToValidatorError(
  status: number,
  errors: ErrorObject[],
): ValidationError {
  return {
    status,
    errors: errors.map((e) => {
      const path = pathFromAjvValidationError(e);
      return {
        path,
        message: e.message,
        errorCode: `${e.keyword}.openapi.validation`,
      };
    }),
  };
}

export function pathFromAjvValidationError(ajvValidationError: ErrorObject) {
  const params: any = ajvValidationError.params;
  const required =
    params?.missingProperty &&
    ajvValidationError.instancePath + '/' + params.missingProperty;
  const additionalProperty =
    params?.additionalProperty &&
    ajvValidationError.instancePath + '/' + params.additionalProperty;
  const path =
    required ?? additionalProperty ?? ajvValidationError.instancePath ?? ajvValidationError.schemaPath;
  return path;
}

export const deprecationWarning =
  process.env.NODE_ENV !== 'production' ? console.warn : () => {};

/**
 *
 * @param accepts the list of accepted media types
 * @param expectedTypes - expected media types defined in the response schema
 * @returns the content-type
 */
export const findResponseContent = function (
  accepts: string[],
  expectedTypes: string[],
): string {
  const expectedTypesSet = new Set(expectedTypes);
  // if accepts are supplied, try to find a match, and use its validator
  for (const accept of accepts) {
    const act = ContentType.fromString(accept);
    if (act.contentType === '*/*') {
      return expectedTypes[0];
    } else if (expectedTypesSet.has(act.contentType)) {
      return act.contentType;
    } else if (expectedTypesSet.has(act.mediaType)) {
      return act.mediaType;
    } else if (act.isWildCard) {
      // wildcard of type application/*
      const [type] = act.contentType.split('/', 1);

      for (const expectedType of expectedTypesSet) {
        if (new RegExp(`^${type}\/.+$`).test(expectedType)) {
          return expectedType;
        }
      }
    } else {
      for (const expectedType of expectedTypes) {
        const ect = ContentType.fromString(expectedType);
        if (ect.mediaType === act.mediaType) {
          return expectedType;
        }
      }
    }
  }
  return null;
};

type ErrorWithSchemaOfRefs = ErrorObject<string, Record<string, any>, Array<OpenAPIV3.ReferenceObject>>;

const isErrorWithSchemaOfRefs = (error: ErrorObject) : error is ErrorWithSchemaOfRefs => {
  const errorWithObjectSchema = error as ErrorWithSchemaOfRefs;
  return errorWithObjectSchema.schema !== undefined &&
    errorWithObjectSchema.schema.reduce !== undefined;
}


const isObjectSchema = (schema: AnySchema): schema is SchemaObject => {
  return typeof schema !== 'boolean';
}

const collectSubschemaInformation = (ajv: Ajv, schemaEnv: SchemaEnv, lastSchema: string, seenSchemas = {}) => {
  const schemaObject = schemaEnv.schema;

  if (!isObjectSchema(schemaObject)) return [];

  let schemas = [];

  schemas.push({
    schema: schemaEnv.schema,
    ref: schemaEnv.baseId
  });


  const refs = Object.keys(schemaEnv.refs);
  const items = schemaObject.items || undefined;
  const properties = Object.keys(schemaObject.properties || {});

  refs.forEach(pointer => {
    // Only recurse if we have not seen this schema before.
    if (!seenSchemas[pointer]) {
      seenSchemas[pointer] = true;
      const subSchemaEnv = ajv.schemas[pointer];
      schemas = schemas.concat(collectSubschemaInformation(ajv, subSchemaEnv, pointer, seenSchemas));
    }
  });

  if (items && !items.$ref) {
    schemas = schemas.concat(collectSubschemaInformation(ajv, {
      schema: items,
      baseId: schemaEnv.baseId,
      root: schemaEnv.root,
      refs: {},
      dynamicAnchors: {}
    }, lastSchema, seenSchemas));
  }

  properties.forEach(property => {
    const propertySchema = schemaObject.properties[property];
    // Can skip properties with refs,
    // Already considered from the SchemaEnv.refs
    if (!propertySchema.$ref) {
      schemas.push({
        schema: propertySchema,
        property: property
      });
    } else {
      schemas.push({
        schema: ajv.schemas[propertySchema.$ref].schema,
        property: property
      });
    }
  });

  return schemas;
};

/**
 * Find nested oneOf errors from ajv, these can often not make sense to api consumers
 * and expose implementation details.
 *
 * The particular case that is confusing is when all discriminated sub-schemas fail validation.
 * This causes errors from *all* schemas to be present. Which can be very confusing.
 *
 * To make this more clear to the developer, we can do the following two optimizations:
 *
 * 1) If
 *        - the discriminated propertyName is provided (ex: type), and it matches a subschema
 *    Then
 *        - filter out errors from other sub-schemas if they can be identified as specific
 *          *only* to a non-discriminated sub-schema.
 *
 * 2) If
 *        - the discriminated propertyName is *not* provided (ex: type)
 *        - it is provided but there is no mapping for it.
 *    Then
 *        - only include the error specifying the propertyName must be provided w/ its allowed values.
 *
 * As well as the errories from "not-mapped" schemas
 */
export const filterOneofSubschemaErrors = function (errors: Array<ErrorObject>, ajv: Ajv) {
  const oneOfErrorInformation = errors.filter(error => {
    return error.keyword === 'oneOf';
  }).filter(isErrorWithSchemaOfRefs).map(error => {
    const discriminatorPropertyPath = `${error.instancePath}/${error.parentSchema.discriminator.propertyName}`;
    const discriminatorProperty = error.parentSchema.discriminator.propertyName;
    const discriminatedValue = error.data[discriminatorProperty];
    const discriminator = error.parentSchema.discriminator;
    const discriminatorMapping = discriminatedValue && discriminator.mapping ? discriminator.mapping[discriminatedValue] : undefined;
    const allowedValues = Object.keys(discriminator.mapping ?? []);

    const disciminatorSubschemas = error.schema.reduce((subSchemaMap, schema) => {
      subSchemaMap[schema.$ref] = collectSubschemaInformation(ajv, ajv.schemas[schema.$ref], schema.$ref);
      return subSchemaMap;
    }, {});

    const discriminatedSchema = discriminatorMapping
      ? disciminatorSubschemas[discriminatorMapping]
      : undefined;

    /**
     * If a valid discriminator propertyName value was provided,
     * then we can provide Sets of valid properties / refs / schemas
     */
    const discriminatedPropertyNames = discriminatorMapping
      ? discriminatedSchema.filter(schemaInfo => !!schemaInfo.property).map(schemaInfo => schemaInfo.property)
      : [];
    const discriminatedPropertyNamesSet = new Set(discriminatedPropertyNames);
    const discriminatedRefs = discriminatorMapping
      ? discriminatedSchema.filter(schemaInfo => !!schemaInfo.ref).map(schemaInfo => schemaInfo.ref)
      : [];
    const discriminatedRefsSet = new Set(discriminatedRefs);
    const discriminatedSchemas = discriminatorMapping
      ? discriminatedSchema.map(schemaInfo => schemaInfo.schema)
      : [];

    return {
      instancePath: error.instancePath,
      discriminator: error.parentSchema.discriminator,
      invalidDiscriminatorValue: discriminatorMapping === undefined,
      discriminatorProperty,
      discriminatorPropertyPath,
      disciminatorSubschemas,
      discriminatedPropertyNamesSet,
      discriminatedRefsSet,
      discriminatedSchemas,
      discriminatedSchema,
      data: error.data,
      allowedValues
    };
  });

  type OneOfInformation = (typeof oneOfErrorInformation)[0];
  const discriminatorValueError: Record<string, {
    oneOf: OneOfInformation;
    error: ErrorObject
  }> = {};
  const discriminatorMissingError: Record<string, {
    oneOf: OneOfInformation;
    error: ErrorObject
  }> = {};

  /**
   * Filter out errors from nested oneOf schemas from ajv.
   * Without this filtration, a violation of one of the discriminated schemas then causes
   * validations errors from *every discriminated schema*. This is confusing when the user
   * provides the `type` property and targets a specific schema.
   */
  let filteredErrors = errors.filter(error => {
    let matchingOneOf: OneOfInformation | undefined;

    oneOfErrorInformation.forEach(oneOf => {
      const isErrorFromThisOneOf = error.instancePath.indexOf(oneOf.instancePath) > -1;
      matchingOneOf = isErrorFromThisOneOf ? oneOf : undefined;
    });
    // Only try to filter if we know what oneOf schema the error originates from.
    if (!matchingOneOf) return true;

    // Squash validation saying nothing matches the oneOf schema
    const isOneOfFailedError = error.keyword === 'oneOf';
    if (isOneOfFailedError) return false;


    /*
     * Check if one of many errors saying sub-schema propertyName is not a valid value.
     * { "instancePath": "/body/manager/type", "schemaPath": "#/required", "keyword": "enum", ... }
     * { "instancePath": "/body/manager/type", "schemaPath": "#/required", "keyword": "enum", ... }
     */
    const isDiscriminatorPropertyError = error.instancePath === matchingOneOf.discriminatorPropertyPath;
    if (isDiscriminatorPropertyError) {
      if (matchingOneOf.invalidDiscriminatorValue) {
        discriminatorValueError[matchingOneOf.discriminatorPropertyPath] = {
          oneOf: matchingOneOf,
          error
        }
      }
      return false;
    }
    /*
     * Check if discriminator.propertyName is missing, there will be as many of these as there are mapped sub-schemas.
     * { "instancePath": "/body/manager", "schemaPath": "#/required", "keyword": "required", ... }
     * { "instancePath": "/body/manager", "schemaPath": "#/required", "keyword": "required", ... }
     */
    const isMissingDiscriminatorPropertyError = error.keyword === "required"
      && error.instancePath ===  matchingOneOf.instancePath
      && error.params.missingProperty === matchingOneOf.discriminatorProperty;
    if (isMissingDiscriminatorPropertyError) {
      if (matchingOneOf.invalidDiscriminatorValue) {
        discriminatorMissingError[matchingOneOf.discriminatorPropertyPath] = {
          oneOf: matchingOneOf,
          error
        }
      }
      return false;
    }

    /**
     * Decide whether or not to squash errors from within the discriminated sub-schemas.
     *
     * Two general cases:
     *
     * 1) The error parentSchema is a schema that is in #/components/schemas
     *    1a) The parentSchema is referenced by the discriminated schema.
     *    1b) The parentSchema is not referenced by the discriminated schema.
     *
     * 2) The error parentSchema is an inline schema.
     *    2a) The parentSchema is a property we can uniquely identify as belonging either
     *        to the discriminated schema only, OR to *not* the discriminated schema.
     *        Here we can make a filtering decision.
     *
     *    2b) The parentSchema may belong to any of the schemas.
     *        If so, cannot filter it.
     */
    const isInlineParentSchema = error.schemaPath.indexOf('#/components') === -1;

    if (isInlineParentSchema) {
      const isDiscriminatedSchema = matchingOneOf.discriminatedSchemas.filter(subSchema => subSchema === error.parentSchema).length === 1;
      return isDiscriminatedSchema;
    } else {
      // keyword error schemaPath like:
      // "#/components/schemas/UserId/x-eov-req-serdes-async"
      const schemaPathWithoutKeyword = error.schemaPath.split('/').slice(0, -1).join('/');
      return matchingOneOf.discriminatedRefsSet.has(schemaPathWithoutKeyword);
    }
  });

  const oneOfWithInvalidDiscriminatorPropertyname = Object.keys(discriminatorValueError);
  const oneOfWithMissingDiscriminatorPropertyname = Object.keys(discriminatorMissingError);

  return filteredErrors
    .concat(
      oneOfWithInvalidDiscriminatorPropertyname.map(oneOfSchema => {
        const errorAndOneOfInfo = discriminatorValueError[oneOfSchema];
        // Make sure error has correct allowedValues from mapping
        // as sub-schemas could have an enum w/ only one value from
        // the mapping
        const allowedValues = errorAndOneOfInfo.oneOf.allowedValues;
        errorAndOneOfInfo.error.params.allowedValues = allowedValues;
        return errorAndOneOfInfo.error;
      })
    )
    .concat(
      oneOfWithMissingDiscriminatorPropertyname.map(oneOfSchema => {
        const errorAndOneOfInfo = discriminatorMissingError[oneOfSchema];
        return errorAndOneOfInfo.error;
      })
    );
}