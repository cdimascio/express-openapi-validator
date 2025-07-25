import {
  HttpError,
  InternalServerError,
  OpenApiRequest,
  OpenApiRequestHandler,
  OpenApiRequestMetadata,
  OpenAPIV3,
  SecurityHandlers,
} from '../framework/types';

const defaultSecurityHandler = (
  req: Express.Request,
  scopes: string[],
  schema: OpenAPIV3.SecuritySchemeObject,
) => true;

type SecuritySchemesMap = {
  [key: string]: OpenAPIV3.ReferenceObject | OpenAPIV3.SecuritySchemeObject;
};

interface SecurityHandlerResult {
  success: boolean;
  status?: number;
  error?: string;
}

function extractErrorsFromResults(results: (SecurityHandlerResult | SecurityHandlerResult[])[]) {
  return results.map(result => {
    if (Array.isArray(result)) {
      return result.map(it => it).filter(it => !it.success);
    }
    return [result].filter(it => !it.success);
  }).flatMap(it => [...it]);
}

function didAllSecurityRequirementsPass(results: SecurityHandlerResult[]) {
  return results.every(it => it.success);
}

function didOneSchemaPassValidation(results: (SecurityHandlerResult | SecurityHandlerResult[])[]) {
  return results.some(result => Array.isArray(result) ? didAllSecurityRequirementsPass(result) : result.success);
}

export function security(
  apiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1,
  securityHandlers: SecurityHandlers,
): OpenApiRequestHandler {
  return async (req, res, next) => {
    // TODO move the following 3 check conditions to a dedicated upstream middleware
    if (!req.openapi) {
      // this path was not found in open api and
      // this path is not defined under an openapi base path
      // skip it
      return next();
    }

    const openapi = <OpenApiRequestMetadata>req.openapi;
    // use the local security object or fallback to api doc's security or undefined
    const securities: OpenAPIV3.SecurityRequirementObject[] =
      openapi.schema.security ?? apiDoc.security;

    const path: string = openapi.openApiRoute;

    if (!path || !Array.isArray(securities) || securities.length === 0) {
      return next();
    }

    const securitySchemes = apiDoc.components?.securitySchemes;

    if (!securitySchemes) {
      const message = `security referenced at path ${path}, but not defined in 'components.securitySchemes'`;
      return next(new InternalServerError({ path: path, message: message }));
    }

    try {
      const results = await new SecuritySchemes(
        securitySchemes,
        securityHandlers,
        securities,
      ).executeHandlers(req);

      // TODO handle AND'd and OR'd security
      // This assumes OR only! i.e. at least one security passed authentication
      const success = didOneSchemaPassValidation(results);

      if (success) {
        next();
      } else {
        const errors = extractErrorsFromResults(results);
        throw errors[0];
      }
    } catch (e) {
      const message = e?.error?.message || 'unauthorized';
      const err = HttpError.create({
        status: e.status,
        path: path,
        message: message,
      });
      /*const err =
        e.status == 500
          ? new InternalServerError({ path: path, message: message })
          : e.status == 403
          ? new Forbidden({ path: path, message: message })
          : new Unauthorized({ path: path, message: message });*/
      next(err);
    }
  };
}

class SecuritySchemes {
  private securitySchemes: SecuritySchemesMap;
  private securityHandlers: SecurityHandlers;
  private securities: OpenAPIV3.SecurityRequirementObject[];

  constructor(
    securitySchemes: SecuritySchemesMap,
    securityHandlers: SecurityHandlers,
    securities: OpenAPIV3.SecurityRequirementObject[],
  ) {
    this.securitySchemes = securitySchemes;
    this.securityHandlers = securityHandlers;
    this.securities = securities;
  }

