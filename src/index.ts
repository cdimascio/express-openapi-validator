import ono from 'ono';
import * as _ from 'lodash';
import { Application, Response, NextFunction } from 'express';
import { OpenApiContext } from './framework/openapi.context';
import {
  OpenApiValidatorOpts,
  ValidateResponseOpts,
  OpenApiRequest,
  OpenApiRequestHandler,
} from './framework/types';
import * as middlewares from './middlewares';

export class OpenApiValidator {
  private app: Application;
  private context: OpenApiContext;
  private options: OpenApiValidatorOpts;

  constructor(options: OpenApiValidatorOpts) {
    this.validateOptions(options);

    if (options.unknownFormats == null) options.unknownFormats === true;
    if (options.coerceTypes == null) options.coerceTypes = true;
    if (options.validateRequests == null) options.validateRequests = true;
    if (options.validateResponses == null) options.validateResponses = false;

    if (options.validateResponses === true) {
      options.validateResponses = {
        removeAdditional: false,
      };
    }

    this.options = options;
    this.context = new OpenApiContext({
      apiDoc: options.apiSpec,
    });
  }

  install(app: Application) {
    this.app = app;
    this.installPathParams();
    this.installMetadataMiddleware();
    this.installMultipartMiddleware();

    const components = this.context.apiDoc.components;
    if (components && components.securitySchemes) {
      this.installSecurityMiddleware();
    }

    if (this.options.validateRequests) {
      this.installRequestValidationMiddleware();
    }

    if (this.options.validateResponses) {
      this.installResponseValidationMiddleware();
    }
  }

  private installPathParams() {
    const pathParams = [];
    for (const route of this.context.routes) {
      if (route.pathParams.length > 0) {
        pathParams.push(...route.pathParams);
      }
    }

    // install param on routes with paths
    for (const p of _.uniq(pathParams)) {
      this.app.param(
        p,
        (
          req: OpenApiRequest,
          res: Response,
          next: NextFunction,
          value: any,
          name: string,
        ) => {
          if (req.openapi.pathParams) {
            // override path params
            req.params[name] = req.openapi.pathParams[name] || req.params[name];
          }
          next();
        },
      );
    }
  }

  private installMetadataMiddleware() {
    this.app.use(middlewares.applyOpenApiMetadata(this.context));
  }

  private installMultipartMiddleware() {
    this.app.use(middlewares.multipart(this.context, this.options.multerOpts));
  }

  private installSecurityMiddleware() {
    const securityMiddleware = middlewares.security(
      this.context,
      this.options.securityHandlers,
    );
    this.app.use(securityMiddleware);
  }

  private installRequestValidationMiddleware() {
    const { coerceTypes, unknownFormats } = this.options;
    const requestValidator = new middlewares.RequestValidator(
      this.context.apiDoc,
      {
        nullable: true,
        coerceTypes,
        removeAdditional: false,
        useDefaults: true,
        unknownFormats,
      },
    );
    const requestValidationHandler: OpenApiRequestHandler = (req, res, next) =>
      requestValidator.validate(req, res, next);

    this.app.use(requestValidationHandler);
  }

  private installResponseValidationMiddleware() {
    const { coerceTypes, unknownFormats, validateResponses } = this.options;
    const { removeAdditional } = <ValidateResponseOpts>validateResponses;

    const responseValidator = new middlewares.ResponseValidator(
      this.context.apiDoc,
      {
        coerceTypes,
        removeAdditional,
        unknownFormats,
      },
    );

    this.app.use(responseValidator.validate());
  }

  private validateOptions(options: OpenApiValidatorOpts): void {
    if (!options.apiSpec) throw ono('apiSpec required');

    const securityHandlers = options.securityHandlers;
    if (securityHandlers != null) {
      if (
        typeof securityHandlers !== 'object' ||
        Array.isArray(securityHandlers)
      ) {
        throw ono('securityHandlers must be an object or undefined');
      }
    }

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
