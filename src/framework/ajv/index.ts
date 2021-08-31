import Ajv from 'ajv-draft-04';
import { formats } from './formats';
import { OpenAPIV3, Options } from '../types';
import ajv = require('ajv');

export function createRequestAjv(
  openApiSpec: OpenAPIV3.Document,
  options: Options = {},
): Ajv {
  return createAjv(openApiSpec, options);
}

export function createResponseAjv(
  openApiSpec: OpenAPIV3.Document,
  options: Options = {},
): Ajv {
  return createAjv(openApiSpec, options, false);
}

function createAjv(
  openApiSpec: OpenAPIV3.Document,
  options: Options = {},
  request = true,
): Ajv {
  const ajv = new Ajv({
    ...options,
    allErrors: true,
  });
  ajv.removeKeyword('propertyNames');
  ajv.removeKeyword('contains');
  ajv.removeKeyword('const');

  if (request) {
    if (options.serDesMap) {
      ajv.addKeyword('x-eov-serdes', {
        modifying: true,
        // @ts-ignore
        compile: (sch) => {
          if (sch) {
            return function validate(data, path, obj, propName) {
              if (typeof data === 'object') return true;
              if (!!sch.deserialize) {
                obj[propName] = sch.deserialize(data);
              }
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
      // @ts-ignore
      compile: (sch) => {
        if (sch) {
          return function validate(data, path, obj, propName) {
            const isValid = !(sch === true && data != null);
            delete obj[propName];
            (<ajv.ValidateFunction>validate).errors = [
              {
                keyword: 'readOnly',
                schemaPath: data,
                // @ts-ignore
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
    if (options.serDesMap) {
      ajv.addKeyword('x-eov-serdes', {
        modifying: true,
        // @ts-ignore
        compile: (sch) => {
          if (sch) {
            return function validate(data, path, obj, propName) {
              if (typeof data === 'string') return true;
              if (!!sch.serialize) {
                obj[propName] = sch.serialize(data);
              }
              return true;
            };
          }
          return () => true;
        },
      });
    }
    ajv.removeKeyword('writeOnly');
    ajv.addKeyword('writeOnly', {
      modifying: true,
      // @ts-ignore
      compile: (sch) => {
        if (sch) {
          return function validate(data, path, obj, propName) {
            const isValid = !(sch === true && data != null);
            (<ajv.ValidateFunction>validate).errors = [
              {
                keyword: 'writeOnly',
                // @ts-ignore
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
      ajv.addSchema(
        openApiSpec.components.schemas[id],
        `#/components/schemas/${id}`,
      );
    });
  }

  return ajv;
}
