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

/**
 * Traverse a document and call a provided callback for each deeply contained object.
 *
 * @param {object} document - open api document
 * @param {Function} cb - callback called with each object
 */
const traverseDocument = (
  document: OpenAPIV3.Document,
  cb: (obj: Record<string, unknown>) => void,
): void => {
  const seen = new Set();
  const traverse = (obj: unknown): void => {
    if (seen.has(obj)) {
      return;
    }
    seen.add(obj);
    if (typeof obj === 'object') {
      if (obj === null) {
        return;
      }
      if (Array.isArray(obj)) {
        for (const item of obj) {
          traverse(item);
        }
      } else {
        cb(obj as Record<string, unknown>);
        for (const property of Object.values(obj)) {
          traverse(property);
        }
      }
    }
  };
  traverse(document);
};

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
  ajv.addKeyword({
    keyword: 'components',
    schemaType: 'object',
  });
  ajv.addKeyword({
    keyword: 'deprecated',
    schemaType: 'boolean',
  });
  ajv.addKeyword({
    keyword: 'discriminator',
    schemaType: 'object',
  });
  ajv.addKeyword('example');
  ajv.addKeyword({
    keyword: 'paths',
    schemaType: 'object',
  });

  const customKeywords = new Set<string>();
  const reservedKeywords = new Set<string>();
  traverseDocument(
    openApiSpec,
    // Not necessarily a "schema" but worst case is accidentally allowing some `x-*` keywords
    // that aren't ever actually exposed to AJV.
    (schema) => {
      for (const keyword of Object.keys(schema)) {
        if (keyword.startsWith('x-')) {
          if (keyword.startsWith('x-eov-')) {
            reservedKeywords.add(keyword);
          } else {
            customKeywords.add(keyword);
          }
        }
      }
    },
  );
  // Keywords in use, defer validation
  ['x-eov-serdes', 'x-eov-operation-handler', 'x-eov-operation-id'].map(
    (keyword) => reservedKeywords.delete(keyword),
  );
  if (reservedKeywords.size > 0) {
    throw new Error(
      `Use of keyword(s) "${[...reservedKeywords].join(
        '", "',
      )}" are forbidden (reserved prefix x-eov-)`,
    );
  }
  for (const customKeyword of customKeywords) {
    ajv.addKeyword(customKeyword);
  }

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
    ajv.addKeyword({
      keyword: 'writeOnly',
      schemaType: 'boolean',
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
    ajv.addKeyword({
      keyword: 'readOnly',
      schemaType: 'boolean',
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
