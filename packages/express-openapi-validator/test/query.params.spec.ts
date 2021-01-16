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
          .post(`/pets/nullable`, (req, res) => res.json(req.body))
          .get(`/no_reserved`, (req, res) => res.json(req.body))
          .get(`/no_query_params`, (req, res) => res.json({ complete: true }))
          .get(`/allow_reserved`, (req, res) => res.json(req.body))
          .get(`/unknown_query_params/allow`, (req, res) =>
            res.json({ complete: true }),
          ),
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

  it('should reject any query param when endpoint declares none', async () =>
    request(app)
      .get(`${app.basePath}/no_query_params`)
      .query({
        name: 'max',
      })
      .expect(400)
      .then(r => {
        expect(r.body.errors).to.be.an('array');
      }));

  it('should return 200 if no query params are supplied', async () =>
    request(app)
      .get(`${app.basePath}/no_query_params`)
      .expect(200)
      .then(r => {
        expect(r.body.complete).to.equal(true);
      }));

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

  it('should return 200 if operation overrides x-allow-unknown-query-parameters=true', async () =>
    request(app)
      .get(`${app.basePath}/unknown_query_params/allow`)
      .query({
        value: 'foobar',
        unknown_prop: 'test',
      })
      .expect(200));

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
          .that.equals("Empty value found for query parameter 'breed'");
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

  it("should succeed when query param 'name' has empty value and sets allowEmptyValue: true", async () =>
    request(app)
      .get(
        `${app.basePath}/pets?name=&tags=one&limit=10&breed=german_shepherd&owner_name=carmine`,
      )
      .expect(200));

  it('should not allow reserved characters', async () =>
    request(app)
      .get(`${app.basePath}/no_reserved?value=ThisHas$ReservedChars!`)
      .expect(400)
      .then(r => {
        const body = r.body;
        expect(body.message).equals(
          "Parameter 'value' must be url encoded. Its value may not contain reserved characters.",
        );
      }));

  it('should may allow reserved characters when allowedReserved: true', async () =>
    request(app)
      .get(`${app.basePath}/allow_reserved?value=ThisHas$ReservedChars!`)
      .expect(200));
});
