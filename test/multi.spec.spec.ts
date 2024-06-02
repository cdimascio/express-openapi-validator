import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import * as OpenApiValidator from '../src';
import { expect } from 'chai';
import request from 'supertest';
import {
  EovErrorHandler,
  ExpressWithServer,
  startServer,
} from './common/app.common';

describe('multi-spec', () => {
  let app: ExpressWithServer;

  before(async () => {
    // Set up the express app
    app = await createServer();
  });

  after(async () => {
    await app.closeServer();
  });

  it('create campaign should return 200', async () =>
    request(app)
      .get(`/v1/pets`)
      .expect(400)
      .then((r) => {
        expect(r.body.message).include('limit');
        expect(r.body.message).include(`'type'`);
      }));

  it('create campaign should return 200', async () =>
    request(app)
      .get(`/v2/pets`)
      .expect(400)
      .then((r) => {
        expect(r.body.message).include(`'pet_type'`);
      }));
});

async function createServer(): Promise<ExpressWithServer> {
  const app = express() as ExpressWithServer;
  app.basePath = '';

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.text());
  app.use(bodyParser.json());

  const versions = [1, 2];

  for (const v of versions) {
    const apiSpec = path.join(__dirname, `api.v${v}.yaml`);
    app.use(
      OpenApiValidator.middleware({
        apiSpec,
      }),
    );

    routes(app, v);
  }

  await startServer(app, 3000);

  function routes(app: ExpressWithServer, v: number) {
    if (v === 1) routesV1(app);
    if (v === 2) routesV2(app);
  }

  function routesV1(app: ExpressWithServer) {
    const v = '/v1';
    app.post(`${v}/pets`, (req, res, next) => {
      res.json({ ...req.body });
    });
    app.get(`${v}/pets`, (req, res, next) => {
      res.json([
        {
          id: 1,
          name: 'happy',
          type: 'cat',
        },
      ]);
    });

    app.use(<EovErrorHandler>((err, req, res, next) => {
      // format error
      res.status(err.status || 500).json({
        message: err.message,
        errors: err.errors,
      });
    }));
  }

  function routesV2(app: ExpressWithServer) {
    const v = '/v2';
    app.get(`${v}/pets`, (req, res, next) => {
      res.json([
        {
          pet_id: 1,
          pet_name: 'happy',
          pet_type: 'kitty',
        },
      ]);
    });
    app.post(`${v}/pets`, (req, res, next) => {
      res.json({ ...req.body });
    });

    app.use(<EovErrorHandler>((err, req, res, next) => {
      // format error
      res.status(err.status || 500).json({
        message: err.message,
        errors: err.errors,
      });
    }));
  }

  return app;
}
