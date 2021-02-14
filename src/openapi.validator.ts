import ono from 'ono';
import ajv = require('ajv');
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
  OpenAPIV3,
  RequestValidatorOptions,
  Options,
} from './framework/types';
import { defaultResolver } from './resolvers';
import { OperationHandlerOptions } from './framework/types';
import { defaultSerDes } from './framework/base.serdes';
import { SchemaPreprocessor } from './middlewares/parsers/schema.preprocessor';


export {
  OpenApiValidatorOpts,
  InternalServerError,
  UnsupportedMediaType,
  RequestEntityTooLarge,
  BadRequest,
  MethodNotAllowed,
  NotAcceptable,
  NotFound,
  Unauthorized,
  Forbidden,
} from './framework/types';

export class OpenApiValidator {
  readonly options: OpenApiValidatorOpts;
  readonly ajvOpts: AjvOptions;

  constructor(options: OpenApiValidatorOpts) {
    this.validateOptions(options);
    this.normalizeOptions(options);

    if (options.validateRequests == null) options.validateRequests = true;
    if (options.validateResponses == null) options.validateResponses = false;
    if (options.validateSecurity == null) options.validateSecurity = true;
    if (options.fileUploader == null) options.fileUploader = {};
    if (options.$refParser == null) options.$refParser = { mode: 'bundle' };
    if (options.unknownFormats == null) options.unknownFormats === true;
    if (options.validateFormats == null) options.validateFormats = 'fast';
    if (options.formats == null) options.formats = [];

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
        coerceTypes: false,
        onError: null,
      };
    }

    if (options.validateRequests === true) {
      options.validateRequests = {
        allowUnknownQueryParameters: false,
        coerceTypes: false,
      };
    }

    if (options.validateSecurity === true) {
      options.validateSecurity = {};
    }

    this.options = options;
    this.ajvOpts = new AjvOptions(options);
  }

  installMiddleware(spec: Promise<Spec>): OpenApiRequestHandler[] {
    const middlewares: OpenApiRequestHandler[] = [];
    const pContext = spec.then((spec) => {
      const apiDoc = spec.apiDoc;
      const ajvOpts = this.ajvOpts.preprocessor;
      const resOpts = this.options.validateResponses as ValidateRequestOpts;
      const sp = new SchemaPreprocessor(apiDoc, ajvOpts, resOpts).preProcess();
      return {
        context: new OpenApiContext(spec, this.options.ignorePaths),
        responseApiDoc: sp.apiDocRes,
      };
    });

    let inited = false;
    // install path params
    middlewares.push((req, res, next) =>
      pContext
        .then(({ context }) => {
          if (!inited) {
            // Would be nice to pass the current Router object here if the route
            // is attach to a Router and not the app.
            // Doing so would enable path params to be type coerced when provided to
            // the final middleware.
            // Unfortunately, it is not possible to get the current Router from a handler function
            this.installPathParams(req.app, context);
            inited = true;
          }
          next();
        })
        .catch(next),
    );

    // metadata middleware
    let metamw;
    middlewares.push((req, res, next) =>
      pContext
        .then(({ context, responseApiDoc }) => {
          metamw = metamw || this.metadataMiddlware(context, responseApiDoc);
          return metamw(req, res, next);
        })
        .catch(next),
    );

    if (this.options.fileUploader) {
      // multipart middleware
      let fumw;
      middlewares.push((req, res, next) =>
        pContext
          .then(({ context: { apiDoc } }) => {
            fumw = fumw || this.multipartMiddleware(apiDoc);
            return fumw(req, res, next);
          })
          .catch(next),
      );
    }

    // security middlware
    let scmw;
    middlewares.push((req, res, next) =>
      pContext
        .then(({ context: { apiDoc } }) => {
          const components = apiDoc.components;
          if (this.options.validateSecurity && components?.securitySchemes) {
            scmw = scmw || this.securityMiddleware(apiDoc);
            return scmw(req, res, next);
          } else {
            next();
          }
        })
        .catch(next),
    );

    // request middlweare
    if (this.options.validateRequests) {
      let reqmw;
      middlewares.push((req, res, next) => {
        return pContext
          .then(({ context: { apiDoc } }) => {
            reqmw = reqmw || this.requestValidationMiddleware(apiDoc);
            return reqmw(req, res, next);
          })
          .catch(next);
      });
    }

    // response middleware
    if (this.options.validateResponses) {
      let resmw;
      middlewares.push((req, res, next) =>
        pContext
          .then(({ responseApiDoc }) => {
            resmw = resmw || this.responseValidationMiddleware(responseApiDoc);
            return resmw(req, res, next);
          })
          .catch(next),
      );
    }

    // op handler middleware
    if (this.options.operationHandlers) {
      let router: Router = null;
      middlewares.push((req, res, next) => {
        if (router) return router(req, res, next);
        pContext
          .then(
            ({ context }) =>
              (router = this.installOperationHandlers(req.baseUrl, context)),
          )
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

  private metadataMiddlware(
    context: OpenApiContext,
    responseApiDoc: OpenAPIV3.Document,
  ) {
    return middlewares.applyOpenApiMetadata(context, responseApiDoc);
  }

  private multipartMiddleware(apiDoc: OpenAPIV3.Document) {
    return middlewares.multipart(apiDoc, {
      multerOpts: this.options.fileUploader,
      ajvOpts: this.ajvOpts.multipart,
    });
  }

  private securityMiddleware(apiDoc: OpenAPIV3.Document) {
    const securityHandlers = (<ValidateSecurityOpts>(
      this.options.validateSecurity
    ))?.handlers;
    return middlewares.security(apiDoc, securityHandlers);
  }

  private requestValidationMiddleware(apiDoc: OpenAPIV3.Document) {
    const requestValidator = new middlewares.RequestValidator(
      apiDoc,
      this.ajvOpts.request,
    );
    return (req, res, next) => requestValidator.validate(req, res, next);
  }

  private responseValidationMiddleware(apiDoc: OpenAPIV3.Document) {
    return new middlewares.ResponseValidator(
      apiDoc,
      this.ajvOpts.response,
      // This has already been converted from boolean if required
      this.options.validateResponses as ValidateResponseOpts,
    ).validate();
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
        router[method.toLowerCase()](
          path,
          resolver(basePath, route, context.apiDoc),
        );
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

    if (options.coerceTypes) {
      console.warn('coerceTypes is deprecated.');
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
    if(!options.serDes) {
      options.serDes = defaultSerDes;
    }
    else {
      if(!Array.isArray(options.unknownFormats)) {
        options.unknownFormats = Array<string>();
      }
      options.serDes.forEach(currentSerDes => {
        if((options.unknownFormats as string[]).indexOf(currentSerDes.format) === -1) {
          (options.unknownFormats as string[]).push(currentSerDes.format)
        }
      });
      defaultSerDes.forEach(currentDefaultSerDes => {
        let defautSerDesOverride = options.serDes.find(currentOptionSerDes => {
          return currentDefaultSerDes.format === currentOptionSerDes.format;
        });
        if(!defautSerDesOverride) {
          options.serDes.push(currentDefaultSerDes);
        }
      });
    }
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

class AjvOptions {
  private options: OpenApiValidatorOpts;
  constructor(options: OpenApiValidatorOpts) {
    this.options = options;
  }
  get preprocessor(): ajv.Options {
    return this.baseOptions();
  }

  get response(): ajv.Options {
    const { coerceTypes, removeAdditional } = <ValidateResponseOpts>(
      this.options.validateResponses
    );
    return {
      ...this.baseOptions(),
      useDefaults: false,
      coerceTypes,
      removeAdditional,
    };
  }

  get request(): RequestValidatorOptions {
    const { allowUnknownQueryParameters, coerceTypes, removeAdditional } = <ValidateRequestOpts>(
      this.options.validateRequests
    );
    return {
      ...this.baseOptions(),
      allowUnknownQueryParameters,
      coerceTypes,
      removeAdditional,
    };
  }

  get multipart(): Options {
    return this.baseOptions();
  }

  private baseOptions(): Options {
    const { coerceTypes, unknownFormats, validateFormats, serDes } = this.options;
    const serDesMap = {};
    for (const serDesObject of serDes) {
      if(!serDesMap[serDesObject.format]) {
        serDesMap[serDesObject.format] = serDesObject;
      }
      else {
        if (serDesObject.serialize) {
          serDesMap[serDesObject.format].serialize = serDesObject.serialize;
        }
        if (serDesObject.deserialize) {
          serDesMap[serDesObject.format].deserialize = serDesObject.deserialize;
        }
      }
    }

    return {
      nullable: true,
      coerceTypes,
      useDefaults: true,
      removeAdditional: false,
      unknownFormats,
      format: validateFormats,
      formats: this.options.formats.reduce((acc, f) => {
        acc[f.name] = {
          type: f.type,
          validate: f.validate,
        };
        return acc;
      }, {}),
      serDesMap : serDesMap,
    };
  }
}
