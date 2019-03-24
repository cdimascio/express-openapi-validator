import * as express from 'express';
export function startServer(app, port) {
  const http = require('http');
  const server = http.createServer(app);
  server.listen(port);
  console.log(`Listening on port ${port}`);
  return app;
}

export function routes(app) {
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
      console.log('----/router_1/:id');
      res.json({
        name: `${req.metnod}: /router_1/${req.params.id}`,
      });
    })
    .get('/:id/best/:bid', function(req, res, next) {
      console.log('----/router_1/:id/best/:bid');
      res.json({
        name: `${req.metnod}: /router_1/${req.params.id}/best/${
          req.params.bid
        }`,
      });
    });

  app.use('/v1/router_1', router1);

  app.get('/v1/pets', function(req, res, next) {
    console.log('hi');
    res.json({
      test: 'hi',
    });
  });

  app.post('/v1/pets', function(req, res, next) {
    res.json({
      test: 'hi',
    });
  });

  app.get('/v1/pets/:id', function(req, res, next) {
    res.json({
      id: req.params.id,
    });
  });

  app.get('/v1/pets/:id/attributes', function(req, res, next) {
    res.json({
      id: req.params.id,
    });
  });

  app.get('/v1/pets/:id/attributes/:attribute_id', function(req, res, next) {
    res.json({
      id: req.params.attribute_id,
    });
  });

  app.post('/v1/route_defined_in_express_not_openapi', function(
    req,
    res,
    next
  ) {
    // here
    res.json({
      id: req.params.id,
    });
  });
}
