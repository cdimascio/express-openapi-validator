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

  it('should return users', async () => request(app).get(`/users`).expect(400));

  it('should return pets', async () => request(app).get(`/pets`).expect(400));
});

function createServer() {
  const express = require('express');
  const path = require('path');
  const bodyParser = require('body-parser');
  const http = require('http');
  const OpenApiValidator = require('../src');

  const app = express();
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.text());
  app.use(bodyParser.json());

  const versions = [3, 4];

  for (const v of versions) {
    const apiSpec = path.join(__dirname, `api.v${v}.yaml`);
    app.use(
      OpenApiValidator.middleware({
        apiSpec,
      }),
    );

    routes(app, v);
  }

  const server = http.createServer(app);
  server.listen(3000);
  console.log('Listening on port 3000');

  function routes(app, v) {
    routesUsers(app);
    routesPets(app);
  }

  function routesUsers(app) {
    app.post(`/users`, (req, res, next) => {
      res.json({ ...req.body });
    });
    app.get(`/users`, (req, res, next) => {
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

  function routesPets(app) {
    app.get('/pets', (req, res, next) => {
      res.json([
        {
          pet_id: 1,
          pet_name: 'happy',
          pet_type: 'kitty',
        },
      ]);
    });

    app.post('/pets', (req, res, next) => {
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
