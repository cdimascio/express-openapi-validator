import { middleware } from 'express-openapi-validator';
import type { OpenApiValidatorOpts } from 'express-openapi-validator'
const fp = require('fastify-plugin');

module.exports = fp(
  function(app, options: OpenApiValidatorOpts, next) {
    const oavmw = middleware(options);

    app.addHook('onRequest', function(req, reply, next) {
      const r = { ...req.raw };
      r.query = req.query;
      r.path = req.path;
      r.params = req.params;
      r.originalUrl = req.url;
      r.headers = req.headers;
      r.cookies = req.cookies; // requires fastify-cookie

      oavmw(r, reply.raw, next);
    });

    next();
  },
  {
    fastify: '3.x',
    name: 'fastify-openapi-validator',
  }
);
