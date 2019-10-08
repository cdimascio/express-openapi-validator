import ono from 'ono';
import * as _ from 'lodash';
import { Application } from 'express';
import { OpenApiContext } from './framework/openapi.context';
import { OpenAPIV3, OpenApiRequest } from './framework/types';
import * as middlewares from './middlewares';

export interface OpenApiValidatorOpts {
  apiSpec: OpenAPIV3.Document | string;
  validateResponses?: boolean;
  validateRequests?: boolean;
  coerceTypes?: boolean;
  unknownFormats?: string[] | string | boolean;
  multerOpts?: {};
}

export class OpenApiValidator {
  private context: OpenApiContext;
  private options: OpenApiValidatorOpts;

  constructor(options: OpenApiValidatorOpts) {
    this.validateOptions(options);

    if (options.unknownFormats == null) options.unknownFormats === true;
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

    const { coerceTypes, unknownFormats } = this.options;
    const requestValidator = new middlewares.RequestValidator(this.context.apiDoc, {
      nullable: true,
      coerceTypes,
      removeAdditional: false,
      useDefaults: true,
      unknownFormats,
    });

    const requestValidatorMw= (req, res, next) => {
      return requestValidator.validate(req, res, next);
    };

    const responseValidator = new middlewares.ResponseValidator(this.context.apiDoc, {
      coerceTypes,
      unknownFormats,
    });

    const use = [
      middlewares.applyOpenApiMetadata(this.context),
      middlewares.multipart(this.context, this.options.multerOpts),
    ];
    if (this.options.validateRequests) use.push(requestValidatorMw);
    if (this.options.validateResponses) use.push(responseValidator.validate());

    app.use(use);
  }

  private validateOptions(options: OpenApiValidatorOpts): void {
    if (!options.apiSpec) throw ono('apiSpec required.');
    const unknownFormats = options.unknownFormats;
    if (typeof unknownFormats === 'boolean') {
      if (!unknownFormats) {
        throw ono(
          "unknownFormats must contain an array of unknownFormats, 'ignore' or true",
        );
      }
    } else if (
      typeof unknownFormats === 'string' &&
      unknownFormats !== 'ignore' &&
      !Array.isArray(unknownFormats)
    )
      throw ono(
        "unknownFormats must contain an array of unknownFormats, 'ignore' or true",
      );
  }
}
