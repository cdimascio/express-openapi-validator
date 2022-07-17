import { ComponentSchemas } from "./build-async-schema";

interface SchemaWithComponents {
  components?: ComponentSchemas;
  [key: string]: unknown;
}

export type PossiblyAsyncObject = object | (object & {$async: true});

function isSchemaWithComponents(schema: object): schema is SchemaWithComponents {
  return (schema as SchemaWithComponents)?.components !== undefined;
}

/**
 * Determine if an object contains any schema with $async property
 */
export const hasAnySchemaWithAsync = (schemas: object) => {
  return schemas && Object.values(schemas).reduce((asyncDetected, componentSchema) => {
    return asyncDetected || componentSchema.$async;
  }, false);
}

/**
 * Determines if top level OpenApi schema has async component schemas.
 */
export const hasAsync = (schema: object) => {
  return isSchemaWithComponents(schema) && hasAnySchemaWithAsync(schema.components?.schemas);
};

export function schemaWithAsync(schema: object): PossiblyAsyncObject {
  if (hasAsync(schema)) {
    return {
      ...schema,
      $async: true
    }
  } else {
    return schema;
  }
}
