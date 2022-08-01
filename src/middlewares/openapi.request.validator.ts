import Ajv, { ValidateFunction } from 'ajv';
import { createRequestAjv } from '../framework/ajv';
import {
  ContentType,
  ajvErrorsToValidatorError,
  augmentAjvErrors,
  filterOneofSubschemaErrors
} from './util';
import { NextFunction, RequestHandler, Response } from 'express';
import {
  OpenAPIV3,
  OpenApiRequest,
  RequestValidatorOptions,
  ValidateRequestOpts,
  OpenApiRequestMetadata,
  NotFound,
  BadRequest,
  ParametersSchema,
  BodySchema,
  ValidationSchema,
  ParametersValidationSchema,
  BodyValidationSchema,
} from '../framework/types';
import { BodySchemaParser } from './parsers/body.parse';
import { ParametersSchemaParser } from './parsers/schema.parse';
import { RequestParameterMutator } from './parsers/req.parameter.mutator';
import { PossiblyAsyncObject, buildSchemaWithAsync } from '../framework/ajv/async-util';

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
  private ajvBody: Ajv;
  private requestOpts: ValidateRequestOpts = {};

  constructor(
    apiDoc: OpenAPIV3.Document,
    options: RequestValidatorOptions = {},
  ) {
    this.middlewareCache = {};
    this.apiDoc = apiDoc;
    this.requestOpts.allowUnknownQueryParameters =
      options.allowUnknownQueryParameters;
    this.requestOpts.filterOneOf = options.filterOneOf;
    this.ajv = createRequestAjv(apiDoc, { ...options, coerceTypes: true });
    this.ajvBody = createRequestAjv(apiDoc, options);
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
    const reqSchema = openapi.schema;
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
  ): RequestHandler {
    const apiDoc = this.apiDoc;
    const schemaParser = new ParametersSchemaParser(this.ajv, apiDoc);
    const parameters = schemaParser.parse(path, reqSchema.parameters);
    const securityQueryParam = Security.queryParam(apiDoc, reqSchema);
    const body = new BodySchemaParser().parse(path, reqSchema, contentType);
    const validator = new Validator(this.apiDoc, parameters, body, {
      general: this.ajv,
      body: this.ajvBody,
    });
    const ajvBody = this.ajvBody;
    const filterOneOf = this.requestOpts.filterOneOf;

    const allowUnknownQueryParameters = !!(
      reqSchema['x-eov-allow-unknown-query-parameters'] ??
      this.warnUnknownQueryParametersKeyword(reqSchema)
    );

    // TODO - this shouldn't always be async - or should it :thinking:
    return async (req: OpenApiRequest, res: Response, next: NextFunction): Promise<void> => {
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

      // General validation (query/headers/params)
      const valid = validator.isGeneralAsync
        ? await this.callAndHandleErrors(validator.validatorGeneral, req, data)
        : validator.validatorGeneral.call(req, data);

      const generalErrors = [].concat(validator.validatorGeneral.errors ?? []);

      // Body validation (body content)
      const schemaBody = <any>validator?.schemaBody;
      const discriminator = schemaBody?.properties?.body?._discriminator;
      const discriminatorValidator = this.discriminatorValidator(
        req,
        discriminator,
      );
      const validatorBody = discriminatorValidator ?? validator.validatorBody;
      const bodyDataToValidate = discriminatorValidator ? data.body : data;
      const validBody = validator.isBodyAsync
        ? await this.callAndHandleErrors(validatorBody, req, bodyDataToValidate)
        : validatorBody.call(req, bodyDataToValidate);
      let bodyErrors = [].concat(validatorBody.errors ?? []);

      if (valid && validBody) {
        next();
      } else {
        if (discriminatorValidator) {
          if (bodyErrors) {
            // If we use the discriminator validator, then we're not validating
            // json with a data property (see a few lines above). Because of that,
            // the error messages end up losing the leading /body json pointer path.
            // Patch that here for consistent error messages even if body/response
            // top level schema is a discriminator.
            bodyErrors.forEach(bodyError => {
              if (bodyError?.instancePath.indexOf('/body') !== 0) {
                bodyError.instancePath = `/body${bodyError.instancePath}`;
              }
            });
          }
        }

        if (bodyErrors && bodyErrors.length > 0 && filterOneOf) {
          bodyErrors = filterOneofSubschemaErrors(bodyErrors, ajvBody);
        }

        next(this._throwValidationError(req.path, generalErrors, bodyErrors));
      }
    };
  }

  private async callAndHandleErrors(validator, req, data) {
    try {
      return await validator.call(req, data);
    } catch (err) {
      if (!(err instanceof Ajv.ValidationError)) {
        throw err;
      }
      validator.errors = err.errors;
      return false;
    }
  }

  private _throwValidationError(requestPath, generalErrors, bodyErrors) {
    const allValidationErrors = [].concat(generalErrors).concat(bodyErrors);

    const ajvValidationErrorsWithHttpError = allValidationErrors.filter(e => !!e?.params?.isHttpError);

    const httpErrorsInPath = ajvValidationErrorsWithHttpError.filter(e => e.instancePath.indexOf('/params') === 0);

    augmentAjvErrors(allValidationErrors);

    const message = this.ajv.errorsText(allValidationErrors, { dataVar: 'request' });
    const validatorError = ajvErrorsToValidatorError(400, allValidationErrors);
    const errorParameterObject = {
      path: requestPath,
      message: message,
      overrideStatus: 400,
      errors: validatorError.errors
    };

    // Could happen if serdes.deserialize throws an HttpError from async deserialize.
    if (httpErrorsInPath.length > 0) {
      const httpError = httpErrorsInPath[0].params.httpError;
      // Use the status code defined by serdes/validation
      const errorResponseStatus = httpError.status ?? 400;
      // Here we're respecting the class type of the HttpError that was thrown
      // by the user defined format/serialize/deserialize.
      const IntendedError = httpError.constructor;
      // Leave the rest of the error as-is to preserve express/ajv information.
      errorParameterObject.overrideStatus = errorResponseStatus;
      throw new IntendedError(errorParameterObject);
    } else {
      throw new BadRequest(errorParameterObject);
    }
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
  private readonly apiDoc: OpenAPIV3.Document;
  readonly schemaGeneral: PossiblyAsyncObject<ParametersValidationSchema>;
  readonly schemaBody: PossiblyAsyncObject<BodyValidationSchema>;
  readonly validatorGeneral: ValidateFunction;
  readonly validatorBody: ValidateFunction;
  readonly allSchemaProperties: ValidationSchema;
  readonly isGeneralAsync: boolean;
  readonly isBodyAsync: boolean;

  constructor(
    apiDoc: OpenAPIV3.Document,
    parametersSchema: ParametersSchema,
    bodySchema: BodySchema,
    ajv: {
      general: Ajv;
      body: Ajv;
    },
  ) {
    this.apiDoc = apiDoc;
    this.schemaGeneral = buildSchemaWithAsync(this._schemaGeneral(parametersSchema));
    this.isGeneralAsync = this.schemaGeneral['$async'] ?? false;
    this.schemaBody = buildSchemaWithAsync(this._schemaBody(bodySchema));
    this.isBodyAsync = this.schemaBody['$async'] ?? false;
    this.allSchemaProperties = {
      ...(<any>this.schemaGeneral).properties, // query, header, params props
      body: (<any>this.schemaBody).properties.body, // body props
    };

    this.validatorGeneral = ajv.general.compile(this.schemaGeneral);
    this.validatorBody = ajv.body.compile(this.schemaBody);
  }

  private _schemaGeneral(parameters: ParametersSchema): ParametersValidationSchema {
    // $schema: "http://json-schema.org/draft-04/schema#",
    return {
      paths: this.apiDoc.paths,
      components: this.apiDoc.components,
      required: ['query', 'headers', 'params'],
      properties: { ...parameters, body: {} },
    };
  }

  private _schemaBody(body: BodySchema): BodyValidationSchema {
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
    apiDocs: OpenAPIV3.Document,
    schema: OperationObject,
  ): string[] {
    const hasPathSecurity = schema.security?.length > 0 ?? false;
    const hasRootSecurity = apiDocs.security?.length > 0 ?? false;

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
