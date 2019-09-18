import ono from 'ono';
import * as _ from 'lodash';
import { Application } from 'express';
import { OpenApiContext } from './framework/openapi.context';
import { OpenAPIV3, OpenApiRequest } from './framework/types';
import * as middlewares from './middlewares';

export interface OpenApiValidatorOpts {
  apiSpec: OpenAPIV3.Document | string;
  coerceTypes?: boolean;
  validateResponses?: boolean;
  validateRequests?: boolean;
  multerOpts?: {};
}

export class OpenApiValidator {
  private context: OpenApiContext;
  private options: OpenApiValidatorOpts;

  constructor(options: OpenApiValidatorOpts) {
    if (!options.apiSpec) throw ono('apiSpec required.');
    if (options.coerceTypes == null) options.coerceTypes = true;
    if (options.validateRequests == null) options.validateRequests = true;

    this.options = options;

    const openApiContext = new OpenApiContext({
      apiDoc: options.apiSpec,
    });

    this.context = openApiContext;
  }

  install(app: Application) {
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

    const coerceTypes = this.options.coerceTypes;
    const aoav = new middlewares.RequestValidator(this.context.apiDoc, {
      nullable: true,
      coerceTypes,
      removeAdditional: false,
      useDefaults: true,
    });

    const validateMiddleware = (req, res, next) => {
      return aoav.validate(req, res, next);
    };

    const resOav = new middlewares.ResponseValidator(this.context.apiDoc, {
      coerceTypes,
    });

    const use = [
      middlewares.applyOpenApiMetadata(this.context),
      middlewares.multipart(this.context, this.options.multerOpts),
    ];
    if (this.options.validateRequests) use.push(validateMiddleware);
    if (this.options.validateResponses) use.push(resOav.validate());

    app.use(use);
  }
}
