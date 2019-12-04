import ono from 'ono';
import * as _ from 'lodash';
import * as middlewares from './middlewares';
import { Application, Response, NextFunction } from 'express';
import { OpenApiContext } from './framework/openapi.context';
import { OpenApiSpecLoader, Spec } from './framework/openapi.spec.loader';
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
  }

  public installSync(app: Application): void {
    const spec = new OpenApiSpecLoader({
      apiDoc: this.options.apiSpec,
    }).loadSync();
    this.installMiddleware(app, spec);
  }

  public async install(app: Application): Promise<void>;
  public install(app: Application, callback: (error: Error) => void): void;
  public install(
    app: Application,
    callback?: (error: Error) => void,
  ): Promise<void> | void {
    const p = new OpenApiSpecLoader({
      apiDoc: this.options.apiSpec,
    })
      .load()
      .then(spec => this.installMiddleware(app, spec));

    const useCallback = callback && typeof callback === 'function';
    if (useCallback) {
      p.catch(e => {
        callback(e);
      });
    } else {
      return p;
    }
  }

  private installMiddleware(app: Application, spec: Spec): void {
    const context = new OpenApiContext(spec, this.options.ignorePaths);

    this.installPathParams(app, context);
    this.installMetadataMiddleware(app, context);
    if (this.options.multerOpts) {
      this.installMultipartMiddleware(app, context);
    }

    const components = context.apiDoc.components;
    if (components && components.securitySchemes) {
      this.installSecurityMiddleware(app, context);
    }

    if (this.options.validateRequests) {
      this.installRequestValidationMiddleware(app, context);
    }

    if (this.options.validateResponses) {
      this.installResponseValidationMiddleware(app, context);
    }
  }

  private installPathParams(app: Application, context: OpenApiContext): void {
    const pathParams: string[] = [];
    for (const route of context.routes) {
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

  private installMetadataMiddleware(
    app: Application,
    context: OpenApiContext,
  ): void {
    app.use(middlewares.applyOpenApiMetadata(context));
  }

  private installMultipartMiddleware(
    app: Application,
    context: OpenApiContext,
  ): void {
    app.use(middlewares.multipart(context, this.options.multerOpts));
  }

  private installSecurityMiddleware(
    app: Application,
    context: OpenApiContext,
  ): void {
    const securityMiddleware = middlewares.security(
      context,
      this.options.securityHandlers,
    );
    app.use(securityMiddleware);
  }

  private installRequestValidationMiddleware(
    app: Application,
    context: OpenApiContext,
  ): void {
    const { coerceTypes, unknownFormats, validateRequests } = this.options;
    const { allowUnknownQueryParameters } = <ValidateRequestOpts>(
      validateRequests
    );
    const requestValidator = new middlewares.RequestValidator(context.apiDoc, {
      nullable: true,
      coerceTypes,
      removeAdditional: false,
      useDefaults: true,
      unknownFormats,
      allowUnknownQueryParameters,
    });
    const requestValidationHandler: OpenApiRequestHandler = (req, res, next) =>
      requestValidator.validate(req, res, next);

    app.use(requestValidationHandler);
  }

  private installResponseValidationMiddleware(
    app: Application,
    context: OpenApiContext,
  ): void {
    const { coerceTypes, unknownFormats, validateResponses } = this.options;
    const { removeAdditional } = <ValidateResponseOpts>validateResponses;

    const responseValidator = new middlewares.ResponseValidator(
      context.apiDoc,
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
