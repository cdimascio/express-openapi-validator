import AjvDraft4 from 'ajv-draft-04';
import { DataValidateFunction } from 'ajv/dist/types';
import addFormats from 'ajv-formats';
import { formats } from './formats';
import { OpenAPIV3, Options } from '../types';

export function createRequestAjv(
  openApiSpec: OpenAPIV3.Document,
  options: Options = {},
): AjvDraft4 {
  return createAjv(openApiSpec, options);
}

export function createResponseAjv(
  openApiSpec: OpenAPIV3.Document,
  options: Options = {},
): AjvDraft4 {
  return createAjv(openApiSpec, options, false);
}

function createAjv(
  openApiSpec: OpenAPIV3.Document,
  options: Options = {},
  request = true,
): AjvDraft4 {
  const { ajvFormatsMode, ...ajvOptions } = options;
  const ajv = new AjvDraft4({
    ...ajvOptions,
    allErrors: true,
    formats: { ...formats, ...options.formats },
  });
  if (ajvFormatsMode) {
    addFormats(ajv, { mode: ajvFormatsMode });
  }
  ajv.removeKeyword('propertyNames');
  ajv.removeKeyword('contains');
  ajv.removeKeyword('const');

  if (request) {
    if (options.serDesMap) {
      ajv.addKeyword({
        keyword: 'x-eov-serdes',
        modifying: true,
        compile: (sch, p, it) => {
          if (sch) {
            if (sch.kind === 'res') {
              return () => false;
            }
            const validate: DataValidateFunction = (data, ctx) => {
              if (!!sch.deserialize) {
                if (typeof data !== 'string') {
                  validate.errors = [
                    {
                      keyword: 'serdes',
                      instancePath: ctx.instancePath,
                      schemaPath: it.schemaPath.str,
                      message: `must be a string`,
                      params: { 'x-eov-serdes': ctx.parentDataProperty },
                    },
                  ];
                  return false;
                }
                try {
                  ctx.parentData[ctx.parentDataProperty] =
                    sch.deserialize(data);
                } catch (e) {
                  validate.errors = [
                    {
                      keyword: 'serdes',
                      instancePath: ctx.instancePath,
                      schemaPath: it.schemaPath.str,
                      message: `format is invalid`,
                      params: { 'x-eov-serdes': ctx.parentDataProperty },
                    },
                  ];
                  return false;
                }
              }
              return true;
            };
            return validate;
          }
          return () => true;
        },
        // errors: 'full',
      });
    }
    ajv.removeKeyword('readOnly');
    ajv.addKeyword({
      keyword: 'readOnly',
      modifying: true,
      compile: (sch, p, it) => {
        if (sch) {
          const validate: DataValidateFunction = (data, ctx) => {
            const isValid = data == null;
            if (!isValid) {
              validate.errors = [
                {
                  keyword: 'readOnly',
                  instancePath: ctx.instancePath,
                  schemaPath: it.schemaPath.str,
                  message: `is read-only`,
                  params: { writeOnly: ctx.parentDataProperty },
                },
              ];
            }
            return false;
          };
          return validate;
        }

        return () => true;
      },
    });
  } else {
    // response
    if (options.serDesMap) {
      ajv.addKeyword({
        keyword: 'x-eov-serdes',
        modifying: true,
        compile: (sch, p, it) => {
          if (sch) {
            if (sch.kind === 'req') {
              return () => false;
            }
            const validate: DataValidateFunction = (data, ctx) => {
              if (typeof data === 'string') return true;
              if (!!sch.serialize) {
                try {
                  ctx.parentData[ctx.parentDataProperty] = sch.serialize(data);
                } catch (e) {
                  validate.errors = [
                    {
                      keyword: 'serdes',
                      instancePath: ctx.instancePath,
                      schemaPath: it.schemaPath.str,
                      message: `format is invalid`,
                      params: { 'x-eov-serdes': ctx.parentDataProperty },
                    },
                  ];
                  return false;
                }
              }
              return true;
            };
            return validate;
          }
          return () => true;
        },
      });
    }
    ajv.removeKeyword('writeOnly');
    ajv.addKeyword({
      keyword: 'writeOnly',
      modifying: true,
      schemaType: 'boolean',
      compile: (sch, p, it) => {
        if (sch) {
          const validate: DataValidateFunction = (data, ctx) => {
            const isValid = data == null;
            if (!isValid) {
              validate.errors = [
                {
                  keyword: 'writeOnly',
                  instancePath: ctx.instancePath,
                  schemaPath: it.schemaPath.str,
                  message: `is write-only`,
                  params: { writeOnly: ctx.parentDataProperty },
                },
              ];
            }
            return false;
          };
          return validate;
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
