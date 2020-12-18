import * as Ajv from 'ajv';
import * as draftSchema from 'ajv/lib/refs/json-schema-draft-04.json';
import { formats } from './formats';
import { OpenAPIV3 } from '../types';
import ajv = require('ajv');

export function createRequestAjv(
  openApiSpec: OpenAPIV3.Document,
  options: ajv.Options = {},
): Ajv.Ajv {
  return createAjv(openApiSpec, options);
}

export function createResponseAjv(
  openApiSpec: OpenAPIV3.Document,
  options: ajv.Options = {},
): Ajv.Ajv {
  return createAjv(openApiSpec, options, false);
}

function createAjv(
  openApiSpec: OpenAPIV3.Document,
  options: ajv.Options = {},
  request = true,
): Ajv.Ajv {
  const ajv = new Ajv({
    ...options,
    schemaId: 'auto',
    allErrors: true,
    meta: draftSchema,
    formats: { ...formats, ...options.formats },
    unknownFormats: options.unknownFormats,
  });
  ajv.removeKeyword('propertyNames');
  ajv.removeKeyword('contains');
  ajv.removeKeyword('const');

  if (request) {
    if (options.coerceComponents) {
      ajv.addKeyword('coerceComponent', {
        modifying: true,
        compile: sch => {
          if (sch) {
            return function validate(data, path, obj, propName) {
              obj[propName] = sch.serialize(data);
              return true;
            };
          }
          return () => true;
        },
      });
    }
    ajv.removeKeyword('readOnly');
    ajv.addKeyword('readOnly', {
      modifying: true,
      compile: (sch) => {
        if (sch) {
          return function validate(data, path, obj, propName) {
            const isValid = !(sch === true && data != null);
            delete obj[propName];
            (<ajv.ValidateFunction>validate).errors = [
              {
                keyword: 'readOnly',
                schemaPath: data,
                dataPath: path,
                message: `is read-only`,
                params: { readOnly: propName },
              },
            ];
            return isValid;
          };
        }

        return () => true;
      },
    });
  } else {
    // response
    if(options.coerceComponents) {
      ajv.addKeyword('coerceComponent', {
        modifying: true,
        compile: sch => {
          if (sch) {
            return function validate(data, path, obj, propName) {
              obj[propName] = sch.deserialize(data);
              return true;
            }
          }
          return () => true;
        }
      });
    }
    ajv.removeKeyword('writeOnly');
    ajv.addKeyword('writeOnly', {
      modifying: true,
      compile: (sch) => {
        if (sch) {
          return function validate(data, path, obj, propName) {
            const isValid = !(sch === true && data != null);
            (<ajv.ValidateFunction>validate).errors = [
              {
                keyword: 'writeOnly',
                dataPath: path,
                schemaPath: path,
                message: `is write-only`,
                params: { writeOnly: propName },
              },
            ];
            return isValid;
          };
        }

        return () => true;
      },
    });
  }

  if (openApiSpec.components?.schemas) {
    Object.entries(openApiSpec.components.schemas).forEach(([id, schema]) => {
      if (options.coerceComponents && options.coerceComponents[id]) {
        if (request) {
          // On resquest, we must coerce at the end
          schema.coerceComponent = options.coerceComponents[id];
        } else {
          // On response, we must transform the object to allowed type.
          // No data validation. It must be done in coerceComponents deserialize.
          openApiSpec.components.schemas[id] = {
            type: "object",
            coerceComponent: options.coerceComponents[id]
          };
        }
      }
      ajv.addSchema(openApiSpec.components.schemas[id], `#/components/schemas/${id}`);
    });
  }

  return ajv;
}
