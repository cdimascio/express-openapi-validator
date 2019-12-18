import { Ajv } from 'ajv';
import { createRequestAjv } from '../framework/ajv';
import {
  ContentType,
  validationError,
  ajvErrorsToValidatorError,
  augmentAjvErrors,
} from './util';
import ono from 'ono';
import { NextFunction, RequestHandler, Response } from 'express';
import {
  OpenAPIV3,
  OpenApiRequest,
  RequestValidatorOptions,
  ValidateRequestOpts,
  OpenApiRequestMetadata,
} from '../framework/types';
import * as mediaTypeParser from 'media-typer';
import * as contentTypeParser from 'content-type';

export class RequestValidator {
  private _middlewareCache: { [key: string]: RequestHandler } = {};
  private _apiDocs: OpenAPIV3.Document;
  private ajv: Ajv;
  private _requestOpts: ValidateRequestOpts = {};

  constructor(
    apiDocs: OpenAPIV3.Document,
    options: RequestValidatorOptions = {},
  ) {
    this._middlewareCache = {};
    this._apiDocs = apiDocs;
    this._requestOpts.allowUnknownQueryParameters =
      options.allowUnknownQueryParameters;
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

    const openapi = <OpenApiRequestMetadata>req.openapi;
    const path = openapi.expressRoute;
    if (!path) {
      throw validationError(404, req.path, 'not found');
    }

    const pathSchema = openapi.schema;
    if (!pathSchema) {
      // add openapi metadata to make this case more clear
      // its not obvious that missig schema means methodNotAllowed
      throw validationError(405, req.path, `${req.method} method not allowed`);
    }

    // cache middleware by combining method, path, and contentType
    // TODO contentType could have value not_provided
    const contentType = ContentType.from(req);
    const contentTypeKey = contentType.equivalents()[0] ?? 'not_provided';
    const key = `${req.method}-${req.originalUrl}-${contentTypeKey}`;

    if (!this._middlewareCache[key]) {
      this._middlewareCache[key] = this.buildMiddleware(
        path,
        pathSchema,
        contentType,
      );
    }
    return this._middlewareCache[key](req, res, next);
  }

