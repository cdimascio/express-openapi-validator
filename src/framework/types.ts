import * as ajv from 'ajv';
import * as multer from 'multer';
import { Request, Response, NextFunction } from 'express';
export { OpenAPIFrameworkArgs };

export type BodySchema =
  | OpenAPIV3.ReferenceObject
  | OpenAPIV3.SchemaObject
  | {};

export interface ParametersSchema {
  query: object;
  headers: object;
  params: object;
  cookies: object;
}

export interface ValidationSchema extends ParametersSchema {
  body: BodySchema;
}

export interface OpenAPIFrameworkInit {
  apiDoc: OpenAPIV3.Document;
  basePaths: string[];
}
export type SecurityHandlers = {
  [key: string]: (
    req: Request,
    scopes: string[],
    schema: OpenAPIV3.SecuritySchemeObject,
  ) => boolean | Promise<boolean>;
};

export interface MultipartOpts {
  multerOpts: boolean | multer.Options;
  ajvOpts: Options;
}

export interface Options extends ajv.Options {
  // Specific options
  serDesMap?: SerDesMap;
}

export interface RequestValidatorOptions extends Options, ValidateRequestOpts {}

export type ValidateRequestOpts = {
  allowUnknownQueryParameters?: boolean;
  coerceTypes?: boolean | 'array';
  removeAdditional?: boolean | 'all' | 'failing';
};

export type ValidateResponseOpts = {
  removeAdditional?: boolean | 'all' | 'failing';
  coerceTypes?: boolean | 'array';
  onError?: (err: InternalServerError, json: any, req: Request) => void;
};

export type ValidateSecurityOpts = {
  handlers?: SecurityHandlers;
};

export type OperationHandlerOptions = {
  basePath: string;
  resolver: Function;
};

export type Format = {
  name: string;
  type?: 'number' | 'string';
  validate: (v: any) => boolean;
};

export type SerDes = {
  format: string;
  jsonType?: string;
  serialize?: (o: unknown) => string;
  deserialize?: (s: string) => unknown;
};

export class SerDesSingleton implements SerDes {
  serializer: SerDes;
  deserializer: SerDes;
  format: string;
  jsonType: string;
  serialize?: (o: unknown) => string;
  deserialize?: (s: string) => unknown;

  constructor(param: {
    format: string;
    jsonType?: string;
    serialize: (o: unknown) => string;
    deserialize: (s: string) => unknown;
  }) {
    this.format = param.format;
    this.jsonType = param.jsonType || 'object';
    this.serialize = param.serialize;
    this.deserialize = param.deserialize;
    this.deserializer = {
      format: param.format,
      jsonType: param.jsonType || 'object',
      deserialize: param.deserialize
    }
    this.serializer = {
      format: param.format,
      jsonType: param.jsonType || 'object',
      serialize: param.serialize
    }
  }
};

export type SerDesMap = {
  [format: string]: SerDes
};

export interface OpenApiValidatorOpts {
  apiSpec: OpenAPIV3.Document | string;
  validateApiSpec?: boolean;
  validateResponses?: boolean | ValidateResponseOpts;
  validateRequests?: boolean | ValidateRequestOpts;
  validateSecurity?: boolean | ValidateSecurityOpts;
  ignorePaths?: RegExp | Function;
  ignoreUndocumented?: boolean;
  securityHandlers?: SecurityHandlers;
  coerceTypes?: boolean | 'array';
  unknownFormats?: true | string[] | 'ignore';
  serDes?: SerDes[];
  formats?: Format[];
  fileUploader?: boolean | multer.Options;
  multerOpts?: multer.Options;
  $refParser?: {
    mode: 'bundle' | 'dereference';
  };
  operationHandlers?: false | string | OperationHandlerOptions;
  validateFormats?: false | 'fast' | 'full';
}

export namespace OpenAPIV3 {
  export interface Document {
    openapi: string;
    info: InfoObject;
    servers?: ServerObject[];
    paths: PathsObject;
    components?: ComponentsObject;
    security?: SecurityRequirementObject[];
    tags?: TagObject[];
    externalDocs?: ExternalDocumentationObject;
  }

  export interface InfoObject {
    title: string;
    description?: string;
    termsOfService?: string;
    contact?: ContactObject;
    license?: LicenseObject;
    version: string;
  }

  export interface ContactObject {
    name?: string;
    url?: string;
    email?: string;
  }

  export interface LicenseObject {
    name: string;
    url?: string;
  }

  export interface ServerObject {
    url: string;
    description?: string;
    variables?: { [variable: string]: ServerVariableObject };
  }

