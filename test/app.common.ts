export function startServer(app, port) {
  const http = require('http');
  const server = http.createServer(app);
  server.listen(port);
  console.log(`Listening on port ${port}`);
  return app;
}

export function routes(app) {
  app.get('/v1/pets', function(req, res, next) {
    console.log('at /v1/pets here');
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
    console.log('---- get /pets/:id', req.params);
    // here
    res.json({
      id: req.params.id,
    });
  });

  app.get('/v1/pets/:id/attributes', function(req, res, next) {
    console.log('---- get /pets/:id', req.params);
    // here
    res.json({
      id: req.params.id,
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
