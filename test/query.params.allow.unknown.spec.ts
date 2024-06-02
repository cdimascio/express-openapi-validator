import { expect } from 'chai';
import path from 'path';
import express from 'express';
import request from 'supertest';
import { ExpressWithServer, createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app: ExpressWithServer;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'query.params.yaml');
    app = await createApp(
      { apiSpec, validateRequests: { allowUnknownQueryParameters: true } },
      3005,
      (app) =>
        app.use(
          `${app.basePath}`,
          express
            .Router()
            .post(`/pets/nullable`, (req, res) => res.json(req.body)),
        ),
    );
  });

  after(async () => {
    await app.closeServer();
  });

  it('should pass if known query params are specified', async () =>
    request(app)
      .get(`${app.basePath}/pets`)
      .query({
        name: 'max',
        tags: 'one,two,three',
        limit: 10,
        breed: 'german_shepherd',
        owner_name: 'carmine',
      })
      .expect(200));

  it('should not fail if unknown query param is specified', async () =>
    request(app)
      .get(`${app.basePath}/pets`)
      .query({
        name: 'max',
        tags: 'one,two,three',
        limit: 10,
        breed: 'german_shepherd',
        owner_name: 'carmine',
        unknown_prop: 'test',
      })
      .expect(200));

  it('should fail if operation overrides x-eov-allow-unknown-query-parameters=false', async () =>
    request(app)
      .get(`${app.basePath}/unknown_query_params/disallow`)
      .query({
        value: 'foobar',
        unknown_prop: 'test',
      })
      .expect(400)
      .then((r) => {
        expect(r.body.errors).to.be.an('array');
      }));
});
