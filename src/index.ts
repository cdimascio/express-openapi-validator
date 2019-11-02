import ono from 'ono';
import * as _ from 'lodash';
import {
  Application,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from 'express';
import { OpenApiContext } from './framework/openapi.context';
import {
  OpenAPIV3,
  OpenApiRequest,
  OpenApiRequestHandler,
} from './framework/types';
import * as middlewares from './middlewares';

export type SecurityHandlers = {
  [key: string]: (
    req: Request,
    scopes: string[],
    schema: OpenAPIV3.SecuritySchemeObject,
  ) => boolean | Promise<boolean>;
};
export type ValidateResponseOpts = {
  removeAdditional?: string | boolean;
};
export interface OpenApiValidatorOpts {
  apiSpec: OpenAPIV3.Document | string;
  validateResponses?: boolean | ValidateResponseOpts;
  validateRequests?: boolean;
  securityHandlers?: SecurityHandlers;
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
    if (options.validateResponses == null) options.validateResponses = false;
    if (!options.validateRequests) throw Error('validateRequests must be true');

    if (!options.validateResponses) {
    } else if (
      options.validateResponses === true ||
      options.validateResponses === 'strict'
    ) {
      options.validateResponses = {
        removeAdditional: false,
      };
    }

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
      app.param(
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

    const requestValidatorMw: OpenApiRequestHandler = (req, res, next) =>
      requestValidator.validate(req, res, next);

    const removeAdditional =
      this.options.validateResponses &&
      (<ValidateResponseOpts>this.options.validateResponses).removeAdditional;

    const responseValidator = new middlewares.ResponseValidator(
      this.context.apiDoc,
      {
        coerceTypes,
        removeAdditional,
        unknownFormats,
      },
    );

    const securityMiddleware = middlewares.security(
      this.context,
      this.options.securityHandlers,
    );

    const components = this.context.apiDoc.components;
    const use = [
      middlewares.applyOpenApiMetadata(this.context),
      middlewares.multipart(this.context, this.options.multerOpts),
    ];
    // TODO validate security functions exist for each security key
    if (components && components.securitySchemes) use.push(securityMiddleware);
    if (this.options.validateRequests) use.push(requestValidatorMw);
    if (this.options.validateResponses) use.push(responseValidator.validate());

    app.use(use);
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