  export interface ServerVariableObject {
    enum?: string[];
    default: string;
    description?: string;
  }

  export interface PathsObject {
    [pattern: string]: PathItemObject;
  }

  export interface PathItemObject {
    $ref?: string;
    summary?: string;
    description?: string;
    get?: OperationObject;
    put?: OperationObject;
    post?: OperationObject;
    delete?: OperationObject;
    options?: OperationObject;
    head?: OperationObject;
    patch?: OperationObject;
    trace?: OperationObject;
    servers?: ServerObject[];
    parameters?: Array<ReferenceObject | ParameterObject>;
  }

  export interface OperationObject {
    tags?: string[];
    summary?: string;
    description?: string;
    externalDocs?: ExternalDocumentationObject;
    operationId?: string;
    parameters?: Array<ReferenceObject | ParameterObject>;
    requestBody?: ReferenceObject | RequestBodyObject;
    responses?: ResponsesObject;
    callbacks?: { [callback: string]: ReferenceObject | CallbackObject };
    deprecated?: boolean;
    security?: SecurityRequirementObject[];
    servers?: ServerObject[];
  }

  export interface ExternalDocumentationObject {
    description?: string;
    url: string;
  }

  export interface ParameterObject extends ParameterBaseObject {
    name: string;
    in: string;
  }

  export interface HeaderObject extends ParameterBaseObject {}

  interface ParameterBaseObject {
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    allowEmptyValue?: boolean;
    style?: string;
    explode?: boolean;
    allowReserved?: boolean;
    schema?: ReferenceObject | SchemaObject;
    example?: any;
    examples?: { [media: string]: ReferenceObject | ExampleObject };
    content?: { [media: string]: MediaTypeObject };
  }
  export type NonArraySchemaObjectType =
    | 'null'
    | 'boolean'
    | 'object'
    | 'number'
    | 'string'
    | 'integer';
  export type ArraySchemaObjectType = 'array';
  export type SchemaObject = ArraySchemaObject | NonArraySchemaObject;

  export interface ArraySchemaObject extends BaseSchemaObject {
    type: ArraySchemaObjectType;
    items: ReferenceObject | SchemaObject;
  }

  export interface NonArraySchemaObject extends BaseSchemaObject {
    type: NonArraySchemaObjectType;
  }

  interface BaseSchemaObject {
    // JSON schema allowed properties, adjusted for OpenAPI
    title?: string;
    description?: string;
    format?: string;
    default?: any;
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: boolean;
    minimum?: number;
    exclusiveMinimum?: boolean;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    additionalProperties?: boolean | ReferenceObject | SchemaObject;
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    maxProperties?: number;
    minProperties?: number;
    required?: string[];
    enum?: any[];
    properties?: {
      [name: string]: ReferenceObject | SchemaObject;
    };
    allOf?: Array<ReferenceObject | SchemaObject>;
    oneOf?: Array<ReferenceObject | SchemaObject>;
    anyOf?: Array<ReferenceObject | SchemaObject>;
    not?: ReferenceObject | SchemaObject;

    // OpenAPI-specific properties
    nullable?: boolean;
    discriminator?: DiscriminatorObject;
    readOnly?: boolean;
    writeOnly?: boolean;
    xml?: XMLObject;
    externalDocs?: ExternalDocumentationObject;
    example?: any;
    deprecated?: boolean;

    // Express-openapi-validator specific properties
    componentId?: string;
  }

  export interface DiscriminatorObject {
    propertyName: string;
    mapping?: { [value: string]: string };
  }

  export interface XMLObject {
    name?: string;
    namespace?: string;
    prefix?: string;
    attribute?: boolean;
    wrapped?: boolean;
  }

  export interface ReferenceObject {
    $ref: string;
  }

  export interface ExampleObject {
    summary?: string;
    description?: string;
    value?: any;
    externalValue?: string;
  }

  export interface MediaTypeObject {
    schema?: ReferenceObject | SchemaObject;
    example?: any;
    examples?: { [media: string]: ReferenceObject | ExampleObject };
    encoding?: { [media: string]: EncodingObject };
  }

  export interface EncodingObject {
    contentType?: string;
    headers?: { [header: string]: ReferenceObject | HeaderObject };
    style?: string;
    explode?: boolean;
    allowReserved?: boolean;
  }

  export interface RequestBodyObject {
    description?: string;
    content: { [media: string]: MediaTypeObject };
    required?: boolean;
  }

