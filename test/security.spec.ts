import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

const packageJson = require('../package.json');

describe(packageJson.name, () => {
  let app = null;
  let basePath = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'security.yaml');
    app = await createApp(
      {
        apiSpec,
        securityHandlers: {
          ApiKeyAuth: function(req, scopes, schema) {
            console.log('-------in sec handler');
          },
        },
      },
      3005,
    );
    basePath = app.basePath;
    console.log(basePath);

    app.use(
      `${basePath}`,
      express
        .Router()
        .get(`/api_key`, (req, res) => res.json({ logged_in: true })),
    );
  });

  after(() => {
    app.server.close();
  });

  it.only('should return 401 if apikey not valid', async () =>
    request(app)
      .get(`${basePath}/api_key`)
      .send({})
      .expect(401)
      .then(r => {
        console.log(r.body);
        expect(r.body.errors).to.be.an('array');
        expect(r.body.errors).to.have.length(1);

        // TODO add test
      }));
});
