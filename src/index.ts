import ono from 'ono';
import * as _uniq from 'lodash.uniq';
import * as middlewares from './middlewares';
import { Application, Response, NextFunction, Router } from 'express';
import { OpenApiContext } from './framework/openapi.context';
import { OpenApiSpecLoader, Spec } from './framework/openapi.spec.loader';
import {
  OpenApiValidatorOpts,
  ValidateRequestOpts,
  ValidateResponseOpts,
  OpenApiRequest,
  OpenApiRequestHandler,
  OpenApiRequestMetadata,
  ValidateSecurityOpts,
} from './framework/types';
import { deprecationWarning } from './middlewares/util';

export class OpenApiValidator {
  private readonly options: OpenApiValidatorOpts;

  constructor(options: OpenApiValidatorOpts) {
    this.validateOptions(options);
    this.normalizeOptions(options);

    if (options.unknownFormats == null) options.unknownFormats === true;
    if (options.coerceTypes == null) options.coerceTypes = true;
    if (options.validateRequests == null) options.validateRequests = true;
    if (options.validateResponses == null) options.validateResponses = false;
    if (options.validateSecurity == null) options.validateSecurity = true;
    if (options.fileUploader == null) options.fileUploader = {};
    if (options.$refParser == null) options.$refParser = { mode: 'bundle' };

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

    if (options.validateSecurity === true) {
      options.validateSecurity = {};
    }

    this.options = options;
  }

  public installSync(app: Application | Router): void {
    const spec = new OpenApiSpecLoader({
      apiDoc: this.options.apiSpec,
    }).loadSync();
    this.installMiddleware(app, spec);
  }

  public async install(app: Application | Router): Promise<void>;
  public install(
    app: Application | Router,
    callback: (error: Error) => void,
  ): void;
  public install(
    app: Application | Router,
    callback?: (error: Error) => void,
  ): Promise<void> | void {
    const p = new OpenApiSpecLoader({
      apiDoc: this.options.apiSpec,
      $refParser: this.options.$refParser,
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

  private installMiddleware(app: Application | Router, spec: Spec): void {
    const context = new OpenApiContext(spec, this.options.ignorePaths);

    this.installPathParams(app, context);
    this.installMetadataMiddleware(app, context);
    if (this.options.fileUploader) {
      this.installMultipartMiddleware(app, context);
    }

    const components = context.apiDoc.components;
    if (this.options.validateSecurity && components?.securitySchemes) {
      this.installSecurityMiddleware(app, context);
    }

    if (this.options.validateRequests) {
      this.installRequestValidationMiddleware(app, context);
    }

    if (this.options.validateResponses) {
      this.installResponseValidationMiddleware(app, context);
    }
  }

  private installPathParams(
    app: Application | Router,
    context: OpenApiContext,
  ): void {
    const pathParams: string[] = [];
    for (const route of context.routes) {
      if (route.pathParams.length > 0) {
        pathParams.push(...route.pathParams);
      }
    }

    // install param on routes with paths
    for (const p of _uniq(pathParams)) {
      app.param(
        p,
        (
          req: OpenApiRequest,
          res: Response,
          next: NextFunction,
          value: any,
          name: string,
        ) => {
          const openapi = <OpenApiRequestMetadata>req.openapi;
          if (openapi?.pathParams) {
            const { pathParams } = openapi;
            // override path params
            req.params[name] = pathParams[name] || req.params[name];
          }
          next();
        },
      );
    }
  }

  private installMetadataMiddleware(
    app: Application | Router,
    context: OpenApiContext,
  ): void {
    app.use(middlewares.applyOpenApiMetadata(context));
  }

  private installMultipartMiddleware(
    app: Application | Router,
    context: OpenApiContext,
  ): void {
    app.use(middlewares.multipart(context, this.options.fileUploader));
  }

  private installSecurityMiddleware(
    app: Application | Router,
    context: OpenApiContext,
  ): void {
    const securityHandlers = (<ValidateSecurityOpts>(
      this.options.validateSecurity
    ))?.handlers;
    const securityMiddleware = middlewares.security(context, securityHandlers);
    app.use(securityMiddleware);
  }

  private installRequestValidationMiddleware(
    app: Application | Router,
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
    app: Application | Router,
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
      deprecationWarning(
        'securityHandlers is deprecated. Use validateSecurities.handlers instead.',
      );
    }

    if (options.securityHandlers && options.validateSecurity) {
      throw ono(
        'securityHandlers and validateSecurity may not be used together. Use validateSecurities.handlers to specify handlers.',
      );
    }

    const multerOpts = options.multerOpts;
    if (securityHandlers != null) {
      if (typeof multerOpts !== 'object' || Array.isArray(securityHandlers)) {
        throw ono('multerOpts must be an object or undefined');
      }
      deprecationWarning('multerOpts is deprecated. Use fileUploader instead.');
    }

    if (options.multerOpts && options.fileUploader) {
      throw ono(
        'multerOpts and fileUploader may not be used together. Use fileUploader to specify upload options.',
      );
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

  private normalizeOptions(options: OpenApiValidatorOpts): void {
    // Modify the request
    if (options.securityHandlers) {
      options.validateSecurity = {
        handlers: options.securityHandlers,
      };
      delete options.securityHandlers;
    }
    if (options.multerOpts) {
      options.fileUploader = options.multerOpts;
      delete options.multerOpts;
    }
  }
}
