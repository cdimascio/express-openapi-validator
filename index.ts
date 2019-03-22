import * as _ from 'lodash';
import { ExpressApp } from 'express';
import OpenAPIFramework, {
  OpenAPIFrameworkArgs,
  OpenAPIFrameworkConstructorArgs,
} from './fw';
import OpenAPIRequestValidator from 'openapi-request-validator';
import OpenAPIRequestCoercer from 'openapi-request-coercer';
import { OpenAPIFrameworkAPIContext } from './fw/types';
import { handleYaml, loadSpecFile } from './fw/util';
import { methodNotAllowed, notFoundError } from './errors';

// import { OpenAPIResponseValidatorError } from 'openapi-response-validator';
// import { SecurityHandlers } from 'openapi-security-handler';
// import { OpenAPI, OpenAPIV3 } from 'openapi-types';

export interface ErrorResponse {
  statusCode: number;
  error: any;
}
export interface OpenApiMiddlewareOpts extends OpenAPIFrameworkArgs {
  name: string;
  apiSpecPath: string;
  errorTransform?: (validationResult: any) => ErrorResponse;
}

export function OpenApiMiddleware(opts: OpenApiMiddlewareOpts) {
  if (!opts.apiSpecPath) throw new Error('apiSpecPath required');
  const apiContents = loadSpecFile(opts.apiSpecPath);
  if (!apiContents)
    throw new Error(`spec could not be read at ${opts.apiSpecPath}`);

  opts.enableObjectCoercion = opts.enableObjectCoercion || true;
  opts.name = opts.name || 'express-middleware-openapi';

  const apiDoc = handleYaml(apiContents);
  const framework = createFramework({ ...opts, apiDoc });

  this.opts = opts;
  this.apiDoc = framework.apiDoc;
  this.routes = buildRoutes(framework);
  this.routeMap = this.routes.reduce((a, r) => {
    const routeMethod = a[r.expressRoute];
    if (routeMethod) {
      routeMethod[r.method] = r.schema;
    } else {
      a[r.expressRoute] = { [r.method]: r.schema };
    }
    return a;
  }, {});
}

OpenApiMiddleware.prototype.install = function(app: ExpressApp) {
  const noPathParamRoutes = [];
  const pathParms = [];
  for (const route of this.routes) {
    if (route.pathParams.length === 0) {
      noPathParamRoutes.push(route.expressRoute);
    } else {
      pathParms.push(...route.pathParams);
    }
  }

  // install param on routes with paths
  for (const p of _.uniq(pathParms)) {
    app.param(p, this._middleware());
  }
  // install use on routes without paths
  app.all(_.uniq(noPathParamRoutes), this._middleware());
};

OpenApiMiddleware.prototype._middleware = function() {
  return (req, res, next) => {
    const { path: rpath, method, route } = req;
    var path = Array.isArray(route.path)
      ? route.path.find(r => r === rpath)
      : route.path || rpath;
    if (path && method) {
      // TODO add option to enable undocumented routes to pass through without 404
      const documentedRoute = this.routeMap[path];
      if (!documentedRoute) {
        const { statusCode, error } = this._transformValidationResult(
          notFoundError(path)
        );
        return res.status(statusCode).json(error);
      }

      // TODO add option to enable undocumented methods to pass through
      const schema = documentedRoute[method.toUpperCase()];
      if (!schema) {
        const { statusCode, error } = this._transformValidationResult(
          methodNotAllowed(path, method)
        );
        return res.status(statusCode).json(error);
      }

      // TODO coercer and request validator fail on null parameters
      if (!schema.parameters) {
        schema.parameters = [];
      }

      // Check if route is in map (throw error - option to ignore)
      if (this.opts.enableObjectCoercion) {
        // this modifies the request object with coerced types
        new OpenAPIRequestCoercer({
          loggingKey: this.opts.name,
          enableObjectCoercion: this.opts.enableObjectCoercion,
          parameters: schema.parameters,
        }).coerce(req);
      }

      const validationResult = new OpenAPIRequestValidator({
        errorTransformer: this.errorTransformer,
        parameters: schema.parameters || [],
        requestBody: schema.requestBody,
        // schemas: this.apiDoc.definitions, // v2
        componentSchemas: this.apiDoc.components // v3
          ? this.apiDoc.components.schemas
          : undefined,
      }).validate(req);

      if (validationResult && validationResult.errors.length > 0) {
        const { statusCode, error } = this._transformValidationResult(
          validationResult
        );
        return res.status(statusCode).json(error);
      }
    }
    next();
  };
};

OpenApiMiddleware.prototype._transformValidationResult = function(
  validationResult
) {
  if (validationResult && validationResult.errors.length > 0) {
    const transform =
      this.opts.errorTransform ||
      (v => ({
        statusCode: v.status,
        error: { errors: v.errors },
      }));

    return transform(validationResult);
  }
};

function toExpressParams(part) {
  return part.replace(/\{([^}]+)}/g, ':$1');
}

function createFramework(args: OpenApiMiddlewareOpts): OpenAPIFramework {
  const frameworkArgs: OpenAPIFrameworkConstructorArgs = {
    featureType: 'middleware',
    name: args.name,
    ...(args as OpenAPIFrameworkArgs),
  };

  console.log(frameworkArgs);
  const framework = new OpenAPIFramework(frameworkArgs);
  return framework;
}

function buildRoutes(framework) {
  const routes = [];
  framework.initialize({
    visitApi(ctx: OpenAPIFrameworkAPIContext) {
      const apiDoc = ctx.getApiDoc();
      for (const bp of ctx.basePaths) {
        for (const [path, methods] of Object.entries(apiDoc.paths)) {
          for (const [method, schema] of Object.entries(methods)) {
            const pathParams = new Set();
            for (const param of schema.parameters || []) {
              if (param.in === 'path') {
                pathParams.add(param.name);
              }
            }
            const openApiRoute = `${bp.path}${path}`;
            const expressRoute = openApiRoute
              .split('/')
              .map(toExpressParams)
              .join('/');
            routes.push({
              expressRoute,
              openApiRoute,
              method: method.toUpperCase(),
              pathParams: Array.from(pathParams),
              schema,
            });
          }
        }
      }
    },
  });
  return routes;
}