  export interface ResponsesObject {
    [code: string]: ReferenceObject | ResponseObject;
  }

  export interface ResponseObject {
    description: string;
    headers?: { [header: string]: ReferenceObject | HeaderObject };
    content?: { [media: string]: MediaTypeObject };
    links?: { [link: string]: ReferenceObject | LinkObject };
  }

  export interface LinkObject {
    operationRef?: string;
    operationId?: string;
    parameters?: { [parameter: string]: any };
    requestBody?: any;
    description?: string;
    server?: ServerObject;
  }

  export interface CallbackObject {
    [url: string]: PathItemObject;
  }

  export interface SecurityRequirementObject {
    [name: string]: string[];
  }

  export interface ComponentsObject {
    schemas?: { [key: string]: ReferenceObject | SchemaObject };
    responses?: { [key: string]: ReferenceObject | ResponseObject };
    parameters?: { [key: string]: ReferenceObject | ParameterObject };
    examples?: { [key: string]: ReferenceObject | ExampleObject };
    requestBodies?: { [key: string]: ReferenceObject | RequestBodyObject };
    headers?: { [key: string]: ReferenceObject | HeaderObject };
    securitySchemes?: { [key: string]: ReferenceObject | SecuritySchemeObject };
    links?: { [key: string]: ReferenceObject | LinkObject };
    callbacks?: { [key: string]: ReferenceObject | CallbackObject };
  }

  export type SecuritySchemeObject =
    | HttpSecurityScheme
    | ApiKeySecurityScheme
    | OAuth2SecurityScheme
    | OpenIdSecurityScheme;

  export interface HttpSecurityScheme {
    type: 'http';
    description?: string;
    scheme: string;
    bearerFormat?: string;
  }

  export interface ApiKeySecurityScheme {
    type: 'apiKey';
    description?: string;
    name: string;
    in: string;
  }

  export interface OAuth2SecurityScheme {
    type: 'oauth2';
    flows: {
      implicit?: {
        authorizationUrl: string;
        refreshUrl?: string;
        scopes: { [scope: string]: string };
      };
      password?: {
        tokenUrl: string;
        refreshUrl?: string;
        scopes: { [scope: string]: string };
      };
      clientCredentials?: {
        tokenUrl: string;
        refreshUrl?: string;
        scopes: { [scope: string]: string };
      };
      authorizationCode?: {
        authorizationUrl: string;
        tokenUrl: string;
        refreshUrl?: string;
        scopes: { [scope: string]: string };
      };
    };
  }

  export interface OpenIdSecurityScheme {
    type: 'openIdConnect';
    description?: string;
    openIdConnectUrl: string;
  }

  export interface TagObject {
    name: string;
    description?: string;
    externalDocs?: ExternalDocumentationObject;
  }
}

export interface OpenAPIFrameworkPathObject {
  path?: string;
  module?: any;
}

interface OpenAPIFrameworkArgs {
  apiDoc: OpenAPIV3.Document | string;
  validateApiSpec?: boolean;
  $refParser?: {
    mode: 'bundle' | 'dereference';
  };
}

export interface OpenAPIFrameworkAPIContext {
  // basePaths: BasePath[];
  basePaths: string[];
  getApiDoc(): OpenAPIV3.Document;
}

export interface OpenAPIFrameworkVisitor {
  visitApi?(context: OpenAPIFrameworkAPIContext): void;
}

export interface OpenApiRequestMetadata {
  expressRoute: string;
  openApiRoute: string;
  pathParams: { [index: string]: string };
  schema: OpenAPIV3.OperationObject;
}

export interface OpenApiRequest extends Request {
  openapi?: OpenApiRequestMetadata;
}

export type OpenApiRequestHandler = (
  req: OpenApiRequest,
  res: Response,
  next: NextFunction,
) => any;

export interface IJsonSchema {
  id?: string;
  $schema?: string;
  title?: string;
  description?: string;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  additionalItems?: boolean | IJsonSchema;
  items?: IJsonSchema | IJsonSchema[];
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  additionalProperties?: boolean | IJsonSchema;
  definitions?: {
    [name: string]: IJsonSchema;
  };
  properties?: {
    [name: string]: IJsonSchema;
  };
  patternProperties?: {
    [name: string]: IJsonSchema;
  };
  dependencies?: {
    [name: string]: IJsonSchema | string[];
  };
  enum?: any[];
  type?: string | string[];
  allOf?: IJsonSchema[];
  anyOf?: IJsonSchema[];
  oneOf?: IJsonSchema[];
  not?: IJsonSchema;
}

