import { SecurityHandlers } from '../index';
import { OpenAPIV3, OpenApiRequest } from '../framework/types';
import { validationError } from './util';
import { OpenApiContext } from '../framework/openapi.context';

const defaultSecurityHandler = (
  req: Express.Request,
  scopes: string[],
  schema: OpenAPIV3.SecuritySchemeObject,
) => true;

interface SecurityHandlerResult {
  success: boolean;
  status?: number;
  error?: string;
}
export function security(
  context: OpenApiContext,
  securityHandlers: SecurityHandlers,
) {
  return async (req, res, next) => {
    // TODO move the folllowing 3 check conditions to a dedicated upstream middleware
    if (!req.openapi) {
      // this path was not found in open api and
      // this path is not defined under an openapi base path
      // skip it
      return next();
    }

    const expressRoute = req.openapi.expressRoute;
    if (!expressRoute) {
      return next(validationError(404, req.path, 'not found'));
    }

    const pathSchema = req.openapi.schema;
    if (!pathSchema) {
      // add openapi metadata to make this case more clear
      // its not obvious that missig schema means methodNotAllowed
      return next(validationError(405, req.path, `${req.method} method not allowed`));
    }

    // use the local security object or fallbac to api doc's security or undefined
    const securities: OpenAPIV3.SecurityRequirementObject[] =
      req.openapi.schema.security || context.apiDoc.security;

    const path: string = req.openapi.openApiRoute;

    if (!path || !Array.isArray(securities) || securities.length === 0) {
      return next();
    }

    const securitySchemes =
      context.apiDoc.components && context.apiDoc.components.securitySchemes;

    if (!securitySchemes) {
      const message = `security referenced at path ${path}, but not defined in 'components.securitySchemes'`;
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
      let success = false;
      for (var r of results) {
        if (r.success) {
          success = true;
          break;
        } else if (!firstError) {
          firstError = r;
        }
      }
      if (success) next();
      else throw firstError;
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

  async executeHandlers(req: OpenApiRequest): Promise<SecurityHandlerResult[]> {
    // use a fallback handler if security handlers is not specified
    // This means if security handlers is specified, the user must define
    // all security handlers
    const fallbackHandler = !this.securityHandlers
      ? defaultSecurityHandler
      : null;

    const promises = this.securities.map(async s => {
      try {
        if (Util.isEmptyObject(s)) {
          // anonumous security
          return { success: true };
        }
        const securityKey = Object.keys(s)[0];
        const scheme: any = this.securitySchemes[securityKey];
        const handler =
          (this.securityHandlers && this.securityHandlers[securityKey]) ||
          fallbackHandler;
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
          const message = `a security handler for '${securityKey}' does not exist`;
          throw { status: 500, message };
        }

        new AuthValidator(req, scheme, scopes).validate();

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
  private scopes: string[];
  constructor(req: OpenApiRequest, scheme, scopes: string[] = []) {
    this.req = req;
    this.scheme = scheme;
    this.path = req.openapi.openApiRoute;
    this.scopes = scopes;
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
        throw Error(`Authorization header required`);
      }

      const type = scheme.scheme && scheme.scheme.toLowerCase();
      if (type === 'bearer' && !authHeader.includes('bearer')) {
        throw Error(`Authorization header with scheme 'Bearer' required`);
      }

      if (type === 'basic' && !authHeader.includes('basic')) {
        throw Error(`Authorization header with scheme 'Basic' required`);
      }

      this.dissallowScopes();
    }
  }

  private validateApiKey() {
    const { req, scheme, path } = this;
    if (scheme.type === 'apiKey') {
      if (scheme.in === 'header') {
        if (!req.headers[scheme.name.toLowerCase()]) {
          throw Error(`'${scheme.name}' header required`);
        }
      } else if (scheme.in === 'query') {
        if (!req.query[scheme.name]) {
          throw Error(`query parameter '${scheme.name}' required`);
        }
      }
      // TODO scheme in cookie

      this.dissallowScopes();
    }
  }

  private dissallowScopes() {
    if (this.scopes.length > 0) {
      // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#security-requirement-object
      throw {
        status: 500,
        message: "scopes array must be empty for security type 'http'",
      };
    }
  }
}

class Util {
  static isEmptyObject(o: Object) {
    return (
      typeof o === 'object' &&
      Object.entries(o).length === 0 &&
      o.constructor === Object
    );
  }
}
