import AjvDraft4 from 'ajv-draft-04';
import { DataValidateFunction } from 'ajv/dist/types';
import anyOf from 'ajv/dist/vocabularies/applicator/anyOf';
import addFormats from 'ajv-formats';
import { formats } from './formats';
import { OpenAPIV3, Options, SerDes } from '../types';

interface SerDesSchema extends Partial<SerDes> {
  kind?: 'req' | 'res';
}

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
  const { ajvFormats, ...ajvOptions } = options;
  const ajv = new AjvDraft4({
    ...ajvOptions,
    allErrors: true,
    formats: formats,
  });
  // Formats will overwrite existing validation,
  // so set in order of least->most important.
  if (options.serDesMap) {
    for (const serDesFormat of Object.keys(options.serDesMap)) {
      ajv.addFormat(serDesFormat, true);
    }
  }
  for (const [formatName, formatValidation] of Object.entries(formats)) {
    ajv.addFormat(formatName, formatValidation);
  }
  if (ajvFormats) {
    addFormats(ajv, ajvFormats);
  }
  for (let [formatName, formatDefinition] of Object.entries(options.formats)) {
    ajv.addFormat(formatName, formatDefinition);
  }
  ajv.removeKeyword('propertyNames');
  ajv.removeKeyword('contains');
  ajv.removeKeyword('const');

  if (options.serDesMap) {
    // Alias for `anyOf` with redactable message
    ajv.addKeyword({
      ...anyOf,
      keyword: 'xEovAnyOf',
      error: { message: 'REDACT-THIS-ERROR' },
    });
  }

  if (request) {
    if (options.serDesMap) {
      ajv.addKeyword({
        keyword: 'x-eov-serdes',
        modifying: true,
        errors: true,
        compile: (sch: SerDesSchema, p, it) => {
          if (sch) {
            if (sch.kind === 'res') {
              return () => false;
            }
            if (sch.deserialize) {
              const validate: DataValidateFunction = (data, ctx) => {
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

                return true;
              };
              return validate;
            }
          }
          return () => true;
        },
      });
    }
    ajv.removeKeyword('readOnly');
    ajv.addKeyword({
      keyword: 'readOnly',
      errors: true,
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
        errors: true,
        compile: (sch: SerDesSchema, p, it) => {
          if (sch) {
            if (sch.kind === 'req') {
              return () => false;
            }
            if (sch.serialize) {
              const validate: DataValidateFunction = (data, ctx) => {
                if (typeof data === 'string') return true;

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

                return true;
              };
              return validate;
            }
          }
          return () => true;
        },
      });
    }
    ajv.removeKeyword('writeOnly');
    ajv.addKeyword({
      keyword: 'writeOnly',
      schemaType: 'boolean',
      errors: true,
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
