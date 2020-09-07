import * as _uniq from 'lodash.uniq';
import { OpenApiValidator } from './openapi.validator';
import { OpenApiSpecLoader } from './framework/openapi.spec.loader';
import { ExpressOpenApiValidatorOpts } from './framework/types';

export {
  ExpressOpenApiValidatorOpts,
  OpenApiValidatorOpts,
  InternalServerError,
  UnsupportedMediaType,
  RequestEntityToLarge,
  BadRequest,
  MethodNotAllowed,
  NotFound,
  Unauthorized,
  Forbidden,
} from './framework/types';

import * as res from './resolvers';
export const resolvers = res;

export function middleware(options: ExpressOpenApiValidatorOpts) {
  const oav = new OpenApiValidator(options);
  exports.middleware._oav = oav;

  return oav.installMiddleware(
    new OpenApiSpecLoader({
      apiDoc: options.apiSpec,
      $refParser: options.$refParser,
    }).load(),
  );
}
