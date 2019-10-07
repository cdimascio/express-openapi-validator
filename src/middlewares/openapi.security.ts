import { SecurityHandlers } from '../index';
import { OpenAPIV3 } from '../framework/types';
import { validationError } from './util';

export function security(securityHandlers: SecurityHandlers) {
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

    // TODO security could be boolean or promise bool, handle both
    const promises = securitySchema.map(s => {
      const securityKey = Object.keys(s)[0];
      const f = securityHandlers[securityKey];
      // TODO get scopes
      const scopes = [];
      try {
        return Promise.resolve(f(req, scopes, securitySchema));
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
        const message = (e && e.message) || 'unauthorized'
        const err = validationError(401, path, message);
        next(err);
      });
  };
}
