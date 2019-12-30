import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app = null;

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
        name: 'max',
        tags: 'one,two,three',
        limit: 10,
        breed: 'german_shepherd',
        owner_name: 'carmine',
      })
      .expect(200));

  it('should fail if unknown query param is specified', async () =>
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
      .expect(400)
      .then(r => {
        expect(r.body.errors).to.be.an('array');
      }));

  it('should not allow empty query param value', async () =>
    request(app)
      .get(`${app.basePath}/pets`)
      .query({
        name: 'max',
        tags: 'one,two,three',
        limit: 10,
        breed: '',
        owner_name: 'carmine',
      })
      .expect(400)
      .then(r => {
        expect(r.body)
          .to.have.property('message')
          .that.equals('query parameter breed has empty value');
        expect(r.body.errors)
          .to.be.an('array')
          .with.length(1);
        expect(r.body.errors[0].path).to.equal('.query.breed');
      }));

  it('should allow empty query param value with allowEmptyValue: true', async () =>
    request(app)
      .get(`${app.basePath}/pets`)
      .query({
        name: '',
        tags: 'one,two,three',
        limit: 10,
        breed: 'german_shepherd',
        owner_name: 'carmine',
      })
      .expect(200));
});
