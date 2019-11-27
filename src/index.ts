import ono from 'ono';
import * as _ from 'lodash';
import * as middlewares from './middlewares';
import { Application, Response, NextFunction } from 'express';
import { OpenApiContext } from './framework/openapi.context';
import { OpenApiSpecLoader } from './framework/openapi.spec.loader';
import {
  OpenApiValidatorOpts,
  ValidateRequestOpts,
  ValidateResponseOpts,
  OpenApiRequest,
  OpenApiRequestHandler,
  OpenApiRequestMetadata,
} from './framework/types';

export class OpenApiValidator {
  private readonly options: OpenApiValidatorOpts;
  private readonly context: OpenApiContext;

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

    if (options.validateRequests === true) {
      options.validateRequests = {
        allowUnknownQueryParameters: false,
      };
    }

    this.options = options;

    const spec = new OpenApiSpecLoader({
      apiDoc: this.options.apiSpec,
    }).load();

    this.context = new OpenApiContext(spec, options.ignorePaths);
  }

  public install(app: Application): void {
    this.installPathParams(app);
    this.installMetadataMiddleware(app);
    this.installMultipartMiddleware(app);

    const components = this.context.apiDoc.components;
    if (components && components.securitySchemes) {
      this.installSecurityMiddleware(app);
    }

    if (this.options.validateRequests) {
      this.installRequestValidationMiddleware(app);
    }

    if (this.options.validateResponses) {
      this.installResponseValidationMiddleware(app);
    }
  }

  private installPathParams(app: Application): void {
    const pathParams: string[] = [];
    for (const route of this.context.routes) {
      if (route.pathParams.length > 0) {
        pathParams.push(...route.pathParams);
      }
    }

    // install param on routes with paths
    for (const p of _.uniq(pathParams)) {
      app.param(
        p,
        (
          req: OpenApiRequest,
          res: Response,
          next: NextFunction,
          value: any,
          name: string,
        ) => {
          const { pathParams } = <OpenApiRequestMetadata>req.openapi;
          if (pathParams) {
            // override path params
            req.params[name] = pathParams[name] || req.params[name];
          }
          next();
        },
      );
    }
  }

  private installMetadataMiddleware(app: Application): void {
    app.use(middlewares.applyOpenApiMetadata(this.context));
  }

  private installMultipartMiddleware(app: Application): void {
    app.use(middlewares.multipart(this.context, this.options.multerOpts));
  }

  private installSecurityMiddleware(app: Application): void {
    const securityMiddleware = middlewares.security(
      this.context,
      this.options.securityHandlers,
    );
    app.use(securityMiddleware);
  }

  private installRequestValidationMiddleware(app: Application): void {
    const { coerceTypes, unknownFormats, validateRequests } = this.options;
    const { allowUnknownQueryParameters } = <ValidateRequestOpts>(
      validateRequests
    );
    const requestValidator = new middlewares.RequestValidator(
      this.context.apiDoc,
      {
        nullable: true,
        coerceTypes,
        removeAdditional: false,
        useDefaults: true,
        unknownFormats,
        allowUnknownQueryParameters,
      },
    );
    const requestValidationHandler: OpenApiRequestHandler = (req, res, next) =>
      requestValidator.validate(req, res, next);

    app.use(requestValidationHandler);
  }

  private installResponseValidationMiddleware(app: Application): void {
    const { coerceTypes, unknownFormats, validateResponses } = this.options;
    const { removeAdditional } = <ValidateResponseOpts>validateResponses;

    const responseValidator = new middlewares.ResponseValidator(
      this.context.apiDoc,
      {
        nullable: true,
        coerceTypes,
        removeAdditional,
        unknownFormats,
      },
    );

    app.use(responseValidator.validate());
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
