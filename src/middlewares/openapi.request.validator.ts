import { Ajv } from 'ajv';
import { createRequestAjv } from '../framework/ajv';
import {
  ContentType,
  ajvErrorsToValidatorError,
  augmentAjvErrors,
} from './util';
import { NextFunction, RequestHandler, Response } from 'express';
import {
  ValidationSchema,
  OpenAPIV3,
  OpenApiRequest,
  RequestValidatorOptions,
  ValidateRequestOpts,
  OpenApiRequestMetadata,
  NotFound,
  MethodNotAllowed,
  BadRequest,
} from '../framework/types';
import { BodySchemaParser } from './parsers/body.parse';
import { ParametersSchemaParser } from './parsers/schema.parse';
import { RequestParameterMutator } from './parsers/req.parameter.mutator';

type OperationObject = OpenAPIV3.OperationObject;
type SchemaObject = OpenAPIV3.SchemaObject;
type ReferenceObject = OpenAPIV3.ReferenceObject;
type SecurityRequirementObject = OpenAPIV3.SecurityRequirementObject;
type SecuritySchemeObject = OpenAPIV3.SecuritySchemeObject;
type ApiKeySecurityScheme = OpenAPIV3.ApiKeySecurityScheme;

export class RequestValidator {
  private middlewareCache: { [key: string]: RequestHandler } = {};
  private apiDoc: OpenAPIV3.Document;
  private ajv: Ajv;
  private requestOpts: ValidateRequestOpts = {};

  constructor(
    apiDoc: OpenAPIV3.Document,
    options: RequestValidatorOptions = {},
  ) {
    this.middlewareCache = {};
    this.apiDoc = apiDoc;
    this.requestOpts.allowUnknownQueryParameters =
      options.allowUnknownQueryParameters;
    this.ajv = createRequestAjv(apiDoc, options);
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
      throw new NotFound({
        path: req.path,
        message: 'not found',
      });
    }

    const reqSchema = openapi.schema;
    if (!reqSchema) {
      throw new MethodNotAllowed({
        path: req.path,
        message: `${req.method} method not allowed`,
      });
    }

    // cache middleware by combining method, path, and contentType
    const contentType = ContentType.from(req);
    const contentTypeKey = contentType.equivalents()[0] ?? 'not_provided';
    // use openapi.expressRoute as path portion of key
    const key = `${req.method}-${path}-${contentTypeKey}`;

    if (!this.middlewareCache[key]) {
      const middleware = this.buildMiddleware(path, reqSchema, contentType);
      this.middlewareCache[key] = middleware;
    }
    return this.middlewareCache[key](req, res, next);
  }

  private buildMiddleware(
    path: string,
    reqSchema: OperationObject,
    contentType: ContentType,
  ): RequestHandler {
    const apiDoc = this.apiDoc;
    const schemaParser = new ParametersSchemaParser(this.ajv, apiDoc);
    const bodySchemaParser = new BodySchemaParser(this.ajv, apiDoc);
    const parameters = schemaParser.parse(path, reqSchema.parameters);
    const securityQueryParam = Security.queryParam(apiDoc, reqSchema);
    const body = bodySchemaParser.parse(path, reqSchema, contentType);

    const isBodyBinary = body?.['format'] === 'binary';
    const properties: ValidationSchema = {
      ...parameters,
      body: isBodyBinary ? {} : body,
    };
    // TODO throw 400 if missing a required binary body
    const required =
      (<SchemaObject>body).required && !isBodyBinary ? ['body'] : [];
    // $schema: "http://json-schema.org/draft-04/schema#",
    const schema = {
      paths: this.apiDoc.paths,
      components: this.apiDoc.components,
      required: ['query', 'headers', 'params'].concat(required),
      properties,
    };

    const validator = this.ajv.compile(schema);

    return (req: OpenApiRequest, res: Response, next: NextFunction): void => {
      const openapi = <OpenApiRequestMetadata>req.openapi;
      const hasPathParams = Object.keys(openapi.pathParams).length > 0;

      if (hasPathParams) {
        req.params = openapi.pathParams ?? req.params;
      }

      const mutator = new RequestParameterMutator(
        this.ajv,
        apiDoc,
        path,
        properties,
      );

      mutator.modifyRequest(req);

      if (!this.requestOpts.allowUnknownQueryParameters) {
        this.processQueryParam(
          req.query,
          schema.properties.query,
          securityQueryParam,
        );
      }

      const cookies = req.cookies
        ? {
            ...req.cookies,
            ...req.signedCookies,
          }
        : undefined;

      const valid = validator({ query: {}, ...req, cookies });
      if (valid) {
        next();
      } else {
        const errors = augmentAjvErrors([...(validator.errors ?? [])]);
        const err = ajvErrorsToValidatorError(400, errors);
        const message = this.ajv.errorsText(errors, { dataVar: 'request' });
        const error: BadRequest = new BadRequest({
          path: req.path,
          message: message,
        });
        error.errors = err.errors;
        throw error;
      }
    };
  }

  private processQueryParam(query, schema, whiteList: string[] = []) {
    const keys = schema.properties ? Object.keys(schema.properties) : [];
    const knownQueryParams = new Set(keys);
    whiteList.forEach((item) => knownQueryParams.add(item));
    const queryParams = Object.keys(query);
    const allowedEmpty = schema.allowEmptyValue;
    for (const q of queryParams) {
      if (
        !this.requestOpts.allowUnknownQueryParameters &&
        !knownQueryParams.has(q)
      ) {
        throw new BadRequest({
          path: `.query.${q}`,
          message: `Unknown query parameter '${q}'`,
        });
      } else if (!allowedEmpty?.has(q) && (query[q] === '' || null)) {
        throw new BadRequest({
          path: `.query.${q}`,
          message: `Empty value found for query parameter '${q}'`,
        });
      }
    }
  }
}

class Security {
  public static queryParam(
    apiDocs: OpenAPIV3.Document,
    schema: OperationObject,
  ): string[] {
    const hasPathSecurity =
      schema.hasOwnProperty('security') && schema.security.length > 0;
    const hasRootSecurity =
      apiDocs.hasOwnProperty('security') && apiDocs.security.length > 0;

    let usedSecuritySchema: SecurityRequirementObject[] = [];
    if (hasPathSecurity) {
      usedSecuritySchema = schema.security;
    } else if (hasRootSecurity) {
      // if no security schema for the path, use top-level security schema
      usedSecuritySchema = apiDocs.security;
    }

    const securityQueryParameter = this.getSecurityQueryParams(
      usedSecuritySchema,
      apiDocs.components?.securitySchemes,
    );
    return securityQueryParameter;
  }

  private static getSecurityQueryParams(
    usedSecuritySchema: SecurityRequirementObject[],
    securitySchema: { [key: string]: ReferenceObject | SecuritySchemeObject },
  ): string[] {
    return usedSecuritySchema && securitySchema
      ? usedSecuritySchema
          .filter((obj) => Object.entries(obj).length !== 0)
          .map((sec) => {
            const securityKey = Object.keys(sec)[0];
            return <SecuritySchemeObject>securitySchema[securityKey];
          })
          .filter((sec) => sec?.type === 'apiKey' && sec?.in == 'query')
          .map((sec: ApiKeySecurityScheme) => sec.name)
      : [];
  }
}
