import { OpenApiContext } from '../framework/openapi.context';
// import { validationError } from './util';

export function security(openApiContext: OpenApiContext) {
  return (req, res, next) => {
    if (!req.openapi) {
      // this path was not found in open api and
      // this path is not defined under an openapi base path
      // skip it
      return next();
    }

    const security = req.openapi.schema.security;
    if (!security) {
      return next();
    }

    console.log('found security ', security, req.openapi);
    // run security handlers
    next();
  };
}
