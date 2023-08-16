import AjvDraft4 from 'ajv-draft-04';
import { DataValidateFunction } from 'ajv/dist/types';
import ajvType from 'ajv/dist/vocabularies/jtd/type';
import addFormats from 'ajv-formats';
import { formats } from './formats';
import { OpenAPIV3, Options, SerDes } from '../types';
import * as traverse from 'json-schema-traverse';

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

  // Clean openApiSpec
  traverse(openApiSpec, { allKeys: true }, <traverse.Callback>(schema => {
    if ('x-stoplight' in schema) {
      delete schema['x-stoplight']
    }
  }))

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
    // Alias for `type` that can execute AFTER x-eov-res-serdes
    // There is a `type` keyword which this is positioned "next to",
    // as well as high-level type assertion that runs before any keywords.
    ajv.addKeyword({
      ...ajvType,
      keyword: 'x-eov-type',
      before: 'type',
    });
  }

  if (request) {
    if (options.serDesMap) {
      ajv.addKeyword({
        keyword: 'x-eov-req-serdes',
        modifying: true,
        errors: true,
        // Deserialization occurs AFTER all string validations
        post: true,
        compile: (sch: SerDesSchema, p, it) => {
          const validate: DataValidateFunction = (data, ctx) => {
            if (typeof data !== 'string') {
              // Either null (possibly allowed, defer to nullable validation)
              // or already failed string validation (no need to throw additional internal errors).
              return true;
            }
            try {
              ctx.parentData[ctx.parentDataProperty] = sch.deserialize(data);
            } catch (e) {
              validate.errors = [
                {
                  keyword: 'serdes',
                  instancePath: ctx.instancePath,
                  schemaPath: it.schemaPath.str,
                  message: e.message || `format is invalid`,
                  params: { 'x-eov-req-serdes': ctx.parentDataProperty },
                },
              ];
              return false;
            }

            return true;
          };
          return validate;
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
        keyword: 'x-eov-res-serdes',
        modifying: true,
        errors: true,
        // Serialization occurs BEFORE type validations
        before: 'x-eov-type',
        compile: (sch: SerDesSchema, p, it) => {
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
                  params: { 'x-eov-res-serdes': ctx.parentDataProperty },
                },
              ];
              return false;
            }

            return true;
          };
          return validate;
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
