import * as _ from 'lodash';
import {
  Application,
  ErrorRequestHandler,
  RequestHandler,
  ExpressApp,
} from 'express';
import * as fs from 'fs';
import * as path from 'path';
const util = require('util');
const jsYaml = require('js-yaml');
import OpenAPIFramework, {
  BasePath,
  OpenAPIFrameworkArgs,
  OpenAPIFrameworkConstructorArgs,
} from './fw';
import OpenAPISchemaValidator from 'openapi-schema-validator';
import OpenAPIRequestValidator, {
  OpenAPIRequestValidatorError,
} from 'openapi-request-validator';
import OpenAPIRequestCoercer from 'openapi-request-coercer';
import { OpenAPIResponseValidatorError } from 'openapi-response-validator';
import { SecurityHandlers } from 'openapi-security-handler';
import { OpenAPI, OpenAPIV3 } from 'openapi-types';
import {
  OpenAPIFrameworkVisitor,
  OpenAPIFrameworkAPIContext,
} from './fw/types';
// import BasePath from './fw/base.path';

export interface OpenApiMiddlewareOpts extends OpenAPIFrameworkArgs {
  name: string;
  apiSpecPath: string;
}

export function OpenApiMiddleware(
  app: ExpressApp,
  opts: OpenApiMiddlewareOpts
) {
  if (!opts.apiSpecPath) throw new Error('apiSpecPath required');
  const apiContents = loadSpecFile(opts.apiSpecPath);
  if (!apiContents)
    throw new Error(`spec could not be read at ${opts.apiSpecPath}`);

  const apiDoc = handleYaml(apiContents);
  const framework = createFramework({ ...opts, apiDoc });
  this.app = app;
  this.apiDoc = framework.apiDoc;
  this.opts = opts;
  this.opts.name = this.opts.name || 'express-middleware-openapi';
  // this.routeMap = buildRouteMap(framework);
  // this.pathParams = buildPathParamsList(framework);
  this.routes = buildRoutes(framework);
  // this.routeMap = _.keyBy(this.routes, r => r.expressRoute);
  this.routeMap = this.routes.reduce((a, r) => {
    const routeMethod = a[r.expressRoute];
    if (routeMethod) {
      routeMethod[r.method] = r.schema;
    } else {
      a[r.expressRoute] = { [r.method]: r.schema };
    }
    return a;
  }, {});
  // registerPathParams(app, pathParams);

  // console.log(JSON.stringify(framework.apiDoc, null, 4), framework.basePaths);
  console.log(opts);
}

OpenApiMiddleware.prototype.install = function() {
  // install param on routes with paths
  const noPathParamRoutes = [];
  const pathParms = [];
  for (const route of this.routes) {
    if (route.pathParams.length === 0) {
      noPathParamRoutes.push(route.expressRoute);
    } else {
      pathParms.push(...route.pathParams);
    }
  }
  for (const p of _.uniq(pathParms)) {
    this.app.param(p, this.middleware()); //pathParamMiddleware);
  }
  // install use on routes without paths
  this.app.all(_.uniq(noPathParamRoutes), this.middleware());
  // this.app.use(_.uniq(noPathParamRoutes), this.middleware());
};

OpenApiMiddleware.prototype.middleware = function() {
  return (req, res, next) => {
    const { path: rpath, method, route } = req;
    const path = route.path || rpath;
    if (path && method) {
      // TODO add option to enable undocumented routes to pass through without 404
      const documentedRoute = this.routeMap[path];
      console.log('------doc route', path, documentedRoute);
      // next();
      if (!documentedRoute) return res.status(404).end();

      // TODO add option to enable undocumented methods to pass through
      const schema = documentedRoute[method.toUpperCase()];
      if (!schema) return res.status(415).end();

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
        const { errors, status } = validationResult;
        console.log('----provide to custom error handler', errors, status);
        return res.status(status).json(errors);
      }
    }
    next();
  };
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

