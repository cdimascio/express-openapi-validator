import type { ErrorObject } from 'ajv-draft-04';
import { Request } from 'express';
import { AjvInstance, ValidationError } from '../framework/types';

export class ContentType {
  public readonly mediaType: string = null;
  public readonly isWildCard: boolean;
  public readonly parameters: { charset?: string, boundary?: string } & Record<string, string> = {};
  private constructor(contentType: string | null) {
    if (contentType) {
      const parameterRegExp = /;\s*([^=]+)=([^;]+)/g;
      const paramMatches = contentType.matchAll(parameterRegExp)
      if (paramMatches) {
        this.parameters = {};
        for (let match of paramMatches) {
          const key = match[1].toLowerCase();
          let value = match[2];

          if (key === 'charset') {
            // charset parameter is case insensitive
            // @see [rfc2046, Section 4.1.2](https://www.rfc-editor.org/rfc/rfc2046#section-4.1.2)
            value = value.toLowerCase();
          }
          this.parameters[key] = value;
        };
      }
      this.mediaType = contentType.split(';')[0].toLowerCase().trim();
      this.isWildCard = RegExp(/^[a-z]+\/\*$/).test(contentType);
    }
  }
  public static from(req: Request): ContentType {
    return new ContentType(req.headers['content-type']);
  }

  public static fromString(type: string): ContentType {
    return new ContentType(type);
  }

  public equivalents(): ContentType[] {
    const types: ContentType[] = [];
    if (!this.mediaType) {
      return types;
    }
    types.push(new ContentType(this.mediaType));

    if (!this.parameters['charset']) {
      types.push(new ContentType(`${this.normalize(['charset'])}; charset=utf-8`));
    }
    return types;
  }

  public normalize(excludeParams: string[] = ['boundary']): string {
    let parameters = '';
    Object.keys(this.parameters)
      .sort()
      .forEach((key) => {
        if (!excludeParams.includes(key)) {
          parameters += `; ${key}=${this.parameters[key]}`                  
        }
      });
    if (this.mediaType)
      return this.mediaType + parameters;
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
      const params: any = e.params;
      const required =
        params?.missingProperty &&
        e.instancePath + '/' + params.missingProperty;
      const additionalProperty =
        params?.additionalProperty &&
        e.instancePath + '/' + params.additionalProperty;
      const unevaluatedProperty =
        params?.unevaluatedProperty &&
        e.instancePath + '/' + params.unevaluatedProperty;
      const path =
        required ?? additionalProperty ?? unevaluatedProperty ?? e.instancePath ?? e.schemaPath;
      return {
        path,
        message: e.message,
        errorCode: `${e.keyword}.openapi.validation`,
      };
    }),
  };
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
  const expectedTypesMap = new Map();
  for(let type of expectedTypes) {
    expectedTypesMap.set(ContentType.fromString(type).normalize(), type);
  }
  
  // if accepts are supplied, try to find a match, and use its validator
  for (const accept of accepts) {
    const act = ContentType.fromString(accept);
    const normalizedCT = act.normalize();
    if (normalizedCT === '*/*') {
      return expectedTypes[0];
    } else if (expectedTypesMap.has(normalizedCT)) {
      return normalizedCT;
    } else if (expectedTypesMap.has(act.mediaType)) {
      return act.mediaType;
    } else if (act.isWildCard) {
      // wildcard of type application/*
      const [type] = normalizedCT.split('/', 1);

      for (const expectedType of expectedTypesMap) {
        if (new RegExp(`^${type}\/.+$`).test(expectedType[0])) {
          return expectedType[1];
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

export const zipObject = (keys, values) =>
  keys.reduce((acc, key, idx) => {
    acc[key] = values[idx]
    return acc
  }, {})

/**
 * Tries to fetch a schema from ajv instance by the provided key otherwise adds (and
 * compiles) the schema under provided key. We provide a key to avoid ajv library
 * using the whole schema as a cache key, leading to a lot of unnecessary memory
 * usage - this is not recommended by the library either:
 * https://ajv.js.org/guide/managing-schemas.html#cache-key-schema-vs-key-vs-id
 *
 * @param ajvCacheKey - Key which will be used for ajv cache
 */
export function useAjvCache(ajv: AjvInstance, schema: object, ajvCacheKey: string) {
  let validator = ajv.getSchema(ajvCacheKey);
  if (!validator) {
    ajv.addSchema(schema, ajvCacheKey);
    validator = ajv.getSchema(ajvCacheKey);
  }
  return validator
}
