import * as http from 'http';
import * as express from 'express';
const BASE_PATH = '/v1';

export function startServer(app, port): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const server = http.createServer(app);
    app.server = server;
    app.basePath = BASE_PATH;
    server.listen(port, () => {
      console.log(`Listening on port ${port}`);
      resolve(server);
    });
  });
}

export function routes(app) {
  const basePath = BASE_PATH;
  const router1 = express
    .Router()
    .post('/', function(req, res, next) {
      res.json({
        name: `${req.method}: /router_1`,
      });
    })
    .get('/', function(req, res, next) {
      res.json({
        name: `${req.method}: /router_1`,
      });
    })
    .get('/:id', function(req, res, next) {
      res.json({
        name: `${req.method}: /router_1/${req.params.id}`,
      });
    })
    .get('/:id/best/:bid', function(req, res, next) {
      res.json({
        name: `${req.method}: /router_1/${req.params.id}/best/${req.params.bid}`,
      });
    });

  app.use(`${basePath}/router_1`, router1);

  app.get(`${basePath}/pets`, function(req, res, next) {
    res.json({
      test: 'hi',
      ...req.body,
    });
  });

  app.post(`${basePath}/pets`, function(req, res, next) {
    res.json({
      ...req.body,
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
    next,
  ) {
    res.json({
      id: req.params.id,
      attribute_id: req.params.attribute_id,
    });
  });

  app.post(`${basePath}/route_defined_in_express_not_openapi`, function(
    req,
    res,
    next,
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

  app.post('/v1/pets/:id/photos', function(req, res, next) {
    // req.file is the `avatar` file
    // req.body will hold the text fields, if there were any
    const files = req.files;
    res.status(200).json({
      files,
      metadata: req.body.metadata,
    });
  });
}