// function buildRouteMap(framework) {
//   const routeMap = {};
//   framework.initialize({
//     visitApi(ctx: OpenAPIFrameworkAPIContext) {
//       const apiDoc = ctx.getApiDoc();
//       for (const bp of ctx.basePaths) {
//         for (const path of Object.keys(apiDoc.paths)) {
//           for (const [method, schema] of Object.entries(apiDoc.paths[path])) {
//             const pathKey = `${bp.path}${path}`;
//             const methodKey = method.toUpperCase();
//             const routeMethod = routeMap[pathKey];
//             console.log(
//               '=======params path=====',
//               pathKey,
//               pathKey
//                 .split('/')
//                 .map(toExpressParams)
//                 .join('/')
//             );
//             if (routeMethod) {
//               // add a new method
//               routeMethod[methodKey] = schema;
//             } else {
//               // create the path key and add first method
//               routeMap[pathKey] = { [methodKey]: schema };
//             }
//           }
//         }
//       }
//     },
//   });
//   return routeMap;
// }

function registerPathParams(app, pathParams) {
  for (const p of pathParams) {
    // app.param(p, pathParamMiddleware);
    app.param(p, pathParamMiddleware);
  }
}

function pathParamMiddleware(req, res, next, value, name) {
  console.log('---path param middleware---');
  if (req.pathParams) {
    // Path parameters have already been parsed by
    req.params[name] = req.pathParams[name] || req.params[name];
  }

  next();
}

// /**
//  * Parses all Swagger path parameters and sets `req.pathParams`.
//  * NOTE: This middleware cannot set `req.params`.  That requires special path-param middleware (see above)
//  */
// function parsePathParams(req, res, next) {
//   // if (util.isSwaggerRequest(req)) {
//   const swaggerParamRegExp = /\{([^/}]+)}/g;
//   req.pathParams = {};

//   if (req.swagger.pathName.indexOf('{') >= 0) {
//     // Convert the Swagger path to a RegExp
//     let paramNames = [];
//     let pathPattern = req.swagger.pathName.replace(
//       swaggerParamRegExp,
//       (match, paramName) => {
//         paramNames.push(paramName);
//         return '([^\/]+)';
//       }
//     );

//     // Exec the RegExp to get the path param values from the URL
//     let values = new RegExp(pathPattern + '/?$', 'i').exec(req.path);

//     // Parse each path param
//     for (let i = 1; i < values.length; i++) {
//       let paramName = paramNames[i - 1];
//       let paramValue = decodeURIComponent(values[i]);
//       let param = _.find(req.swagger.params, { in: 'path', name: paramName });

//       console.log('    Parsing the "%s" path parameter', paramName);
//       req.pathParams[paramName] = paramParser.parseParameter(
//         param,
//         paramValue,
//         param
//       );
//     }
//   }
//   // }

//   next();
// }

function buildPathParamsList(framework) {
  const pathParams = new Set();
  const apiDoc = framework.apiDoc;
  for (const methods of Object.values(apiDoc.paths)) {
    for (const schema of Object.values(methods)) {
      for (const param of schema.parameters || []) {
        if (param.in === 'path') {
          pathParams.add(param.name);
        }
      }
    }
  }
  return Array.from(pathParams);
}

// function buildRouteList(framework) {
//   const apiDoc = framework.apiDoc;
//   const routes = [];
//   for (const [path, methods] of Object.entries(apiDoc.paths)) {
//     for (const [method, schema] of Object.entries(methods)) {
//       const pathParams = new Set();
//       for (const param of schema.parameters || []) {
//         if (param.in === 'path') {
//           pathParams.add(param.name);
//         }
//       }
//       routes.push({
//         route: path,
//         method,
//         pathParams,
//       });
//     }
//   }
//   return routes;
// }

function buildRoutes(framework) {
  // const routeMap = {};
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

  //       for (const path of Object.keys(apiDoc.paths)) {
  //         for (const [method, schema] of Object.entries(apiDoc.paths[path])) {
  //           const pathKey = `${bp.path}${path}`;
  //           const methodKey = method.toUpperCase();
  //           const routeMethod = routeMap[pathKey];
  //           console.log(
  //             '=======params path=====',
  //             pathKey,
  //             pathKey
  //               .split('/')
  //               .map(toExpressParams)
  //               .join('/')
  //           );
  //           if (routeMethod) {
  //             // add a new method
  //             routeMethod[methodKey] = schema;
  //           } else {
  //             // create the path key and add first method
  //             routeMap[pathKey] = { [methodKey]: schema };
  //           }
  //         }
  //       }
  //     }
  //   },
  // });
  // return routeMap;
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
