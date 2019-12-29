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
    ajv.removeKeyword('readOnly');
    ajv.addKeyword('readOnly', {
      modifying: true,
      compile: sch => {
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
    ajv.removeKeyword('writeOnly');
    ajv.addKeyword('writeOnly', {
      modifying: true,
      compile: sch => {
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
      ajv.addSchema(schema, `#/components/schemas/${id}`);
    });
  }

  return ajv;
}
