import c2k from './c2k';
import multer from 'multer';
import compose from 'koa-compose';
import * as OpenApiValidator from 'express-openapi-validator';
import {
  OpenAPIV3,
  ValidateRequestOpts,
  ValidateSecurityOpts,
  Format,
} from 'openapi-core';

export interface KoaOpenApiValidatorOpts {
  apiSpec: OpenAPIV3.Document | string;
  validateRequests?: boolean | ValidateRequestOpts;
  validateSecurity?: boolean | ValidateSecurityOpts;
  ignorePaths?: RegExp | Function;
  coerceTypes?: boolean | 'array';
  unknownFormats?: true | string[] | 'ignore';
  formats?: Format[];
  fileUploader?: boolean | multer.Options;
  $refParser?: {
    mode: 'bundle' | 'dereference';
  };
  validateFormats?: false | 'fast' | 'full';
}

export const error = OpenApiValidator.error;
export const middleware = (opts: KoaOpenApiValidatorOpts) => {
  const connectMiddlewares = OpenApiValidator.middleware(opts);
  return compose(connectMiddlewares.map((mw) => c2k(<any>mw)));
};
