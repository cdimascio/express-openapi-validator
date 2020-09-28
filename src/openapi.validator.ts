import ono from 'ono';
import * as express from 'express';
import * as _uniq from 'lodash.uniq';
import * as middlewares from './middlewares';
import { Application, Response, NextFunction, Router } from 'express';
import { OpenApiContext } from './framework/openapi.context';
import { Spec } from './framework/openapi.spec.loader';
import {
  OpenApiValidatorOpts,
  ValidateRequestOpts,
  ValidateResponseOpts,
  OpenApiRequest,
  OpenApiRequestHandler,
  OpenApiRequestMetadata,
  ValidateSecurityOpts,
} from './framework/types';
import { defaultResolver } from './resolvers';
import { OperationHandlerOptions } from './framework/types';

export {
  OpenApiValidatorOpts,
  InternalServerError,
  UnsupportedMediaType,
  RequestEntityToLarge,
  BadRequest,
  MethodNotAllowed,
  NotFound,
  Unauthorized,
  Forbidden,
} from './framework/types';

export class OpenApiValidator {
  readonly options: OpenApiValidatorOpts;

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
    if (options.validateFormats == null) options.validateFormats = 'fast';

    if (typeof options.operationHandlers === 'string') {
      /**
       * Internally, we want to convert this to a value typed OperationHandlerOptions.
       * In this way, we can treat the value as such when we go to install (rather than
       * re-interpreting it over and over).
       */
      options.operationHandlers = {
        basePath: options.operationHandlers,
        resolver: defaultResolver,
      };
    } else if (typeof options.operationHandlers !== 'object') {
      // This covers cases where operationHandlers is null, undefined or false.
      options.operationHandlers = false;
    }

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

  installMiddleware(spec: Promise<Spec>): OpenApiRequestHandler[] {
    const middlewares: OpenApiRequestHandler[] = [];
    const pContext = spec.then(
      (spec) => new OpenApiContext(spec, this.options.ignorePaths),
    );

    let inited = false;
    // install path params
    middlewares.push((req, res, next) =>
      pContext
        .then((context) => {
          if (!inited){
            // Would be nice to pass the current Router object here if the route
            // is attach to a Router and not the app. 
            // Doing so would enable path params to be type coerced when provided to 
            // the final middleware. 
            // Unfortunately, it is not possible to get the current Router from a handler function
            this.installPathParams(req.app, context);
          }
          next();
        })
        .catch(next),
    );

    // metadata middleware
    middlewares.push((req, res, next) =>
      pContext
        .then((context) => this.metadataMiddlware(context)(req, res, next))
        .catch(next),
    );

    if (this.options.fileUploader) {
      // multipart middleware
      middlewares.push((req, res, next) =>
        pContext
          .then((context) => this.multipartMiddleware(context)(req, res, next))
          .catch(next),
      );
    }

    middlewares.push((req, res, next) =>
      pContext
        .then((context) => {
          const components = context.apiDoc.components;
          if (this.options.validateSecurity && components?.securitySchemes) {
            return this.securityMiddleware(context)(req, res, next);
          } else {
            next();
          }
        })
        .catch(next),
    );

    if (this.options.validateRequests) {
      middlewares.push((req, res, next) => {
        return pContext
          .then((context) =>
            this.requestValidationMiddleware(context)(req, res, next),
          )
          .catch(next);
      });
    }

    if (this.options.validateResponses) {
      middlewares.push((req, res, next) =>
        pContext
          .then((context) =>
            this.responseValidationMiddleware(context)(req, res, next),
          )
          .catch(next),
      );
    }

    if (this.options.operationHandlers) {
      let router: Router = null;
      middlewares.push((req, res, next) => {
        if (router) return router(req, res, next);
        pContext
          .then((context) => (router = this.installOperationHandlers(req.baseUrl, context)))
          .then((router) => router(req, res, next))
          .catch(next);
      });
    }

    return middlewares;
  }

  installPathParams(app: Application | Router, context: OpenApiContext): void {
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

  private metadataMiddlware(context: OpenApiContext) {
    return middlewares.applyOpenApiMetadata(context);
  }

  private multipartMiddleware(context: OpenApiContext) {
    return middlewares.multipart(context, {
      multerOpts: this.options.fileUploader,
      unknownFormats: this.options.unknownFormats,
    });
  }

  private securityMiddleware(context: OpenApiContext) {
    const securityHandlers = (<ValidateSecurityOpts>(
      this.options.validateSecurity
    ))?.handlers;
    return middlewares.security(context, securityHandlers);
  }

  private requestValidationMiddleware(context: OpenApiContext) {
    const {
      coerceTypes,
      unknownFormats,
      validateRequests,
      validateFormats,
    } = this.options;
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
      format: validateFormats,
    });
    return (req, res, next) => requestValidator.validate(req, res, next);
  }

  private responseValidationMiddleware(context: OpenApiContext) {
    const {
      coerceTypes,
      unknownFormats,
      validateResponses,
      validateFormats,
    } = this.options;
    const { removeAdditional } = <ValidateResponseOpts>validateResponses;

    return new middlewares.ResponseValidator(context.apiDoc, {
      nullable: true,
      coerceTypes,
      removeAdditional,
      unknownFormats,
      format: validateFormats,
    }).validate();
  }

  installOperationHandlers(baseUrl: string, context: OpenApiContext): Router {
    const router = express.Router({ mergeParams: true });

    this.installPathParams(router, context);

    for (const route of context.routes) {
      const { method, expressRoute } = route;

      /**
       * This if-statement is here to "narrow" the type of options.operationHandlers
       * to OperationHandlerOptions (down from string | false | OperationHandlerOptions)
       * At this point of execution it _should_ be impossible for this to NOT be the correct
       * type as we re-assign during construction to verify this.
       */
      if (this.isOperationHandlerOptions(this.options.operationHandlers)) {
        const { basePath, resolver } = this.options.operationHandlers;
        const path =
          expressRoute.indexOf(baseUrl) === 0
            ? expressRoute.substring(baseUrl.length)
            : expressRoute;
        router[method.toLowerCase()](path, resolver(basePath, route));
      }
    }
    return router;
  }

  private validateOptions(options: OpenApiValidatorOpts): void {
    if (!options.apiSpec) throw ono('apiSpec required');

    const securityHandlers = (<any>options).securityHandlers;
    if (securityHandlers != null) {
      throw ono(
        'securityHandlers is not supported. Use validateSecurities.handlers instead.',
      );
    }

    const multerOpts = (<any>options).multerOpts;
    if (multerOpts != null) {
      throw ono('multerOpts is not supported. Use fileUploader instead.');
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
  }

  private isOperationHandlerOptions(
    value: false | string | OperationHandlerOptions,
  ): value is OperationHandlerOptions {
    if ((value as OperationHandlerOptions).resolver) {
      return true;
    } else {
      return false;
    }
  }
}
