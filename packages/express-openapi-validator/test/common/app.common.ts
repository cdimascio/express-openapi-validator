import { Request, Response } from 'express';
import * as http from 'http';
import * as express from 'express';

export function startServer(app, port: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const server = http.createServer(app);
    app.server = server;
    server.listen(port, () => {
      resolve(server);
    });
  });
}

export function routes(app) {
  const basePath = app.basePath;
  const router1 = express
    .Router()
    .post('/', function(req: Request, res: Response): void {
      res.json({
        name: `${req.method}: /router_1`,
      });
    })
    .get('/', function(req: Request, res: Response): void {
      res.json({
        name: `${req.method}: /router_1`,
      });
    })
    .get('/:id', function(req: Request, res: Response): void {
      res.json({
        name: `${req.method}: /router_1/${req.params.id}`,
      });
    })
    .get('/:id/best/:bid', function(req: Request, res: Response): void {
      res.json({
        name: `${req.method}: /router_1/${req.params.id}/best/${req.params.bid}`,
      });
    });

  app.use(`${basePath}/router_1`, router1);

  app.get(`${basePath}/pets`, function(req: Request, res: Response): void {
    res.json({
      test: 'hi',
      body: req.body,
      query: req.query,
    });
  });

  app.post(`${basePath}/pets`, function(req: Request, res: Response): void {
    res.json({
      body: req.body,
      query: req.query,
      id: 'new-id',
    });
  });

  app.get(`${basePath}/pets/:id`, function(req: Request, res: Response): void {
    res.json({
      id: req.params.id,
    });
  });

  app.get(`${basePath}/pets/:id/attributes`, function(
    req: Request,
    res: Response,
  ): void {
    res.json({
      id: req.params.id,
    });
  });

  app.get(`${basePath}/pets/:id/attributes/:attribute_id`, function(
    req: Request,
    res: Response,
  ): void {
    res.json({
      id: req.params.id,
      attribute_id: req.params.attribute_id,
    });
  });

  app.post(`${basePath}/route_defined_in_express_not_openapi`, function(
    req: Request,
    res: Response,
  ): void {
    res.json({
      id: req.params.id,
    });
  });

  app.get('/not_under_an_openapi_basepath', function(
    req: Request,
    res: Response,
  ): void {
    res.json({
      id: '/not_under_an_openapi_basepath',
    });
  });

  // app.post('/v1/pets/:id/photos', function(req: Request, res: Response): void {
  //   // req.file is the `avatar` file
  //   // req.body will hold the text fields, if there were any
  //   const files = req.files;
  //   res.status(200).json({
  //     files,
  //     metadata: req.body.metadata,
  //   });
  // });
  app.post('/v1/pets_charset', function(req: Request, res: Response): void {
    // req.file is the `avatar` file
    // req.body will hold the text fields, if there were any
    res.json({
      ...req.body,
      id: 'new-id',
    });
  });
}
