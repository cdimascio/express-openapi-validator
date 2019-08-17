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
    const apiSpec = path.join(
      'test',
      'resources',
      'additional.properties.yaml',
    );
    app = await createApp({ apiSpec }, 3005);
    basePath = app.basePath;

    // Define new coercion routes
    app.use(
      `${basePath}/additional_props`,
      express
        .Router()
        .post(`/false`, (req, res) => res.json(req.body))
        .post(`/true`, (req, res) => res.json(req.body)),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should return 400 if additionalProperties=false, but extra props sent', async () =>
    request(app)
      .post(`${basePath}/additional_props/false`)
      .send({
        name: 'test',
        extra_prop: 'test',
      })
      .expect(400)
      .then(r => {
        const e = r.body.errors;
        expect(e)
          .to.be.an('array')
          .with.length(1);
        expect(e[0].message).to.equal('should NOT have additional properties');
      }));

  it('should return 200 if additonalProperities=true and extra props are sent', async () =>
    request(app)
      .post(`${basePath}/additional_props/true`)
      .send({
        name: 'test',
        extra_prop: 'test',
      })
      .expect(200));
});
