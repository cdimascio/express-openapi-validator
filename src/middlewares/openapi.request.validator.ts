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

import {
  ParametersSchemaParser,
  ParametersSchema,
} from './parameters/parameters.parse';
import { ParametersTransform } from './parameters/parameters.transform';

type BodySchema = OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | {};
interface DraftProperties extends ParametersSchema {
  body?: BodySchema;
}

export interface DraftSchema {
  required: string[];
  properties: DraftProperties;
}

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
      throw validationError(405, req.path, `${req.method} method not allowed`);
    }

    // cache middleware by combining method, path, and contentType
    const contentType = ContentType.from(req);
    const contentTypeKey = contentType.equivalents()[0] ?? 'not_provided';
    const key = `${req.method}-${req.originalUrl}-${contentTypeKey}`;

    if (!this._middlewareCache[key]) {
      const middleware = this.buildMiddleware(path, pathSchema, contentType);
      this._middlewareCache[key] = middleware;
    }
    return this._middlewareCache[key](req, res, next);
  }

  private buildMiddleware(
    path: string,
    pathSchema: OpenAPIV3.OperationObject,
    contentType: ContentType,
  ): RequestHandler {
    const paramSchemaParser = new ParametersSchemaParser(this._apiDocs);
    const parameters = paramSchemaParser.parse(path, pathSchema.parameters);
    const securityQueryParam = Security.queryParam(this._apiDocs, pathSchema);
    const bodySchemaParser = new BodySchemaParser(this.ajv, this._apiDocs);
    // TODO bodyParser.parse should return OpenAPIV3.SchemaObject instead of BodySchema
    const body = <OpenAPIV3.SchemaObject>(
      bodySchemaParser.parse(path, pathSchema, contentType)
    );

    const required = ['query', 'headers', 'params'];
    const properties = { ...parameters.schema, body: body };
    if (body.required) required.push('body');

    // $schema: "http://json-schema.org/draft-04/schema#",
    const schema = { required, properties };
    const validator = this.ajv.compile(schema);

    return (req: OpenApiRequest, res: Response, next: NextFunction): void => {
      const parametersRequest = new ParametersTransform(parameters, schema);

      parametersRequest.applyExplodedJsonTransform(req);
      parametersRequest.applyExplodedJsonArrayTransform(req);

      if (!this._requestOpts.allowUnknownQueryParameters) {
        this.rejectUnknownQueryParams(
          req.query,
          schema.properties.query,
          securityQueryParam,
        );
      }

      parametersRequest.applyPathTransform(req);
      parametersRequest.applyJsonTransform(req);
      parametersRequest.applyJsonArrayTransform(req);

      const cookies = req.cookies
        ? { ...req.cookies, ...req.signedCookies }
        : undefined;

      const valid = validator({ ...req, cookies });
      if (valid) {
        next();
      } else {
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
}

class BodySchemaParser {
  private _apiDoc: OpenAPIV3.Document;
  private ajv: Ajv;
  constructor(ajv: Ajv, apiDoc: OpenAPIV3.Document) {
    this.ajv = ajv;
    this._apiDoc = apiDoc;
  }
  public parse(
    path: string,
    pathSchema: OpenAPIV3.OperationObject,
    contentType: ContentType,
  ): BodySchema {
    // TODO should return OpenAPIV3.SchemaObject instead
    let schemaRequestBody = pathSchema.requestBody;
    if (schemaRequestBody?.hasOwnProperty('$ref')) {
      // TODO use ajv.getSchema instead
      const ref = (<OpenAPIV3.ReferenceObject>schemaRequestBody).$ref;
      const id = ref.replace(/^.+\//i, '');
      schemaRequestBody = this._apiDoc.components.requestBodies[id];
    }
    const requestBody = <OpenAPIV3.RequestBodyObject>schemaRequestBody;
    if (requestBody?.hasOwnProperty('content')) {
      return this.toSchema(path, contentType, requestBody);
      // if (requestBody.required) required.push('body');
    }
    return {};
  }
  private toSchema(
    path: string,
    contentType: ContentType,
    requestBody: OpenAPIV3.RequestBodyObject,
  ): BodySchema {
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
  ): BodySchema {
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
}

class Security {
  public static queryParam(
    apiDocs: OpenAPIV3.Document,
    schema: OpenAPIV3.OperationObject,
  ): string[] {
    const hasPathSecurity =
      schema.hasOwnProperty('security') && schema.security.length > 0;
    const hasRootSecurity =
      apiDocs.hasOwnProperty('security') && apiDocs.security.length > 0;

    let usedSecuritySchema: OpenAPIV3.SecurityRequirementObject[] = [];
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
}
