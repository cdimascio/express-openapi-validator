import Ajv, { ValidateFunction } from 'ajv';
import { NextFunction, RequestHandler, Response } from 'express';
import { createRequestAjv } from '../framework/ajv';
import {
  BadRequest,
  BodySchema,
  NotFound,
  OpenAPIV3,
  OpenApiRequest,
  OpenApiRequestMetadata,
  ParametersSchema,
  RequestValidatorOptions,
  ValidateRequestOpts,
  ValidationSchema,
} from '../framework/types';
import { BodySchemaParser } from './parsers/body.parse';
import { RequestParameterMutator } from './parsers/req.parameter.mutator';
import { ParametersSchemaParser } from './parsers/schema.parse';
import {
  ContentType,
  ajvErrorsToValidatorError,
  augmentAjvErrors,
  useAjvCache,
} from './util';

type OperationObject = OpenAPIV3.OperationObject;
type SchemaObject = OpenAPIV3.SchemaObject;
type ReferenceObject = OpenAPIV3.ReferenceObject;
type SecurityRequirementObject = OpenAPIV3.SecurityRequirementObject;
type SecuritySchemeObject = OpenAPIV3.SecuritySchemeObject;
type ApiKeySecurityScheme = OpenAPIV3.ApiKeySecurityScheme;
export class RequestValidator {
  private middlewareCache: { [key: string]: RequestHandler } = {};
  private apiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1;
  private ajv: Ajv;
  private ajvBody: Ajv;
  private requestOpts: ValidateRequestOpts = {};

  constructor(
    apiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1,
    options: RequestValidatorOptions = {},
  ) {
    this.middlewareCache = {};
    this.apiDoc = apiDoc;
    // Examples not needed for validation
    delete this.apiDoc.components?.examples;
    this.requestOpts.allowUnknownQueryParameters =
      options.allowUnknownQueryParameters;

    this.ajv = createRequestAjv(
      apiDoc,
      // This should always be true as it handles query params (everything, but the body)
      // This should always be coerced. Note that coerceTypes = 'array` also operates as true
      // but also coerces 'array' types
      !options.coerceTypes ? { ...options, coerceTypes: true } : options,
    );
    this.ajvBody = createRequestAjv(apiDoc, options);
  }

  public validate(
    req: OpenApiRequest,
    res: Response,
    next: NextFunction,
  ): void | Promise<void> {
    if (!req.openapi) {
      // this path was not found in open api and
      // this path is not defined under an openapi base path
      // skip it
      return next();
    }

    const openapi = <OpenApiRequestMetadata>req.openapi;
    const path = openapi.expressRoute;
    const reqSchema = openapi.schema;
    // cache middleware by combining method, path, and contentType
    const contentType = ContentType.from(req);
    const contentTypeKey = contentType.normalize() ?? 'not_provided';
    // use openapi.expressRoute as path portion of key
    const key = `${req.method}-${path}-${contentTypeKey}`;

    if (!this.middlewareCache[key]) {
      const middleware = this.buildMiddleware(path, reqSchema, contentType, key);
      this.middlewareCache[key] = middleware;
    }
    return this.middlewareCache[key](req, res, next);
  }

  private warnUnknownQueryParametersKeyword(
    reqSchema: OperationObject,
  ): boolean {
    if (typeof reqSchema['x-allow-unknown-query-parameters'] === 'boolean') {
      console.warn(
        '"x-allow-unknown-query-parameters" is deprecated. Use "x-eov-allow-unknown-query-parameters"',
      );
    }
    return (
      reqSchema['x-allow-unknown-query-parameters'] ??
      this.requestOpts.allowUnknownQueryParameters
    );
  }

