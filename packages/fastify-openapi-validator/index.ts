const fp = require('fastify-plugin');
const { middleware } = require('express-openapi-validator');

module.exports = fp(
  function(app, options, next) {
    const oavmw = middleware({
      apiSpec: './openapi.yml',
      validateRequests: true, // (default)
      validateResponses: false, // false by default
    });

    app.addHook('onRequest', function(req, reply, next) {
      console.log(req);
      const r = { ...req.raw };
      r.query = req.query;
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
