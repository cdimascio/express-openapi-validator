import * as Ajv from 'ajv';
import * as draftSchema from 'ajv/lib/refs/json-schema-draft-04.json';
import { formats } from './formats';

const TYPE_JSON = 'application/json';

export function createRequestAjv(openApiSpec, options: any = {}) {
  return createAjv(openApiSpec, options);
}
export function createResponseAjv(openApiSpec, options: any = {}) {
  return createAjv(openApiSpec, options, false);
}
function createAjv(openApiSpec, options: any = {}, request: boolean = true) {
  const ajv = new Ajv({
    ...options,
    formats: { ...formats, ...options.formats },
    schemaId: 'auto',
    allErrors: true,
    meta: draftSchema,
  });
  ajv.removeKeyword('propertyNames');
  ajv.removeKeyword('contains');
  ajv.removeKeyword('const');

  /**
   * Remove readOnly property in requestBody when validate.
   * If you want validate response, then need secondary Ajv without modifying this keyword
   * You can probably change this rule so that can't delete readOnly property in response
   */
  if (request) {
    ajv.removeKeyword('readOnly');
    ajv.addKeyword('readOnly', {
      modifying: true,
      compile: sch => {
        if (sch) {
          return (data, path, obj, propName) => {
            delete obj[propName];
            return true;
          };
        }

        return () => true;
      },
    });
  }

  if (openApiSpec.components.schemas) {
    Object.entries(openApiSpec.components.schemas).forEach(
      ([id, schema]: any[]) => {
        ajv.addSchema(schema, `#/components/schemas/${id}`);
      },
    );
  }

  if (openApiSpec.components.requestBodies) {
    Object.entries(openApiSpec.components.requestBodies).forEach(
      ([id, schema]: any[]) => {
        // TODO add support for content all content types
        ajv.addSchema(
          schema.content[TYPE_JSON].schema,
          `#/components/requestBodies/${id}`,
        );
      },
    );
  }

  return ajv;
}
