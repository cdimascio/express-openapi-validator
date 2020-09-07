import { middleware } from 'express-openapi-validator';
import type { OpenApiValidatorOpts } from 'express-openapi-validator';
const fp = require('fastify-plugin');

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
  function (app, options: OpenApiValidatorOpts, next) {
    const middlewares = middleware(options);

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
  }
);
