import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

describe('security.top.level', () => {
  let app = null;
  let basePath = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'security.top.level.yaml');
    app = await createApp({ apiSpec }, 3005);
    basePath = app.basePath;

    app.use(
      `${basePath}`,
      express
        .Router()
        .get(`/api_key`, (req, res) => res.json({ logged_in: true }))
        .get(`/api_query_key`, (req, res) => res.json({ logged_in: true }))
        .get(`/api_query_keys`, (req, res) => res.json({ logged_in: true }))
        .get(`/api_key_or_anonymous`, (req, res) =>
          res.json({ logged_in: true }),
        )
        .get('/anonymous', (req, res) => res.json({ logged_in: true }))
        .get('/anonymous_2', (req, res) => res.json({ logged_in: true }))
        .get(`/bearer`, (req, res) => res.json({ logged_in: true })),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should inherit top level security and return 401 if apikey header is missing', async () =>
    request(app)
      .get(`${basePath}/api_key`)
      .expect(401)
      .then(r => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.equals("'X-API-Key' header required");
      }));

  it('should return 200 if apikey exists', async () =>
    request(app)
      .get(`${basePath}/api_key`)
      .set('X-API-Key', 'test')
      .expect(200));

  it('should return 404 if apikey exist, but path doesnt exist', async () =>
    request(app)
      .get(`${basePath}/api_key_undefined_path`)
      .set('X-API-Key', 'test')
      .expect(404)
      .then(r => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.equals('not found');
      }));

  it('should return 405 if apikey exist, but invalid method used', async () =>
    request(app)
      .post(`${basePath}/api_key`)
      .set('X-API-Key', 'test')
      .expect(405)
      .then(r => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.equals('POST method not allowed');
      }));

  it('should return 200 if apikey exist as query param', async () =>
    request(app)
      .get(`${basePath}/api_query_key`)
      .query({ APIKey: 'test' })
      .expect(200));

  it('should return 200 if apikey exist as query param with another query parmeter in the request', async () =>
    request(app)
      .get(`${basePath}/api_query_keys`)
      .query({ APIKey: 'test' })
      .query({ param1: 'anotherTest' })
      .expect(200));

  it(
    'should return 200 if apikey exist as query param with no query parmeter ' +
      'in the request but in the spec',
    async () =>
      request(app)
        .get(`${basePath}/api_query_keys`)
        .query({ APIKey: 'test' })
        .expect(200),
  );
  it('should return 200 if apikey or anonymous', async () =>
    request(app)
      .get(`${basePath}/api_key_or_anonymous`)
      .expect(200));

  it('should override api key with bearer and return 401 if bearer is missing', async () =>
    request(app)
      .get(`${basePath}/bearer`)
      .expect(401)
      .then(r => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.equals(
          'Authorization header required',
        );
      }));

  it('should override api key with bearer and return 200', async () =>
    request(app)
      .get(`${basePath}/bearer`)
      .set('Authorization', 'Bearer XXX')
      .expect(200));

  it('should override api key with anonymous', async () =>
    request(app)
      .get(`${basePath}/anonymous_2`)
      .expect(200));

  it('should override api key with anonymous', async () =>
    request(app)
      .get(`${basePath}/anonymous`)
      .expect(200));
});
