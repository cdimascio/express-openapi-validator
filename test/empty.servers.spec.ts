import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

const packageJson = require('../package.json');

describe(packageJson.name, () => {
  let app = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'empty.servers.yaml');
    app = await createApp({ apiSpec }, 3007, app =>
      app.use(
        ``,
        express
          .Router()
          .get(`/pets`, (req, res) => res.json(req.body)),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should throw 400', async () =>
    request(app)
      .get(`/pets`)
      .expect(400)
      .then(r => {
        expect(r.body.message).to.be.a('string');
        expect(r.body.message).to.be.eq("request.query should have required property 'type', request.query should have required property 'limit'");
      }));
});
