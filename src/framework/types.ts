import { Request } from 'express';
import { SecurityHandlers } from 'openapi-security-handler';
import { IJsonSchema, OpenAPIV2, OpenAPIV3 } from 'openapi-types';
import { Logger } from 'ts-log';
import BasePath from './base.path';
export {
  OpenAPIFrameworkArgs,
  OpenAPIFrameworkConstructorArgs,
  OpenAPIErrorTransformer,
};

// TODO move this to openapi-request-validator
type OpenAPIErrorTransformer = ({}, {}) => object;

type PathSecurityTuple = [RegExp, SecurityRequirement[]];

interface SecurityRequirement {
  [name: string]: SecurityScope[];
}

type SecurityScope = string;

// type SecurityHandlerCallback = (
//   error: SecurityHandlerError,
//   result: boolean
// ) => void;

interface SecurityHandlerError {
  status?: number;
  challenge?: string;
  message?: any;
}

export interface OpenAPIFrameworkPathObject {
  path?: string;
  module?: any;
}

export interface IOpenAPIFramework {
  featureType: string;
  loggingPrefix: string;
  name: string;
}

interface OpenAPIFrameworkConstructorArgs extends OpenAPIFrameworkArgs {
  featureType: string;
  name: string;
}

interface OpenAPIFrameworkArgs {
  apiDoc: OpenAPIV2.Document | OpenAPIV3.Document | string;
  customFormats?: { string: (arg: any) => boolean };
  dependencies?: { [service: string]: any };
  enableObjectCoercion?: boolean;
  errorTransformer?: OpenAPIErrorTransformer;
  externalSchemas?: { string: IJsonSchema };
  pathSecurity?: PathSecurityTuple[];
  operations?: { [operationId: string]: (...arg: any[]) => any };
  paths?: string | OpenAPIFrameworkPathObject[];
  pathsIgnore?: RegExp;
  routesGlob?: string;
  routesIndexFileRegExp?: RegExp;
  securityHandlers?: SecurityHandlers; // TODO define the handlers more here
  validateApiDoc?: boolean;
  logger?: Logger;
}

export interface OpenAPIFrameworkAPIContext {
  basePaths: BasePath[];
  // TODO fill this out
  getApiDoc(): any;
}

export interface OpenAPIFrameworkPathContext {
  basePaths: BasePath[];
  // TODO fill this out
  getApiDoc(): any;
  getPathDoc(): any;
}

export interface OpenAPIFrameworkVisitor {
  visitApi?(context: OpenAPIFrameworkAPIContext): void;
  visitPath?(context: OpenAPIFrameworkPathContext): void;
  // visitOperation?(context: OpenAPIFrameworkOperationContext): void;
}

export interface OpenApiRequest extends Request {
  openapi;
}

/* istanbul ignore next */
export class ConsoleDebugAdapterLogger implements Logger {
  /**
   * `console.debug` is just an alias for `.log()`, and we want debug logging to be optional.
   * This class delegates to `console` and overrides `.debug()` to be a no-op.
   */
  public debug(message?: any, ...optionalParams: any[]): void {
    // no-op
  }

  public error(message?: any, ...optionalParams: any[]): void {
    console.error(message, ...optionalParams);
  }

  public info(message?: any, ...optionalParams: any[]): void {
    console.info(message, ...optionalParams);
  }

  public trace(message?: any, ...optionalParams: any[]): void {
    console.trace(message, ...optionalParams);
  }

  public warn(message?: any, ...optionalParams: any[]): void {
    console.warn(message, ...optionalParams);
  }
}