  private buildMiddleware(
    path: string,
    pathSchema: OpenAPIV3.OperationObject,
    contentType: ContentType,
  ): RequestHandler {
    const parameters = this.parametersToSchema(path, pathSchema.parameters);

    let usedSecuritySchema: OpenAPIV3.SecurityRequirementObject[] = [];
    if (
      pathSchema.hasOwnProperty('security') &&
      pathSchema.security.length > 0
    ) {
      usedSecuritySchema = pathSchema.security;
    } else if (
      this._apiDocs.hasOwnProperty('security') &&
      this._apiDocs.security.length > 0
    ) {
      // if no security schema for the path, use top-level security schema
      usedSecuritySchema = this._apiDocs.security;
    }

    const securityQueryParameter = this.getSecurityQueryParams(
      usedSecuritySchema,
      this._apiDocs.components?.securitySchemes,
    );

    let requestBody = pathSchema.requestBody;
    if (requestBody?.hasOwnProperty('$ref')) {
      const ref = (<OpenAPIV3.ReferenceObject>requestBody).$ref;
      const id = ref.replace(/^.+\//i, '');
      requestBody = this._apiDocs.components.requestBodies[id];
    }

    let body = {};
    const requiredAdds = [];
    if (requestBody?.hasOwnProperty('content')) {
      const reqBodyObject = <OpenAPIV3.RequestBodyObject>requestBody;
      body = this.requestBodyToSchema(path, contentType, reqBodyObject);
      if (reqBodyObject.required) requiredAdds.push('body');
    }

    const schema = {
      // $schema: "http://json-schema.org/draft-04/schema#",
      required: ['query', 'headers', 'params'].concat(requiredAdds),
      properties: {
        body,
        ...parameters.schema,
      },
    };

    const validator = this.ajv.compile(schema);
    return (req: OpenApiRequest, res: Response, next: NextFunction): void => {

      const queryParamsToValidate = this.parseQueryParamsFromURL(req.originalUrl);

      if (!this._requestOpts.allowUnknownQueryParameters) {
        this.rejectUnknownQueryParams(
          queryParamsToValidate,
          schema.properties.query,
          securityQueryParameter,
        );
      }

      const openapi = <OpenApiRequestMetadata>req.openapi;
      const shouldUpdatePathParams = Object.keys(openapi.pathParams).length > 0;

      if (shouldUpdatePathParams) {
        req.params = openapi.pathParams ?? req.params;
      }

      // (<any>req).schema = schema;

      /**
       * support json in request params, query, headers and cookies
       * like this filter={"type":"t-shirt","color":"blue"}
       *
       * https://swagger.io/docs/specification/describing-parameters/#schema-vs-content
       */
      parameters.parseJson.forEach(item => {
        if (item.reqField === 'query' && queryParamsToValidate[item.name]) {
          if (queryParamsToValidate[item.name] === req[item.reqField][item.name]) {
            queryParamsToValidate[item.name] = req[item.reqField][item.name] = JSON.parse(
              queryParamsToValidate[item.name],
            );

            /**
             * The query param we parse and the query param express
             * parsed are the same value, so we assign them the same
             * parsed value.
             */
            return;
          }
          /**
           * They query params are not the same, so we parse the
           * `queryParamsToValidate` and don't return.
           */
          queryParamsToValidate[item.name] = JSON.parse(
            queryParamsToValidate[item.name],
          );
        }
        if (req[item.reqField]?.[item.name]) {
          try {
            req[item.reqField][item.name] = JSON.parse(
              req[item.reqField][item.name],
            );
          } catch (e) {
              // NOOP If parsing failed but _should_ contain JSON, validator will catch it.
              // May contain falsely flagged parameter (e.g. input was object OR string)
          }
        }
      });

      /**
       * array deserialization
       * filter=foo,bar,baz
       * filter=foo|bar|baz
       * filter=foo%20bar%20baz
       */
      parameters.parseArray.forEach(item => {
        if (item.reqField === 'query' && queryParamsToValidate[item.name]) {
          if (queryParamsToValidate[item.name] === req[item.reqField][item.name]) {
            queryParamsToValidate[item.name] = req[item.reqField][item.name] = queryParamsToValidate[item.name].split(
              item.delimiter,
            );

            return;
          }
          queryParamsToValidate[item.name] = queryParamsToValidate[item.name].split(
            item.delimiter,
          );
        }
        if (req[item.reqField]?.[item.name]) {
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
          item.reqField === 'query' &&
          queryParamsToValidate[item.name] &&
          !(queryParamsToValidate[item.name] instanceof Array)
        ) {
          queryParamsToValidate[item.name] = [queryParamsToValidate[item.name]];
        }
        if (
          req[item.reqField]?.[item.name] &&
          !(req[item.reqField][item.name] instanceof Array)
        ) {
          req[item.reqField][item.name] = [req[item.reqField][item.name]];
        }
      });

      const reqToValidate = {
        ...req,
        query: queryParamsToValidate,
        cookies: req.cookies
          ? { ...req.cookies, ...req.signedCookies }
          : undefined,
      };
      const valid = validator(reqToValidate);
      if (valid) {
        next();
      } else {
        // TODO look into Ajv async errors plugins
        const errors = augmentAjvErrors([...(validator.errors ?? [])]);
        const err = ajvErrorsToValidatorError(400, errors);
        const message = this.ajv.errorsText(errors, { dataVar: 'request' });
        throw ono(err, message);
      }
    };
  }

  private rejectUnknownQueryParams(
    query,
    schema,
    whiteList: string[] = [],
  ): void {
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

  private requestBodyToSchema(
    path: string,
    contentType: ContentType,
    requestBody: OpenAPIV3.RequestBodyObject,
  ): object {
    if (requestBody.content) {
      let content = null;
      for (const type of contentType.equivalents()) {
        content = requestBody.content[type];
        if (content) break;
      }

      if (!content) {
        const msg =
          contentType.contentType === 'not_provided'
            ? 'media type not specified'
            : `unsupported media type ${contentType.contentType}`;
        throw validationError(415, path, msg);
      }

      const schema = this.cleanseContentSchema(contentType, requestBody);
      return schema ?? content.schema ?? {};
    }
    return {};
  }

  private cleanseContentSchema(
    contentType: ContentType,
    requestBody: OpenAPIV3.RequestBodyObject,
  ): object {
    const bodyContentSchema =
      requestBody.content[contentType.contentType] &&
      requestBody.content[contentType.contentType].schema;

    let bodyContentRefSchema = null;
    if (bodyContentSchema && '$ref' in bodyContentSchema) {
      const objectSchema = this.ajv.getSchema(bodyContentSchema.$ref);
      bodyContentRefSchema =
        objectSchema &&
        objectSchema.schema &&
        (<any>objectSchema.schema).properties
          ? { ...(<any>objectSchema).schema }
          : null;
    }
    // handle readonly / required request body refs
    // don't need to copy schema if validator gets its own copy of the api spec
    // currently all middlware i.e. req and res validators share the spec
    const schema = bodyContentRefSchema || bodyContentSchema;
    if (schema && schema.properties) {
      Object.keys(schema.properties).forEach(prop => {
        const propertyValue = schema.properties[prop];
        const required = schema.required;
        if (propertyValue.readOnly && required) {
          const index = required.indexOf(prop);
          if (index > -1) {
            schema.required = required
              .slice(0, index)
              .concat(required.slice(index + 1));
          }
        }
      });
      return schema;
    }
  }

  private getSecurityQueryParams(
    usedSecuritySchema: OpenAPIV3.SecurityRequirementObject[],
    securitySchema,
  ): string[] {
    return usedSecuritySchema && securitySchema
      ? usedSecuritySchema
          .filter(obj => Object.entries(obj).length !== 0)
          .map(sec => {
            const securityKey = Object.keys(sec)[0];
            return securitySchema[securityKey];
          })
          .filter(sec => sec?.in === 'query')
          .map(sec => sec.name)
      : [];
  }

  private parametersToSchema(path: string, parameters = []) {
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
      if (parameter.content) {
        /**
         * Per the OpenAPI3 spec:
         * A map containing the representations for the parameter. The key is the media type
         * and the value describes it. The map MUST only contain one entry.
         * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#parameterContent
         */
        const contentType = Object.keys(parameter.content)[0];
        const contentTypeParsed = contentTypeParser.parse(contentType)

        const mediaTypeParsed = mediaTypeParser.parse(contentTypeParsed.type);

        parameterSchema = parameter.content[contentType].schema;

        if (
          mediaTypeParsed.subtype === 'json' ||
          mediaTypeParsed.suffix === 'json'
        ) {
          parseJson.push({ name, reqField });
        }
      } else if ($in === 'query') {
        // handle complex json types in schema
        const schemaHasObject = schema =>
          schema && (
            schema.type === 'object' ||
            [].concat(
              schema.allOf,
              schema.oneOf,
              schema.anyOf
            ).some(schemaHasObject)
          );

        if (schemaHasObject(parameterSchema)) {
          parseJson.push({ name, reqField });
        }
      }

      if (!parameterSchema) {
        const message = `No available parameter 'schema' or 'content' for [${parameter.name}]`;
        throw validationError(400, path, message);
      }

      if (parameter.schema?.type === 'array' && !parameter.explode) {
        const delimiter = arrayDelimiter[parameter.style];
        if (!delimiter) {
          const message = `Parameter 'style' has incorrect value '${parameter.style}' for [${parameter.name}]`;
          throw validationError(400, path, message);
        }
        parseArray.push({ name, reqField, delimiter });
      }

      if (parameter.schema?.type === 'array' && parameter.explode) {
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

  private parseQueryParamsFromURL(url: string): object {
    const queryIndex = url.indexOf('?');
    const queryString = (queryIndex >= 0) ? url.slice(queryIndex + 1) : '';
    const searchParams = new URLSearchParams(queryString);
    const queryParamsToValidate: object = {};

    searchParams.forEach((value, key) => {
      if (queryParamsToValidate[key]) {
        if (queryParamsToValidate[key] instanceof Array) {
          queryParamsToValidate[key].push(value)
        } else {
          queryParamsToValidate[key] = [queryParamsToValidate[key], value]
        }
      } else {
        queryParamsToValidate[key] = value
      }
    });

    return queryParamsToValidate;
  }
}