  private buildMiddleware(
    path: string,
    reqSchema: OperationObject,
    contentType: ContentType,
    ajvCacheKey: string
  ): RequestHandler {
    const apiDoc = this.apiDoc;
    const schemaParser = new ParametersSchemaParser(this.ajv, apiDoc);
    const parameters = schemaParser.parse(path, reqSchema.parameters);
    const securityQueryParam = Security.queryParam(apiDoc, reqSchema);
    const body = new BodySchemaParser().parse(path, reqSchema, contentType);
    const validator = new Validator(this.apiDoc, parameters, body, {
      general: this.ajv,
      body: this.ajvBody,
    }, ajvCacheKey);

    const allowUnknownQueryParameters = !!(
      reqSchema['x-eov-allow-unknown-query-parameters'] ??
      this.warnUnknownQueryParametersKeyword(reqSchema)
    );

    return (req: OpenApiRequest, res: Response, next: NextFunction): void => {
      const openapi = <OpenApiRequestMetadata>req.openapi;
      const pathParams = Object.keys(openapi.pathParams);
      const hasPathParams = pathParams.length > 0;

      if (hasPathParams) {
        // handle wildcard path param syntax
        if (openapi.expressRoute.endsWith('*')) {
          // if we have an express route /data/:p*, we require a path param, p
          // if the p param is empty, the user called /p which is not found
          // if it was found, it would match a different route
          if (pathParams.filter((p) => openapi.pathParams[p]).length === 0) {
            throw new NotFound({
              path: req.path,
              message: 'not found',
            });
          }
        }
        req.params = openapi.pathParams ?? req.params;
      }
      // HACK for express 5, temporarily make req.query mutable
      const reqQueryDescriptor = Object.getOwnPropertyDescriptor(req, 'query');
      Object.defineProperty(req, 'query', {
        writable: true,
        value: req.query,
      });
      const schemaProperties = validator.allSchemaProperties;
      const mutator = new RequestParameterMutator(
        this.ajv,
        apiDoc,
        path,
        schemaProperties,
      );

      mutator.modifyRequest(req);

      if (!allowUnknownQueryParameters) {
        this.processQueryParam(
          req.query,
          schemaProperties.query,
          securityQueryParam,
        );
      }

      const schemaBody = <any>validator?.schemaBody;
      if (contentType.mediaType === 'multipart/form-data') {
        // make req.body {}
        req.body ??= {};
        this.multipartNested(req, schemaBody);
      }

      // HACK for express 5, Restore the original descriptor
      if (reqQueryDescriptor) {
        Object.defineProperty(req, 'query', reqQueryDescriptor);
      }

      const cookies = req.cookies
        ? {
            ...req.cookies,
            ...req.signedCookies,
          }
        : undefined;

      const data = {
        query: req.query ?? {},
        headers: req.headers,
        params: req.params,
        cookies,
        body: req.body,
      };

      const discriminator = schemaBody?.properties?.body?._discriminator;
      const discriminatorValidator = this.discriminatorValidator(
        req,
        discriminator,
      );

      const validatorBody = discriminatorValidator ?? validator.validatorBody;
      const valid = validator.validatorGeneral(data);
      const validBody = validatorBody(
        discriminatorValidator ? data.body : data,
      );

      if (valid && validBody) {
        next();
      } else {
        const errors = augmentAjvErrors(
          []
            .concat(validator.validatorGeneral.errors ?? [])
            .concat(validatorBody.errors ?? []),
        );
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

  private multipartNested(req, schemaBody) {
    if (!req.body) {
      return;
    }

    Object.keys(req.body).forEach((key) => {
      const value = req.body[key];
      // TODO: Add support for oneOf, anyOf, allOf as the body schema
      const type = schemaBody?.properties?.body?.properties?.[key]?.type;
      if (['array', 'object'].includes(type)) {
        try {
          req.body[key] = JSON.parse(value);
        } catch (e) {
          // NOOP
        }
      }
    });
    return null;
  }

  private discriminatorValidator(req, discriminator) {
    if (discriminator) {
      const { options, property, validators } = discriminator;
      const discriminatorValue = req.body[property]; // TODO may not always be in this position
      if (options.find((o) => o.option === discriminatorValue)) {
        return validators[discriminatorValue];
      } else {
        throw new BadRequest({
          path: req.path,
          message: `'${property}' must be equal to one of the allowed values: ${options
            .map((o) => o.option)
            .join(', ')}.`,
        });
      }
    }
    return null;
  }
  private processQueryParam(query: object, schema, whiteList: string[] = []) {
    const entries = Object.entries(schema.properties ?? {});
    let keys = [];
    for (const [key, prop] of entries) {
      if (prop['type'] === 'object' && prop['additionalProperties']) {
        // we have an object that allows additional properties
        return;
      }
      keys.push(key);
    }
    const knownQueryParams = new Set(keys);
    whiteList.forEach((item) => knownQueryParams.add(item));
    const queryParams = Object.keys(query);
    const allowedEmpty = schema.allowEmptyValue;
    for (const q of queryParams) {
      if (!knownQueryParams.has(q)) {
        throw new BadRequest({
          path: `/query/${q}`,
          message: `Unknown query parameter '${q}'`,
        });
      } else if (!allowedEmpty?.has(q) && (query[q] === '' || null)) {
        throw new BadRequest({
          path: `/query/${q}`,
          message: `Empty value found for query parameter '${q}'`,
        });
      }
    }
  }
}

class Validator {
  private readonly apiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1;
  readonly schemaGeneral: object;
  readonly schemaBody: object;
  readonly validatorGeneral: ValidateFunction;
  readonly validatorBody: ValidateFunction;
  readonly allSchemaProperties: ValidationSchema;

  constructor(
    apiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1,
    parametersSchema: ParametersSchema,
    bodySchema: BodySchema,
    ajv: {
      general: Ajv;
      body: Ajv;
    },
    ajvCacheKey: string
  ) {
    this.apiDoc = apiDoc;
    this.schemaGeneral = this._schemaGeneral(parametersSchema);
    this.schemaBody = this._schemaBody(bodySchema);
    this.allSchemaProperties = {
      ...(<any>this.schemaGeneral).properties, // query, header, params props
      body: (<any>this.schemaBody).properties.body, // body props
    };
    this.validatorGeneral = useAjvCache(ajv.general, this.schemaGeneral, ajvCacheKey);
    this.validatorBody = useAjvCache(ajv.body, this.schemaBody, ajvCacheKey);
  }

  private _schemaGeneral(parameters: ParametersSchema): object {
    // $schema: "http://json-schema.org/draft-04/schema#",
    return {
      paths: this.apiDoc.paths,
      components: this.apiDoc.components,
      required: ['query', 'headers', 'params'],
      properties: { ...parameters, body: {} },
    };
  }

  private _schemaBody(body: BodySchema): object {
    // $schema: "http://json-schema.org/draft-04/schema#"
    const isBodyBinary = body?.['format'] === 'binary';
    const bodyProps = isBodyBinary ? {} : body;
    const bodySchema = {
      paths: this.apiDoc.paths,
      components: this.apiDoc.components,
      properties: {
        query: {},
        headers: {},
        params: {},
        cookies: {},
        body: bodyProps,
      },
    };
    const requireBody = (<SchemaObject>body).required && !isBodyBinary;
    if (requireBody) {
      (<any>bodySchema).required = ['body'];
    }
    return bodySchema;
  }
}

class Security {
  public static queryParam(
    apiDocs: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1,
    schema: OperationObject,
  ): string[] {
    const hasPathSecurity = schema.security
      ? schema.security.length > 0
      : false;
    const hasRootSecurity = apiDocs.security
      ? apiDocs.security.length > 0
      : false;

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
