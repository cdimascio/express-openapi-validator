import AjvDraft4 from 'ajv-draft-04';
import { DataValidateFunction } from 'ajv/dist/types';
import ajvType from 'ajv/dist/vocabularies/jtd/type';
import addFormats from 'ajv-formats';
import { formats } from './formats';
import { AsyncSerDes, HttpError, OpenAPIV3, Options, SerDes } from '../types';
import { buildSchemasWithAsync } from './async-util';
import { hasAnySchemaWithAsync, buildAsyncFormats } from './async-util';
import Ajv from 'ajv';

type SerDesSchema = Partial<SerDes> & {
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

const validatorErrorFromSerdesError = (
  e: typeof Error,
  keyword: string,
  ctx,
  it,
  data
) => {
  // Let serdes function control the error a bit.
  // If a developer intentionally threw an HttpError
  // Then trust them to pass a reasonable message and
  // use an appropriate subclass of HttpError
  const isHttpError = e instanceof HttpError;

  return {
    message: isHttpError ? e.message : 'format is invalid',
    keyword: 'serdes',
    instancePath: ctx.instancePath,
    schemaPath: it.schemaPath.str,
    params: {
      isHttpError: e instanceof HttpError,
      httpError: e,
      [keyword]: ctx.parentDataProperty
    },
    data: data
  };
};

function createAjv(
  openApiSpec: OpenAPIV3.Document,
  options: Options = {},
  request = true,
): AjvDraft4 {
  const asyncFormats = buildAsyncFormats(options);
  const possiblyAsyncSchemas = openApiSpec.components?.schemas
    ?  buildSchemasWithAsync(
      asyncFormats,
      openApiSpec.components.schemas
    ) : undefined;
  const hasAsyncComponentSchemas = hasAnySchemaWithAsync(possiblyAsyncSchemas);

  const { ajvFormats, ...ajvOptions } = options;

  const ajv = new AjvDraft4({
    ...ajvOptions,
    verbose: true,
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
      if (hasAsyncComponentSchemas) {
        ajv.addKeyword({
          keyword: 'x-eov-req-serdes-async',
          modifying: true,
          errors: true,
          async: true,
          post: true,
          compile: (sch: SerDesSchema | AsyncSerDes, p, it) => {
            // Do not use arrow function to allow .call(this) to work on this function
            const validate: DataValidateFunction = async function asyncRequestSerdes(data, ctx) {
              if (typeof data !== 'string') {
                // Either null (possibly allowed, defer to nullable validation)
                // or already failed string validation (no need to throw additional internal errors).
                return true;
              }

              try {
                // call passing `this` so the ajv passContext option can influence this invocation
                ctx.parentData[ctx.parentDataProperty] = await sch.deserialize.call(this, data);
              } catch (e) {
                const validatorError = validatorErrorFromSerdesError(
                  e,
                  'x-eov-req-serdes-async',
                  ctx,
                  it,
                  data
                );

                throw new Ajv.ValidationError([validatorError]);
              }

              return true;
            };

            return validate;
          },
        });
      }
      ajv.addKeyword({
        keyword: 'x-eov-req-serdes',
        modifying: true,
        errors: true,
        // Note there is no async: true here, any schema with this keyword
        // has synchronous deserialization.
        // Deserialization occurs AFTER all string validations
        post: true,
        compile: (sch: SerDesSchema | AsyncSerDes, p, it) => {
          // Do not use arrow function to allow .call(this) to work on this function
          const validate: DataValidateFunction = function syncRequestDeserialize(data, ctx) {
            if (typeof data !== 'string') {
              // Either null (possibly allowed, defer to nullable validation)
              // or already failed string validation (no need to throw additional internal errors).
              return true;
            }
            try {
              // call passing `this` so the ajv passContext option can influence this invocation
              ctx.parentData[ctx.parentDataProperty] = sch.deserialize.call(this, data);
            } catch (e) {
              const validatorError = validatorErrorFromSerdesError(
                e,
                'x-eov-req-serdes',
                ctx,
                it,
                data
              );
              validate.errors = [validatorError];
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
          // Do not use arrow function to allow .call(this) to work on this function
          const validate: DataValidateFunction = function syncResponseSerdes(data, ctx) {
            if (typeof data === 'string') return true;
            try {
              // call passing `this` so the ajv passContext option can influence this invocation
              ctx.parentData[ctx.parentDataProperty] = sch.serialize.call(this, data);
            } catch (e) {
              const validatorError = validatorErrorFromSerdesError(
                e,
                'x-eov-res-serdes',
                ctx,
                it,
                data
              );
              validate.errors = [validatorError];
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
    // We are only supporting async deserialize, which is on requests only.
    // Use the components from the spec if this is a response, not the possiblyAsyncSchemas.
    const sourceSchema = request ? possiblyAsyncSchemas : openApiSpec.components?.schemas;
    Object.entries(sourceSchema).forEach(([id, schemaObject]) => {
      ajv.addSchema(
        schemaObject,
        `#/components/schemas/${id}`,
      );
    });
  }

  return ajv;
}
