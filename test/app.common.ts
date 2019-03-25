import * as express from 'express';
const BASE_PATH = '/v1';

export function startServer(app, port) {
  const http = require('http');
  const server = http.createServer(app);
  server.listen(port);
  console.log(`Listening on port ${port}`);
  app.server = server;
  app.basePath = BASE_PATH;
  return app;
}

export function routes(app) {
  const basePath = BASE_PATH;
  const router1 = express
    .Router()
    .post('/', function(req, res, next) {
      res.json({
        name: `${req.metnod}: /router_1`,
      });
    })
    .get('/', function(req, res, next) {
      res.json({
        name: `${req.metnod}: /router_1`,
      });
    })
    .get('/:id', function(req, res, next) {
      res.json({
        name: `${req.metnod}: /router_1/${req.params.id}`,
      });
    })
    .get('/:id/best/:bid', function(req, res, next) {
      res.json({
        name: `${req.metnod}: /router_1/${req.params.id}/best/${
          req.params.bid
        }`,
      });
    });

  app.use(`${basePath}/router_1`, router1);

  app.get(`${basePath}/pets`, function(req, res, next) {
    res.json({
      test: 'hi',
    });
  });

  app.post(`${basePath}/pets`, function(req, res, next) {
    res.json({
      id: 'new-id',
    });
  });

  app.get(`${basePath}/pets/:id`, function(req, res, next) {
    res.json({
      id: req.params.id,
    });
  });

  app.get(`${basePath}/pets/:id/attributes`, function(req, res, next) {
    res.json({
      id: req.params.id,
    });
  });

  app.get(`${basePath}/pets/:id/attributes/:attribute_id`, function(
    req,
    res,
    next
  ) {
    res.json({
      id: req.params.id,
      attribute_id: req.params.attribute_id,
    });
  });

  app.post(`${basePath}/route_defined_in_express_not_openapi`, function(
    req,
    res,
    next
  ) {
    res.json({
      id: req.params.id,
    });
  });

  app.get('/not_under_an_openapi_basepath', function(req, res, next) {
    res.json({
      id: '/not_under_an_openapi_basepath',
    });
  });
}
