import * as _ from 'lodash';
import { Application, Response, NextFunction } from 'express';
import { OpenAPIFrameworkArgs } from './framework';
import { OpenApiContext } from './openapi.context';
import * as middlewares from './middlewares';
import ono from 'ono';
import { OpenApiRequest } from './framework/types';

const loggingKey = 'express-openapi-validator';

export interface OpenApiValidatorOpts {
  apiSpecPath: string;
}

export function OpenApiValidator(options: OpenApiValidatorOpts) {
  if (!options.apiSpecPath) throw ono('apiSpecPath required');

  const openApiContext = new OpenApiContext({ apiDoc: options.apiSpecPath });

  const opts: OpenAPIFrameworkArgs = {
    enableObjectCoercion: true,
    apiDoc: openApiContext.apiDoc,
  };
  this.opts = opts;
  this.context = openApiContext;
}

OpenApiValidator.prototype.install = function(app: Application) {
  const pathParams = [];
  for (const route of this.context.routes) {
    if (route.pathParams.length > 0) {
      pathParams.push(...route.pathParams);
    }
  }

  // install param on routes with paths
  for (const p of _.uniq(pathParams)) {
    app.param(p, (req: OpenApiRequest, res, next, value, name) => {
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
      apiDoc: this.context.apiDoc,
      loggingKey,
      enableObjectCoercion: this.opts.enableObjectCoercion,
    }),
  );
};
