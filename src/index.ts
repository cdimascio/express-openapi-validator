import * as cloneDeep from 'lodash.clonedeep';
import * as res from './resolvers';
import { OpenApiValidator, OpenApiValidatorOpts } from './openapi.validator';
import { OpenApiSpecLoader } from './framework/openapi.spec.loader';
import {
  InternalServerError,
  UnsupportedMediaType,
  RequestEntityTooLarge,
  BadRequest,
  MethodNotAllowed,
  NotAcceptable,
  NotFound,
  Unauthorized,
  Forbidden,
} from './framework/types';

// export default openapiValidator;
export const resolvers = res;
export const middleware = openapiValidator;
export const error = {
  InternalServerError,
  UnsupportedMediaType,
  RequestEntityTooLarge,
  BadRequest,
  MethodNotAllowed,
  NotAcceptable,
  NotFound,
  Unauthorized,
  Forbidden,
};

export * as serdes from './framework/base.serdes';

function openapiValidator(options: OpenApiValidatorOpts) {
  const oav = new OpenApiValidator(options);
  exports.middleware._oav = oav;

  return oav.installMiddleware(
    new OpenApiSpecLoader({
      apiDoc: cloneDeep(options.apiSpec),
      validateApiSpec: options.validateApiSpec,
      $refParser: options.$refParser,
    }).load(),
  );
}