  public async executeHandlers(
    req: OpenApiRequest,
  ): Promise<(SecurityHandlerResult | SecurityHandlerResult[])[]> {
    // use a fallback handler if security handlers is not specified
    // This means if security handlers is specified, the user must define
    // all security handlers
    const fallbackHandler = !this.securityHandlers
      ? defaultSecurityHandler
      : null;
    const promises = this.securities.map(async (s) => {
      if (Util.isEmptyObject(s)) {
        // anonymous security
        return [{ success: true }];
      }
      return Promise.all(
        Object.keys(s).map(async (securityKey) => {

          try {
            const scheme = this.securitySchemes[securityKey];
            const handler = this.securityHandlers?.[securityKey] ?? fallbackHandler;
            const scopesTmp = s[securityKey];
            const scopes = Array.isArray(scopesTmp) ? scopesTmp : [];
            if (!scheme) {
              const message = `components.securitySchemes.${securityKey} does not exist`;
              throw new InternalServerError({ message });
            }
            if (!scheme.hasOwnProperty('type')) {
              const message = `components.securitySchemes.${securityKey} must have property 'type'`;
              throw new InternalServerError({ message });
            }
            if (!handler) {
              const message = `a security handler for '${securityKey}' does not exist`;
              throw new InternalServerError({ message });
            }
            new AuthValidator(req, scheme, scopes).validate();
            // expected handler results are:
            // - throw exception,
            // - return true,
            // - return Promise<true>,
            // - return false,
            // - return Promise<false>
            // everything else should be treated as false
            const securityScheme = <OpenAPIV3.SecuritySchemeObject>scheme;
            const success = await handler(req, scopes, securityScheme);
            if (success === true) {
              return { success };
            } else {
              throw Error();
            }
          } catch (e) {
            return {
              success: false,
              status: e.status ?? 401,
              error: e,
            };
          }
        }),
      );
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
    const openapi = <OpenApiRequestMetadata>req.openapi;
    this.req = req;
    this.scheme = scheme;
    this.path = openapi.openApiRoute;
    this.scopes = scopes;
  }

  public validate(): void {
    this.validateApiKey();
    this.validateHttp();
    this.validateOauth2();
    this.validateOpenID();
  }

  private validateOauth2(): void {
    const { req, scheme, path } = this;
    if (['oauth2'].includes(scheme.type.toLowerCase())) {
      // TODO oauth2 validation
    }
  }

  private validateOpenID(): void {
    const { req, scheme, path } = this;
    if (['openIdConnect'].includes(scheme.type.toLowerCase())) {
      // TODO openidconnect validation
    }
  }

  private validateHttp(): void {
    const { req, scheme, path } = this;
    if (['http'].includes(scheme.type.toLowerCase())) {
      const authHeader =
        req.headers['authorization'] &&
        req.headers['authorization'].toLowerCase();
      // req.cookies will be `undefined` without `cookie-parser` middleware
      const authCookie =
        req.cookies?.[scheme.name] || req.signedCookies?.[scheme.name];
  
      const type = scheme.scheme && scheme.scheme.toLowerCase();
      if (type === 'bearer') {
        if (authHeader && !authHeader.includes('bearer')) {
          throw Error(`Authorization header with scheme 'Bearer' required`);
        }
        
        if (!authHeader && !authCookie) {
          if (scheme.in === 'cookie') {
            throw Error(`Cookie authentication required`);
          } else {
            throw Error(`Authorization header required`);
          }
        }
      }
  
      if (type === 'basic') {
        if (!authHeader) {
          throw Error(`Authorization header required`);
        }
        if (!authHeader.includes('basic')) {
          throw Error(`Authorization header with scheme 'Basic' required`);
        }
      }
    }
  }

  private validateApiKey(): void {
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
      } else if (scheme.in === 'cookie') {
        if (!req.cookies[scheme.name] && !req.signedCookies?.[scheme.name]) {
          throw Error(`cookie '${scheme.name}' required`);
        }
      }
    }
  }
}

class Util {
  static isEmptyObject(o: {}): boolean {
    return (
      typeof o === 'object' &&
      Object.entries(o).length === 0 &&
      o.constructor === Object
    );
  }
}
