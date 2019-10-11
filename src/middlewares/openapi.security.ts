import { SecurityHandlers } from '../index';
import { OpenAPIV3, OpenApiRequest } from '../framework/types';
import { validationError } from './util';
import { OpenApiContext } from '../framework/openapi.context';

export function security(
  context: OpenApiContext,
  securityHandlers: SecurityHandlers,
) {
  return async (req, res, next) => {
    if (!req.openapi) {
      // this path was not found in open api and
      // this path is not defined under an openapi base path
      // skip it
      return next();
    }

    const securitySchema = <OpenAPIV3.SecuritySchemeObject>(
      req.openapi.schema.security
    );

    const path: string = req.openapi.openApiRoute;

    if (!path || !Array.isArray(securitySchema)) {
      return next();
    }

    const securitySchemes =
      context.apiDoc.components && context.apiDoc.components.securitySchemes;
    if (!securitySchemes) {
      const message = `security referenced at path ${path}, but not defined in components.securitySchemes`;
      return next(validationError(500, path, message));
    }

    // TODO security could be boolean or promise bool, handle both
    const promises = securitySchema.map(s => {
      try {
        const securityKey = Object.keys(s)[0];
        const scopes = Array.isArray(s) ? s : []
        const scheme: any = securitySchemes[securityKey];
        const handler = securityHandlers[securityKey];

        if (!scheme) {
          const message = `components.securitySchemes.${securityKey} does not exist`;
          throw validationError(401, path, message);
        }
        if (!scheme.type) {
          const message = `components.securitySchemes.${securityKey} must have property 'type'`;
          throw validationError(401, path, message);
        }
        if (!handler) {
          const message = `a handler for ${securityKey} does not exist`;
          throw validationError(401, path, message);
        }

        new AuthValidator(req, scheme).validate();

        return Promise.resolve(handler(req, scopes, securitySchemes));
      } catch (e) {
        return Promise.reject(e);
      }
    });

    try {
      const results = await Promise.all(promises);
      const authFailed = results.filter(b => !b).length > 0;
      if (authFailed) throw validationError(401, path, 'unauthorized');
      else next();
    } catch (e) {
      const message = (e && e.message) || 'unauthorized';
      const err = validationError(401, path, message);
      next(err);
    }
  };
}

class AuthValidator {
  private req: OpenApiRequest;
  private scheme;
  private path: string;
  constructor(req: OpenApiRequest, scheme) {
    this.req = req;
    this.scheme = scheme;
    this.path = req.openapi.openApiRoute;
  }

  validate() {
    this.validateApiKey();
    this.validateHttp();
    this.validateOauth2();
    this.validateOpenID();
  }

  private validateOauth2() {
    // TODO get scopes from auth validator
    const { req, scheme, path } = this;
    if (['oauth2'].includes(scheme.type.toLowerCase())) {
      // TODO handle oauth2
    }
  }

  private validateOpenID() {
    // TODO get scopes from auth validator
    const { req, scheme, path } = this;
    if (['openIdConnect'].includes(scheme.type.toLowerCase())) {
      // TODO handle openidconnect
    }
  }

  private validateHttp() {
    const { req, scheme, path } = this;
    if (['http'].includes(scheme.type.toLowerCase())) {
      const authHeader =
        req.headers['authorization'] &&
        req.headers['authorization'].toLowerCase();

      if (!authHeader) {
        throw validationError(401, path, `Authorization header required.`);
      }

      const type = scheme.scheme && scheme.scheme.toLowerCase();
      if (type === 'bearer' && !authHeader.includes('bearer')) {
        throw validationError(
          401,
          path,
          `Authorization header with scheme 'Bearer' required.`,
        );
      }

      if (type === 'basic' && !authHeader.includes('basic')) {
        throw validationError(
          401,
          path,
          `Authorization header with scheme 'Basic' required.`,
        );
      }
    }
  }

  private validateApiKey() {
    const { req, scheme, path } = this;
    if (scheme.type === 'apiKey') {
      if (scheme.in === 'header') {
        if (!req.headers[scheme.name.toLowerCase()]) {
          throw validationError(401, path, `'${scheme.name}' header required.`);
        }
      } else if (scheme.in === 'query') {
        if (!req.headers[scheme.name]) {
          throw validationError(
            401,
            path,
            `query parameter '${scheme.name}' required.`,
          );
        }
      }
      // TODO scheme in cookie
    }
  }
}
