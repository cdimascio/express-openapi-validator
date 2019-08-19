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
    const apiSpec = path.join('test', 'resources', 'request.bodies.ref.yaml');
    app = await createApp({ apiSpec }, 3005);
    basePath = app.basePath;

    // Define new coercion routes
    app.use(
      `${basePath}`,
      express
        .Router()
        .post(`/request_bodies_ref`, (req, res) => res.json(req.body)),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should return 400 if testProperty body property is not provided', async () =>
    request(app)
      .post(`${basePath}/request_bodies_ref`)
      .send({})
      .expect(400)
      .then(r => {
        expect(r.body.errors).to.be.an('array');
        expect(r.body.errors).to.have.length(1);
        const message = r.body.errors[0].message;
        expect(message).to.equal(
          "should have required property 'testProperty'",
        );
      }));

  it('should return 200 if testProperty body property is provided', async () =>
    request(app)
      .post(`${basePath}/request_bodies_ref`)
      .send({
        testProperty: 'abc',
      })
      .expect(200));
});
