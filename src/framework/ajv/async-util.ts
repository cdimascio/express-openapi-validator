import { Options } from "../types";
import { OpenAPIV3 } from '../types';
import * as cloneDeep from 'lodash.clonedeep';

interface SchemaWithComponents {
  components?: ComponentSchemas;
  [key: string]: unknown;
}

export type PossiblyAsyncObject = object | (object & {$async: true});

/**
 * A schema reference object that has an async format somewhere in
 * its dependencies.
 *
 * eg `
 * {
 *   $ref: '#/components/schemas/foo`,
 *   $async: true
 * }
 */
type AsyncReferenceObject = (OpenAPIV3.ReferenceObject & {
  $async: true
});
export type PossiblyAsyncReferenceObject = OpenAPIV3.ReferenceObject | AsyncReferenceObject;

/**
 * A schema object that has an async format somewhere in
 * its dependencies, or directly in its properties
 *
 * Examples:
 *
 * {
 *   type: 'string',
 *   format: 'some-format-that-needs-async-deserialize',
 *   $async: true
 * }
 *
 * {
 *   type: 'object',
 *   $async: true,
 *   properties: {
 *     foo: {
 *      $async: true,
 *      type: 'string',
 *      format: 'some-format-that-needs-async-deserialize',
 *      $async: true
 *     }
 *   }
 * }
 */
type AsyncSchemaObject = (OpenAPIV3.SchemaObject & {
  $async: true
});
export type PossiblyAsyncSchemaObject = OpenAPIV3.SchemaObject | AsyncSchemaObject;

export interface ComponentSchemas {
  [key: string]: PossiblyAsyncReferenceObject | PossiblyAsyncSchemaObject
}

interface ReferenceMap { [key: string]: Array<string>}
interface AsyncFormatsMap {[key: string]: boolean}
interface AsyncComponentsMap {[key: string]: boolean}
interface DependentsMap {[key: string]: Array<string>}

function isSchemaWithComponents(schema: object): schema is SchemaWithComponents {
  return (schema as SchemaWithComponents)?.components !== undefined;
}

/**
 * Determine if an object contains any schema with $async property at top level
 */
export const hasAnySchemaWithAsync = (schemas: object) => {
  return !!schemas && Object.values(schemas).reduce((asyncDetected, componentSchema) => {
    return asyncDetected || componentSchema.$async || false;
  }, false);
}

/**
 * Determines if top level OpenApi schema has async component schemas.
 */
export const hasAsync = (schema: object) => {
  return isSchemaWithComponents(schema) && hasAnySchemaWithAsync(schema.components?.schemas);
};

/**
 * Builds schema wth top level $async if its components property contains subschemas with $async
 */
export function buildSchemaWithAsync(schema: object): PossiblyAsyncObject {
  if (hasAsync(schema)) {
    return {
      ...schema,
      $async: true
    }
  } else {
    return schema;
  }
}

/**
 * Builds a map of <format name>: boolean,
 * indicating if that format has async deserialization or not.
 *
 * @param options
 * @returns
 */
export function buildAsyncFormats(options: Options) {
  const asyncFormats = {};

  if (options.formats) {
    for (const format in options.formats) {
      const formatOptions = options.formats[format];
      if (typeof formatOptions !== 'string' &&
          typeof formatOptions !== 'boolean' &&
          !(formatOptions instanceof RegExp) &&
          formatOptions.hasOwnProperty('async')
      ) {
        throw new Error('async not yet implemented on formats.');
      }
    }
  }

  if (options.serDesMap) {
    for (const format in options.serDesMap) {
      if (options.serDesMap[format].async) {
        asyncFormats[format] = true;
      }
    }
  }

  return asyncFormats;
}

function isAsyncReferenceOrSchema(object: PossiblyAsyncReferenceObject | PossiblyAsyncSchemaObject): object is AsyncReferenceObject | AsyncSchemaObject {
  return (object as PossiblyAsyncReferenceObject)['$async'] === true || (object as PossiblyAsyncSchemaObject)['$async'] === true;
}

