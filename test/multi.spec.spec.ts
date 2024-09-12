import { expect } from 'chai';
import * as request from 'supertest';

describe('multi-spec', () => {
  let app = null;

  before(async () => {
    // Set up the express app
    app = createServer();
  });

  after(() => {
    app.server.close();
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

function createServer() {
  const express = require('express');
  const path = require('path');
  const bodyParser = require('body-parser');
  const http = require('http');
  const OpenApiValidator = require('../src');

  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(express.text());
  app.use(express.json());

  const versions = [1, 2];

  for (const v of versions) {
    const apiSpec = path.join(__dirname, `api.v${v}.yaml`);
    app.use(
      OpenApiValidator.middleware({
        apiSpec,
        validateRequests: {
          allErrors: true,
        },
      }),
    );

    routes(app, v);
  }

  const server = http.createServer(app);
  server.listen(3000);
  console.log('Listening on port 3000');

  function routes(app, v) {
    if (v === 1) routesV1(app);
    if (v === 2) routesV2(app);
  }

  function routesV1(app) {
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

    app.use((err, req, res, next) => {
      // format error
      res.status(err.status || 500).json({
        message: err.message,
        errors: err.errors,
      });
    });
  }

  function routesV2(app) {
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

    app.use((err, req, res, next) => {
      // format error
      res.status(err.status || 500).json({
        message: err.message,
        errors: err.errors,
      });
    });
  }

  app.server = server;
  return app;
}
