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
    const apiSpec = path.join('test', 'resources', 'nullable.yaml');
    app = await createApp({ apiSpec }, 3005);
    basePath = app.basePath;

    app.use(
      `${basePath}`,
      express
        .Router()
        .post(`/pets/nullable`, (req, res) => res.json(req.body)),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should allow null to be set (name: nullable true)', async () =>
    request(app)
      .post(`${basePath}/pets/nullable`)
      .send({
        name: null,
      })
      .expect(200)
      .then(r => {
        expect(r.body.name).to.be.null;
      }));

      it('should fill null with default (name: nullable false/default)', async () =>
      request(app)
        .post(`${basePath}/pets`)
        .send({
          name: null,
        })
        .expect(200)
        .then(r => {
          expect(r.body.name).to.equal('');
        }));
});
