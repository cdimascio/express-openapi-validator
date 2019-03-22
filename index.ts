import * as _ from 'lodash';
import {
  // Application,
  // ErrorRequestHandler,
  // RequestHandler,
  ExpressApp,
} from 'express';
import * as fs from 'fs';
import * as path from 'path';
// const util = require('util');
const jsYaml = require('js-yaml');
import OpenAPIFramework, {
  BasePath,
  OpenAPIFrameworkArgs,
  OpenAPIFrameworkConstructorArgs,
} from './fw';
// import OpenAPISchemaValidator from 'openapi-schema-validator';
import OpenAPIRequestValidator from 'openapi-request-validator'; // OpenAPIRequestValidatorError,
import OpenAPIRequestCoercer from 'openapi-request-coercer';
// import { OpenAPIResponseValidatorError } from 'openapi-response-validator';
// import { SecurityHandlers } from 'openapi-security-handler';
// import { OpenAPI, OpenAPIV3 } from 'openapi-types';
import {
  OpenAPIFrameworkVisitor,
  OpenAPIFrameworkAPIContext,
} from './fw/types';
import { ValidationError } from 'ajv';

export interface ErrorResponse {
  statusCode: number;
  error: any;
}
export interface OpenApiMiddlewareOpts extends OpenAPIFrameworkArgs {
  name: string;
  apiSpecPath: string;
  errorTransform?: (validationResult: any) => ErrorResponse;
}

const methodNotAllowed = (path, method) => ({
  status: 405,
  errors: [
    {
      path,
      message: `${method} method not allowed`,
    },
  ],
});

const notFoundError = path => ({
  status: 404,
  errors: [
    {
      path,
      message: 'Not found',
    },
  ],
});

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

  // console.log(JSON.stringify(framework.apiDoc, null, 4), framework.basePaths);
  console.log(opts);
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
    app.param(p, this.middleware()); //pathParamMiddleware);
  }
  // install use on routes without paths
  app.all(_.uniq(noPathParamRoutes), this.middleware());
  // app.use(_.uniq(noPathParamRoutes), this.middleware());
};

OpenApiMiddleware.prototype.middleware = function() {
  return (req, res, next) => {
    const { path: rpath, method, route } = req;
    var path = Array.isArray(route.path)
      ? route.path.find(() => rpath) || req.path
      : route.path || rpath || req.path;
    if (path && method) {
      // TODO add option to enable undocumented routes to pass through without 404
      const documentedRoute = this.routeMap[path];
      if (!documentedRoute) {
        const { statusCode, error } = this._transformValidationResult(
          notFoundError(path)
        );
        return res.status(statusCode).json(error);
        // return res.status(404).end();
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
        // const { errors, status } = validationResult;
        // const transform =
        //   this.opts.errorTransform ||
        //   (v => ({
        //     statusCode: v.status,
        //     error: { errors: v.errors },
        //   }));

        // const { statusCode, error } = transform(validationResult);
        // return res.status(statusCode).json(error);
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

function loadSpecFile(filePath) {
  if (typeof filePath === 'string') {
    const absolutePath = path.resolve(process.cwd(), filePath);
    if (fs.existsSync(absolutePath)) {
      try {
        // json or module
        return require(absolutePath);
      } catch (e) {
        return fs.readFileSync(absolutePath, 'utf8');
      }
    }
  }
  return null;
}

function handleYaml(apiDoc) {
  return typeof apiDoc === 'string'
    ? jsYaml.safeLoad(apiDoc, { json: true })
    : apiDoc;
}
