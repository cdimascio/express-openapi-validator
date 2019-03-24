import * as _ from 'lodash';
import { ExpressApp } from 'express';
import { OpenAPIFrameworkArgs } from './framework';
import { OpenApiContext } from './openapi.context';
import * as middlewares from './middlewares';

export interface ErrorResponse {
  statusCode: number;
  error: any;
}

export interface OpenApiMiddlewareOpts extends OpenAPIFrameworkArgs {
  name: string;
  apiSpecPath: string;
  errorTransformer?: (validationResult: any) => ErrorResponse;
}

export function OpenApiMiddleware(opts: OpenApiMiddlewareOpts) {
  if (!opts.apiSpecPath) throw new Error('apiSpecPath required');
  opts.enableObjectCoercion = opts.enableObjectCoercion || true;
  opts.name = opts.name || 'express-middleware-openapi';

  const contextOpts = { ...opts, apiDoc: opts.apiSpecPath };
  const openApiContext = new OpenApiContext(contextOpts);

  this.opts = opts;
  this.apiDoc = openApiContext.apiDoc;
  this.expressRouteMap = openApiContext.expressRouteMap;
  this.context = openApiContext;
}

OpenApiMiddleware.prototype.install = function(app: ExpressApp) {
  const pathParams = [];
  for (const route of this.context.routes) {
    if (route.pathParams.length > 0) {
      pathParams.push(...route.pathParams);
    }
  }

  // install param on routes with paths
  for (const p of _.uniq(pathParams)) {
    app.param(p, (req, res, next, value, name) => {
      console.log(name, value);
      if (req.openapi.pathParams) {
        // override path params
        req.params[name] = req.openapi.pathParams[name] || req.params[name];
      }
      next();
    });
  }
  app.use(
    middlewares.applyOpenApiMetadata(this.context),
    middlewares.validateRequest({
      apiDoc: this.apiDoc,
      loggingKey: this.opts.name,
      enableObjectCoercion: this.opts.enableObjectCoercion,
      errorTransformer: this.opts.errorTransformer,
    })
  );
};
