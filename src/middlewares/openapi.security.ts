import { SecurityHandlers } from '../index';
import { OpenAPIV3 } from '../framework/types';
import { validationError } from './util';
import { OpenApiContext } from '../framework/openapi.context';

export function security(
  context: OpenApiContext,
  securityHandlers: SecurityHandlers,
) {
  return (req, res, next) => {
    if (!req.openapi) {
      // this path was not found in open api and
      // this path is not defined under an openapi base path
      // skip it
      return next();
    }

    const securitySchema = <OpenAPIV3.SecuritySchemeObject>(
      req.openapi.schema.security
    );

    const path = req.openapi.openApiRoute;

    if (!path || !Array.isArray(securitySchema)) {
      return next();
    }

    const securitySchemes =
      context.apiDoc.components && context.apiDoc.components.securitySchemes;
    if (!securitySchemes) {
      // TODO throw error securitySchemes don't exist, but a security is referenced in this model
    }

    // TODO security could be boolean or promise bool, handle both
    const promises = securitySchema.map(s => {
      const securityKey = Object.keys(s)[0];
      const scheme: any = securitySchemes[securityKey];
      const handler = securityHandlers[securityKey];
      if (!scheme) {
        const message = `components.securitySchemes.${securityKey} does not exist`;
        return Promise.reject(validationError(401, path, message));
      }
      if (!handler) {
        const message = `a handler for ${securityKey} does not exist`;
        return Promise.reject(validationError(401, path, message));
      }
      if (scheme.type === 'apiKey') {
        // check defined header
        if (scheme.in === 'header') {
            if (!req.headers[scheme.name.toLowerCase()]) {
              return Promise.reject(validationError(401, path, `'${scheme.name}' header required.`));
            }
        } else if (scheme.in === 'query') {
          if (!req.headers[scheme.name]) {
            return Promise.reject(validationError(401, path, `query parameter '${scheme.name}' required.`));
          }
        }
      }
      if (['http'].includes(scheme.type)) {
        if (!req.headers['authorization']) {
          return Promise.reject(validationError(401, path, `'authorization' header required.`));
        }
      }
      // TODO handle other security types

      // TODO get scopes
      const scopes = [];
      try {
        return Promise.resolve(handler(req, scopes, securitySchema));
      } catch (e) {
        return Promise.reject(e);
      }
    });

    return Promise.all(promises)
      .then(results => {
        const authFailed = results.filter(b => !b).length > 0;
        if (authFailed) throw Error();
        else next();
      })
      .catch(e => {
        const message = (e && e.message) || 'unauthorized';
        const err = validationError(401, path, message);
        next(err);
      });
  };
}
