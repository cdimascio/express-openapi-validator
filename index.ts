import { Application, ErrorRequestHandler, RequestHandler } from 'express';
import * as fs from 'fs';
import * as path from 'path';
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

export function OpenApiMiddleware(opts: OpenApiMiddlewareOpts) {
  if (!opts.apiSpecPath) throw new Error('apiSpecPath required');
  const apiContents = loadSpecFile(opts.apiSpecPath);
  if (!apiContents)
    throw new Error(`spec could not be read at ${opts.apiSpecPath}`);
  const apiDoc = handleYaml(apiContents);
  const framework = createFramework({ ...opts, apiDoc });
  this.opts = opts;
  this.opts.name = this.opts.name || 'express-middleware-openapi';
  this.routeMap = buildRouteMap(framework);

  console.log(JSON.stringify(framework.apiDoc, null, 4), framework.basePaths);
  console.log(opts);
}

OpenApiMiddleware.prototype.middleware = function() {
  return (req, res, next) => {
    const { path, method } = req;
    if (path && method) {
      const schema = this.routeMap[path][method.toUpperCase()];
      console.log('found schema', schema);

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
        ...schema,
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

function buildRouteMap(framework) {
  const routeMap = {};
  framework.initialize({
    visitApi(ctx: OpenAPIFrameworkAPIContext) {
      const apiDoc = ctx.getApiDoc();
      for (const bp of ctx.basePaths) {
        for (const path of Object.keys(apiDoc.paths)) {
          for (const [method, schema] of Object.entries(apiDoc.paths[path])) {
            const pathKey = `${bp.path}${path}`;
            const methodKey = method.toUpperCase();
            const routeMethod = routeMap[pathKey];
            if (routeMethod) {
              // add a new method
              routeMethod[methodKey] = schema;
            } else {
              // create the path key and add first method
              routeMap[pathKey] = { [methodKey]: schema };
            }
          }
        }
      }
    },
  });
  return routeMap;
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
