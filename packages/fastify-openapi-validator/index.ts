import * as OpenApiValidator from 'express-openapi-validator';
import * as multer from 'multer';
import {
  OpenAPIV3,
  ValidateRequestOpts,
  ValidateSecurityOpts,
  Format,
} from 'framework';

const fp = require('fastify-plugin');

export interface FastifyOpenApiValidatorOpts {
  apiSpec: OpenAPIV3.Document | string;
  validateRequests?: boolean | ValidateRequestOpts;
  validateSecurity?: boolean | ValidateSecurityOpts;
  ignorePaths?: RegExp | Function;
  // securityHandlers?: SecurityHandlers;
  coerceTypes?: boolean | 'array';
  unknownFormats?: true | string[] | 'ignore';
  formats?: Format[];
  fileUploader?: boolean | multer.Options;
  $refParser?: {
    mode: 'bundle' | 'dereference';
  };
  validateFormats?: false | 'fast' | 'full';
}

const chainMiddleware = (handlers, req, res, next) => {
  let n = next;
  for (let i = handlers.length - 1; i >= 0; i--) {
    const c = handlers[i];
    const nxt = n;
    n = (err) => {
      if (err) return next(err);
      else c(req, res, nxt);
    };
  }
  n();
};

module.exports = fp(
  function (app, options: FastifyOpenApiValidatorOpts, next) {
    const middlewares = OpenApiValidator.middleware(options);

    app.addHook('onRequest', function (req, reply, next) {
      const r = { ...req.raw };
      r.query = req.query;
      r.path = req.path;
      r.params = req.openapi?.pathParams || req.params;
      r.originalUrl = req.url;
      r.headers = req.headers;
      r.cookies = req.cookies; // requires fastify-cookie

      chainMiddleware(middlewares, r, reply.raw, next);
    });

    next();
  },
  {
    fastify: '3.x',
    name: 'fastify-openapi-validator',
  },
);
