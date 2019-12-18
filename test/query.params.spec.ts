import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app = null;
  let basePath = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'query.params.yaml');
    app = await createApp({ apiSpec }, 3005, app =>
      app.use(
        `${app.basePath}`,
        express
          .Router()
          .post(`/pets/nullable`, (req, res) => res.json(req.body)),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should pass if known query params are specified', async () =>
    request(app)
      .get(`${app.basePath}/pets`)
      .query({
        breed: 'german_shepherd',
        'filter[date]': '2000-02-29',
        limit: 10,
        owner_name: 'carmine',
        tags: 'one,two,three',
      })
      .expect(200));

  it('should pass with query params containing []', async () =>
    request(app)
      .get(`${app.basePath}/pets`)
      .query({
        breed: 'german_shepherd',
        'filter[date]': '2000-02-29',
        limit: 10,
        owner_name: 'carmine',
      })
      .expect(200));

  it('should fail with invalid query params containing []', async () =>
    request(app)
      .get(`${app.basePath}/pets`)
      .query({
        breed: 'german_shepherd',
        'filter[date]': 'not-a-date',
        limit: 10,
        owner_name: 'carmine',
      })
      .expect(400)
      .then(r => {
        expect(r.body.errors).to.be.an('array');
      }));

  it('should pass with required query params containing []', async () =>
    request(app)
      .get(`${app.basePath}/pets/with-required-date-filter`)
      .query({
        'filter[date]': '2000-02-29',
      })
      .expect(200));

  it('should fail if unknown query param is specified', async () =>
    request(app)
      .get(`${app.basePath}/pets`)
      .query({
        breed: 'german_shepherd',
        limit: 10,
        owner_name: 'carmine',
        tags: 'one,two,three',
        unknown_prop: 'test',
      })
      .expect(400)
      .then(r => {
        expect(r.body.errors).to.be.an('array');
      }));
});