function isReferenceObject(object:  PossiblyAsyncReferenceObject | PossiblyAsyncSchemaObject): object is PossiblyAsyncReferenceObject {
  return object['$ref'] !== undefined;
}

/**
 * Builds a new component schema support async deserialize.
 * It does this by walking component schemas and adding an $asnyc: true property
 * to each schema that has a property of `type: string`, and serdes config for async support.
 *
 * [Ajv async reference doc](https://ajv.js.org/guide/async-validation.html)
 *
 */
export const buildSchemasWithAsync = (asyncFormats: AsyncFormatsMap, schemas: ComponentSchemas): ComponentSchemas => {
  const componentsWithAsync: AsyncComponentsMap = {};
  const dependentsMap: DependentsMap = {};

  const asyncSchemas: ComponentSchemas = cloneDeep<ComponentSchemas>(schemas);

  // Walk all top level schemas
  // Note dependencies of these top level schemas and if they require async.
  Object.entries(asyncSchemas).forEach(([id, schemaObject]) => {
    const thisComponentId = `#/components/schemas/${id}`;

    recordDependenciesAndAsync(
      thisComponentId,
      schemaObject,
      dependentsMap,
      componentsWithAsync,
      asyncFormats
    );
  });

  const toDecorate = Object.keys(componentsWithAsync);

  // Decorate the async schema and any dependents.
  while (toDecorate.length > 0) {
    const current = toDecorate.pop();
    if (dependentsMap[current]) {
      // If the dependent hasn't been decorated yet, push it on the decoration stack
      dependentsMap[current].forEach(dependent => {
        const possiblyAsyncDependent = asyncSchemas[dependent.replace('#/components/schemas/', '')];
        if (!isAsyncReferenceOrSchema(possiblyAsyncDependent)) {
          toDecorate.push(dependent);
        }
      });
    }
    asyncSchemas[current.replace('#/components/schemas/', '')] = {
      ...asyncSchemas[current.replace('#/components/schemas/', '')],
      $async: true
    };
  }

  return asyncSchemas;
}

const recordDependenciesAndAsync = (
  componentId: string,
  schemaObject: PossiblyAsyncReferenceObject | PossiblyAsyncSchemaObject,
  dependentsMap: ReferenceMap,
  componentsWithAsync: AsyncComponentsMap,
  asyncFormats: AsyncFormatsMap
) => {
  // This schema references another schema, record the dependency and carry on
  if (isReferenceObject(schemaObject)) {
    dependentsMap[schemaObject['$ref']] = dependentsMap[schemaObject['$ref']] || [];
    dependentsMap[schemaObject['$ref']].push(componentId);
  } else {
    // This schema is a string type which has async, note it.
    const isStringSchema = schemaObject.type === 'string' || schemaObject['x-eov-type'] === 'string';
    if (isStringSchema && schemaObject.format && asyncFormats[schemaObject.format]) {
      componentsWithAsync[componentId] = true;
    } else if (schemaObject.properties) {
      // This schema has properties that may be sub-schemas that require async, record them too.
      Object.entries(schemaObject.properties).forEach(([propertyId, propertySchema]) => {
        recordDependenciesAndAsync(
          componentId,
          propertySchema,
          dependentsMap,
          componentsWithAsync,
          asyncFormats
        )
      });
    } else if (schemaObject.allOf || schemaObject.oneOf || schemaObject.anyOf) {
      const conditionalSchemas = schemaObject.allOf || schemaObject.oneOf || schemaObject.anyOf;
      conditionalSchemas.forEach(conditionalSchema => {
        recordDependenciesAndAsync(
          componentId,
          conditionalSchema,
          dependentsMap,
          componentsWithAsync,
          asyncFormats
        )
      });
    } else if (schemaObject.type === 'array' && schemaObject.items ) {
      recordDependenciesAndAsync(
        componentId,
        schemaObject.items,
        dependentsMap,
        componentsWithAsync,
        asyncFormats
      );
    }
  }
}