export interface ValidationError {
  message?: string;
  status: number;
  errors: ValidationErrorItem[];
}

export interface ValidationErrorItem {
  path: string;
  message: string;
  error_code?: string;
}

interface ErrorHeaders {
  Allow?: string;
}

export class HttpError extends Error implements ValidationError {
  status!: number;
  path?: string;
  name!: string;
  message!: string;
  headers?: ErrorHeaders;
  errors!: ValidationErrorItem[];
  constructor(err: {
    status: number;
    path: string;
    name: string;
    message?: string;
    headers?: ErrorHeaders;
    errors?: ValidationErrorItem[];
  }) {
    super(err.name);
    this.name = err.name;
    this.status = err.status;
    this.path = err.path;
    this.message = err.message;
    this.headers = err.headers;
    this.errors = err.errors ?? [
      {
        path: err.path,
        message: err.message,
      },
    ];
  }

  public static create(err: {
    status: number;
    path: string;
    message?: string;
    errors?: ValidationErrorItem[];
  }):
    | InternalServerError
    | UnsupportedMediaType
    | RequestEntityTooLarge
    | BadRequest
    | MethodNotAllowed
    | NotAcceptable
    | NotFound
    | Unauthorized
    | Forbidden {
    switch (err.status) {
      case 400:
        return new BadRequest(err);
      case 401:
        return new Unauthorized(err);
      case 403:
        return new Forbidden(err);
      case 404:
        return new NotFound(err);
      case 405:
        return new MethodNotAllowed(err);
      case 406:
        return new NotAcceptable(err);
      case 413:
        return new RequestEntityTooLarge(err);
      case 415:
        return new UnsupportedMediaType(err);
      default:
        return new InternalServerError(err);
    }
  }
}

export class NotFound extends HttpError {
  constructor(err: {
    path: string;
    message?: string;
    overrideStatus?: number;
  }) {
    super({
      status: err.overrideStatus || 404,
      path: err.path,
      message: err.message,
      name: 'Not Found',
    });
  }
}

export class NotAcceptable extends HttpError {
  constructor(err: {
    path: string;
    message?: string;
    overrideStatus?: number;
  }) {
    super({
      status: err.overrideStatus || 406,
      path: err.path,
      name: 'Not Acceptable',
      message: err.message,
    });
  }
}

export class MethodNotAllowed extends HttpError {
  constructor(err: {
    path: string;
    message?: string;
    headers?: ErrorHeaders;
    overrideStatus?: number;
  }) {
    super({
      status: err.overrideStatus || 405,
      path: err.path,
      name: 'Method Not Allowed',
      message: err.message,
      headers: err.headers,
    });
  }
}

export class BadRequest extends HttpError {
  constructor(err: {
    path: string;
    message?: string;
    overrideStatus?: number;
    errors?: ValidationErrorItem[];
  }) {
    super({
      status: err.overrideStatus || 400,
      path: err.path,
      name: 'Bad Request',
      message: err.message,
      errors: err.errors,
    });
  }
}

export class RequestEntityTooLarge extends HttpError {
  constructor(err: {
    path: string;
    message?: string;
    overrideStatus?: number;
  }) {
    super({
      status: err.overrideStatus || 413,
      path: err.path,
      name: 'Request Entity Too Large',
      message: err.message,
    });
  }
}

export class InternalServerError extends HttpError {
  constructor(err: {
    path?: string;
    message?: string;
    overrideStatus?: number;
    errors?: ValidationErrorItem[];
  }) {
    super({
      status: err.overrideStatus || 500,
      path: err.path,
      name: 'Internal Server Error',
      message: err.message,
      errors: err.errors,
    });
  }
}

export class UnsupportedMediaType extends HttpError {
  constructor(err: {
    path: string;
    message?: string;
    overrideStatus?: number;
  }) {
    super({
      status: err.overrideStatus || 415,
      path: err.path,
      name: 'Unsupported Media Type',
      message: err.message,
    });
  }
}

export class Unauthorized extends HttpError {
  constructor(err: {
    path: string;
    message?: string;
    overrideStatus?: number;
  }) {
    super({
      status: err.overrideStatus || 401,
      path: err.path,
      name: 'Unauthorized',
      message: err.message,
    });
  }
}

export class Forbidden extends HttpError {
  constructor(err: {
    path: string;
    message?: string;
    overrideStatus?: number;
  }) {
    super({
      status: err.overrideStatus || 403,
      path: err.path,
      name: 'Forbidden',
      message: err.message,
    });
  }
}
