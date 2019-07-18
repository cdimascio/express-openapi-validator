import * as Ajv from 'ajv';
import { validationError } from '../errors';
import ono from 'ono';

const draftSchema = require('ajv/lib/refs/json-schema-draft-04.json');

const TYPE_JSON = 'application/json';

const maxInt32 = 2 ** 31 - 1;
const minInt32 = (-2) ** 31;

const maxInt64 = 2 ** 63 - 1;
const minInt64 = (-2) ** 63;

const maxFloat = (2 - 2 ** -23) * 2 ** 127;
const minFloat = 2 ** -126;

const alwaysTrue = () => true;
const base64regExp = /^[A-Za-z0-9+/]*(=|==)?$/;

const formats = {
  int32: {
    validate: i => Number.isInteger(i) && i <= maxInt32 && i >= minInt32,
    type: 'number',
  },
  int64: {
    validate: i => Number.isInteger(i) && i <= maxInt64 && i >= minInt64,
    type: 'number',
  },
  float: {
    validate: i => typeof i === 'number' && (i <= maxFloat && i >= minFloat),
    type: 'number',
  },
  double: {
    validate: i => typeof i === 'number',
    type: 'number',
  },
  byte: b => b.length % 4 === 0 && base64regExp.test(b),
  binary: alwaysTrue,
  password: alwaysTrue,
};

export class RequestValidator {
  private _middlewareCache;
  private _apiDocs;
  private ajv;
  constructor(apiDocs, options = {}) {
    this._middlewareCache = {};
    this._apiDocs = apiDocs;
    this.ajv = this.initAjv(options);
  }

  initAjv(options) {
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

    if (this._apiDocs.components.schemas) {
      Object.entries(this._apiDocs.components.schemas).forEach(
        ([id, schema]: any[]) => {
          ajv.addSchema(schema, `#/components/schemas/${id}`);
        },
      );
    }

    if (this._apiDocs.components.requestBodies) {
      Object.entries(this._apiDocs.components.requestBodies).forEach(
        ([id, schema]: any[]) => {
          ajv.addSchema(
            schema.content[TYPE_JSON].schema,
            `#/components/requestBodies/${id}`,
          );
        },
      );
    }

    // if (this._apiDocs.components.parameters) {
    //   Object.entries(this._apiDocs.components.requestBodies).forEach(
    //     ([id, schema]: any[]) => {
    //       ajv.addSchema(schema, `#/components/schemas/${id}`);
    //     },
    //   );
    // }

    // if (this._apiDocs.components.responses) {
    //   Object.entries(this._apiDocs.components[type]).forEach(([id, schema]) => {
    //     ajv.addSchema(schema, `#/components/${type}/${id}`);
    //   });
    // }

    return ajv;
  }

  validate(req, res, next) {
    const cacheKey = `${req.method}-${req.path}`;

    if (!this._middlewareCache[cacheKey]) {
      this._middlewareCache[cacheKey] = this.buildMiddleware(req, res, next);
    }

    return this._middlewareCache[cacheKey](req, res, next);
  }

  buildMiddleware(req, res, next) {
    // const method = req.method.toLowerCase();
    // const path = req.route.path.replace(/:(\w+)/gi, '{$1}');
    // const pathSchema = this._apiDocs.paths[path][method];

    if (!req.openapi) {
      // this path was not found in open api and
      // this path is not defined under an openapi base path
      // skip it
      return next();
    }
    const path = req.openapi.expressRoute;
    if (!path) {
      const message = 'not found';
      const err = validationError(404, req.path, message);
      throw ono(err, message);
    }
    const pathSchema = req.openapi.schema;
    if (!pathSchema) {
      // add openapi metadata to make this case more clear
      // its not obvious that missig schema means methodNotAllowed
      const message = `${req.method} method not allowed`;
      const err = validationError(405, req.path, message);
      throw ono(err, message);
    }

    const parameters = this.parametersToSchema(path, pathSchema.parameters);
    let body = pathSchema.requestBody || {};

    const schema = {
      // $schema: "http://json-schema.org/draft-04/schema#",
      required: ['query', 'headers', 'params'],
      properties: {
        body,
        ...parameters.schema,
      },
    };

    const validator = this.ajv.compile(schema);

    return (req, res, next) => {
      req.schema = schema;
      /**
       * support json in request params, query, headers and cookies
       * like this filter={"type":"t-shirt","color":"blue"}
       *
       * https://swagger.io/docs/specification/describing-parameters/#schema-vs-content
       */
      parameters.parseJson.forEach(item => {
        if (req[item.reqField] && req[item.reqField][item.name]) {
          req[item.reqField][item.name] = JSON.parse(
            req[item.reqField][item.name],
          );
        }
      });

      const reqToValidate = {
        ...req,
        cookies: req.cookies
          ? { ...req.cookies, ...req.signedCookies }
          : undefined,
      };
      const valid = validator(reqToValidate);

      if (valid) {
        next();
      } else {
        const errors = validator.errors;
        const errorText = this.ajv.errorsText(errors, { dataVar: 'request' });
        throw validationError(400, path, errorText, errors);
        // next(
        //   new AoavError(`Error while validating request: ${errorText}`, errors),
        // );
      }
    };
  }

  parametersToSchema(path, parameters = []) {
    const schema = { query: {}, headers: {}, params: {}, cookies: {} };
    const reqFields = {
      query: 'query',
      header: 'headers',
      path: 'params',
      cookie: 'cookies',
    };
    const parseJson = [];

    parameters.forEach(parameter => {
      if (parameter.hasOwnProperty('$ref')) {
        const id = parameter.$ref.replace(/^.+\//i, '');
        parameter = this._apiDocs.components.parameters[id];
      }

      const $in = parameter.in;
      const name =
        $in === 'header' ? parameter.name.toLowerCase() : parameter.name;

      const reqField = reqFields[$in];
      if (!reqField) {
          throw validationError(400, path, `Parameter 'in' has incorrect value '${$in}' for [${parameter.name}]`);
        // throw new Error(
        //   `Parameter 'in' has incorrect value '${$in}' for [${parameter.name}]`,
        // );
      }

      let parameterSchema = parameter.schema;
      if (parameter.content && parameter.content[TYPE_JSON]) {
        parameterSchema = parameter.content[TYPE_JSON].schema;
        parseJson.push({ name, reqField });
      }

      if (!parameterSchema) {
        throw validationError(400, path,  `Not available parameter 'schema' or 'content' for [${parameter.name}]`,);
        // throw new Error(
        //   `Not available parameter 'schema' or 'content' for [${parameter.name}]`,
        // );
      }

      if (!schema[reqField].properties) {
        schema[reqField] = {
          type: 'object',
          properties: {},
        };
      }

      schema[reqField].properties[name] = parameterSchema;
      if (parameter.required) {
        if (!schema[reqField].required) {
          schema[reqField].required = [];
        }
        schema[reqField].required.push(name);
      }
    });

    return { schema, parseJson };
  }
}

// export class AoavError extends Error {
//   private data;
//   constructor(message, errors) {
//     super(message);
//     this.name = this.constructor.name;
//     this.data = errors;
//   }
// }
