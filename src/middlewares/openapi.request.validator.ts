import { createRequestAjv } from './ajv';
import {
  extractContentType,
  validationError,
  ajvErrorsToValidatorError,
  augmentAjvErrors,
} from './util';
import ono from 'ono';
import { NextFunction, Response } from 'express';
import { OpenAPIV3, OpenApiRequest } from '../framework/types';
import { Ajv } from 'ajv';

const TYPE_JSON = 'application/json';

export class RequestValidator {
  private _middlewareCache;
  private _apiDocs: OpenAPIV3.Document;
  private ajv: Ajv;

  constructor(apiDocs: OpenAPIV3.Document, options = {}) {
    this._middlewareCache = {};
    this._apiDocs = apiDocs;
    this.ajv = createRequestAjv(apiDocs, options);
  }

  public validate(
    req: OpenApiRequest,
    res: Response,
    next: NextFunction,
  ): void {
    if (!req.openapi) {
      // this path was not found in open api and
      // this path is not defined under an openapi base path
      // skip it
      return next();
    }

    const path = req.openapi.expressRoute;
    if (!path) {
      throw validationError(404, req.path, 'not found');
    }

    const pathSchema = req.openapi.schema;
    if (!pathSchema) {
      // add openapi metadata to make this case more clear
      // its not obvious that missig schema means methodNotAllowed
      throw validationError(405, req.path, `${req.method} method not allowed`);
    }

    // cache middleware by combining method, path, and contentType
    // TODO contentType could have value not_provided
    const contentType = extractContentType(req) || 'not_provided';
    const key = `${req.method}-${req.originalUrl}-${contentType}`;

    if (!this._middlewareCache[key]) {
      this._middlewareCache[key] = this.buildMiddleware(
        path,
        pathSchema,
        contentType,
      );
    }
    return this._middlewareCache[key](req, res, next);
  }

  private buildMiddleware(path, pathSchema, contentType) {
    const parameters = this.parametersToSchema(path, pathSchema.parameters);
    const securityQueryParameter = this.getSecurityQueryParams(
      pathSchema,
      this._apiDocs.components.securitySchemes,
    );

    let requestBody = pathSchema.requestBody;

    if (requestBody && requestBody.hasOwnProperty('$ref')) {
      const id = requestBody.$ref.replace(/^.+\//i, '');
      requestBody = this._apiDocs.components.requestBodies[id];
    }

    let body = this.requestBodyToSchema(path, contentType, requestBody);
    let requiredAdds = requestBody && requestBody.required ? ['body'] : [];

    const schema = {
      // $schema: "http://json-schema.org/draft-04/schema#",
      required: ['query', 'headers', 'params'].concat(requiredAdds),
      properties: {
        body,
        ...parameters.schema,
      },
    };

    const validator = this.ajv.compile(schema);
    return (req, res, next) => {
      this.rejectUnknownQueryParams(
        req.query,
        schema.properties.query,
        securityQueryParameter,
      );

      const shouldUpdatePathParams =
        Object.keys(req.openapi.pathParams).length > 0;

      if (shouldUpdatePathParams) {
        req.params = req.openapi.pathParams || req.params;
      }

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

      /**
       * array deserialization
       * filter=foo,bar,baz
       * filter=foo|bar|baz
       * filter=foo%20bar%20baz
       */
      parameters.parseArray.forEach(item => {
        if (req[item.reqField] && req[item.reqField][item.name]) {
          req[item.reqField][item.name] = req[item.reqField][item.name].split(
            item.delimiter,
          );
        }
      });

      /**
       * forcing convert to array if scheme describes param as array + explode
       */
      parameters.parseArrayExplode.forEach(item => {
        if (
          req[item.reqField] &&
          req[item.reqField][item.name] &&
          !(req[item.reqField][item.name] instanceof Array)
        ) {
          req[item.reqField][item.name] = [req[item.reqField][item.name]];
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
        // TODO look into Ajv async errors plugins
        const errors = augmentAjvErrors([...(validator.errors || [])]);
        const err = ajvErrorsToValidatorError(400, errors);
        const message = this.ajv.errorsText(errors, { dataVar: 'request' });
        throw ono(err, message);
      }
    };
  }

  private rejectUnknownQueryParams(query, schema, whiteList = []) {
    if (!schema.properties) return;
    const knownQueryParams = new Set(Object.keys(schema.properties));
    whiteList.forEach(item => knownQueryParams.add(item));
    const queryParams = Object.keys(query);
    for (const q of queryParams) {
      if (!knownQueryParams.has(q)) {
        throw validationError(
          400,
          `.query.${q}`,
          `Unknown query parameter ${q}`,
        );
      }
    }
  }

  private requestBodyToSchema(path, contentType, requestBody: any = {}) {
    if (requestBody.content) {
      const content = requestBody.content[contentType];
      if (!content) {
        const msg =
          contentType === 'not_provided'
            ? 'media type not specified'
            : `unsupported media type ${contentType}`;
        throw validationError(415, path, msg);
      }
      return content.schema || {};
    }
    return {};
  }

  private getSecurityQueryParams(pathSchema, securitySchema) {
    return pathSchema.security && securitySchema
      ? pathSchema.security
          .filter(obj => Object.entries(obj).length !== 0)
          .map(sec => {
            const securityKey = Object.keys(sec)[0];
            return securitySchema[securityKey];
          })
          .filter(sec => sec && sec.in && sec.in === 'query')
          .map(sec => sec.name)
      : [];
  }

  private parametersToSchema(path, parameters = []) {
    const schema = { query: {}, headers: {}, params: {}, cookies: {} };
    const reqFields = {
      query: 'query',
      header: 'headers',
      path: 'params',
      cookie: 'cookies',
    };
    const arrayDelimiter = {
      form: ',',
      spaceDelimited: ' ',
      pipeDelimited: '|',
    };
    const parseJson = [];
    const parseArray = [];
    const parseArrayExplode = [];

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
        const message = `Parameter 'in' has incorrect value '${$in}' for [${parameter.name}]`;
        throw validationError(400, path, message);
      }

      let parameterSchema = parameter.schema;
      if (parameter.content && parameter.content[TYPE_JSON]) {
        parameterSchema = parameter.content[TYPE_JSON].schema;
        parseJson.push({ name, reqField });
      }

      if (!parameterSchema) {
        const message = `No available parameter 'schema' or 'content' for [${parameter.name}]`;
        throw validationError(400, path, message);
      }

      if (
        parameter.schema &&
        parameter.schema.type === 'array' &&
        !parameter.explode
      ) {
        const delimiter = arrayDelimiter[parameter.style];
        if (!delimiter) {
          const message = `Parameter 'style' has incorrect value '${parameter.style}' for [${parameter.name}]`;
          throw validationError(400, path, message);
        }
        parseArray.push({ name, reqField, delimiter });
      }

      if (
        parameter.schema &&
        parameter.schema.type === 'array' &&
        parameter.explode
      ) {
        parseArrayExplode.push({ name, reqField });
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

    return { schema, parseJson, parseArray, parseArrayExplode };
  }
}
