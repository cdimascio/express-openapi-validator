import { SecurityHandlers } from '../index';
import { OpenAPIV3, OpenApiRequest } from '../framework/types';
import { validationError } from './util';
import { OpenApiContext } from '../framework/openapi.context';

interface SecurityHandlerResult {
  success: boolean;
  status: number;
  error: string;
}
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

    const securities = <OpenAPIV3.SecuritySchemeObject>(
      req.openapi.schema.security
    );

    const path: string = req.openapi.openApiRoute;

    if (!path || !Array.isArray(securities)) {
      return next();
    }

    const securitySchemes =
      context.apiDoc.components && context.apiDoc.components.securitySchemes;

    if (!securitySchemes) {
      const message = `security referenced at path ${path}, but not defined in components.securitySchemes`;
      return next(validationError(500, path, message));
    }

    try {
      const results = await new SecuritySchemes(
        securitySchemes,
        securityHandlers,
        securities,
      ).executeHandlers(req);

      // TODO handle AND'd and OR'd security
      // This assumes OR only! i.e. at least one security passed authentication
      let firstError: SecurityHandlerResult = null;
      for (var r of results) {
        if (!r.success) {
          firstError = r;
          break;
        }
      }
      if (firstError) throw firstError;
      else next();
    } catch (e) {
      const message = (e && e.error && e.error.message) || 'unauthorized';
      const err = validationError(e.status, path, message);
      next(err);
    }
  };
}

class SecuritySchemes {
  private securitySchemes;
  private securityHandlers: SecurityHandlers;
  private securities;
  constructor(securitySchemes, securityHandlers: SecurityHandlers, securities) {
    this.securitySchemes = securitySchemes;
    this.securityHandlers = securityHandlers;
    this.securities = securities;
  }

  executeHandlers(req: OpenApiRequest): Promise<SecurityHandlerResult[]> {
    const promises = this.securities.map(async s => {
      try {
        const securityKey = Object.keys(s)[0];
        const scheme: any = this.securitySchemes[securityKey];
        const handler = this.securityHandlers[securityKey];
        const scopesTmp = s[securityKey];
        const scopes = Array.isArray(scopesTmp) ? scopesTmp : [];

        if (!scheme) {
          const message = `components.securitySchemes.${securityKey} does not exist`;
          throw { status: 500, message };
        }
        if (!scheme.type) {
          const message = `components.securitySchemes.${securityKey} must have property 'type'`;
          throw { status: 500, message };
        }
        if (!handler) {
          const message = `a handler for '${securityKey}' does not exist`;
          throw { status: 500, message };
        }

        new AuthValidator(req, scheme).validate();

        // expected handler results are:
        // - throw exception, 
        // - return true, 
        // - return Promise<true>, 
        // - return false, 
        // - return Promise<false>
        // everything else should be treated as false
        const success = await handler(req, scopes, scheme);
        if (success === true) {
          return { success };
        } else {
          throw Error();
        }
      } catch (e) {
        return {
          success: false,
          status: e.status || 401,
          error: e,
        };
      }
    });
    return Promise.all(promises);
  }
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
    const { req, scheme, path } = this;
    if (['oauth2'].includes(scheme.type.toLowerCase())) {
      // TODO oauth2 validation
    }
  }

  private validateOpenID() {
    const { req, scheme, path } = this;
    if (['openIdConnect'].includes(scheme.type.toLowerCase())) {
      // TODO openidconnect validation
    }
  }

  private validateHttp() {
    const { req, scheme, path } = this;
    if (['http'].includes(scheme.type.toLowerCase())) {
      const authHeader =
        req.headers['authorization'] &&
        req.headers['authorization'].toLowerCase();

      if (!authHeader) {
        throw Error(`Authorization header required.`);
      }

      const type = scheme.scheme && scheme.scheme.toLowerCase();
      if (type === 'bearer' && !authHeader.includes('bearer')) {
        throw Error(`Authorization header with scheme 'Bearer' required.`);
      }

      if (type === 'basic' && !authHeader.includes('basic')) {
        throw Error(`Authorization header with scheme 'Basic' required.`);
      }
    }
  }

  private validateApiKey() {
    const { req, scheme, path } = this;
    if (scheme.type === 'apiKey') {
      if (scheme.in === 'header') {
        if (!req.headers[scheme.name.toLowerCase()]) {
          throw Error(`'${scheme.name}' header required.`);
        }
      } else if (scheme.in === 'query') {
        if (!req.headers[scheme.name]) {
          throw Error(`query parameter '${scheme.name}' required.`);
        }
      }
      // TODO scheme in cookie
    }
  }
}
