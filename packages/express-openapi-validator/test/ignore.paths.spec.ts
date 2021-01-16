import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

describe('ignorePaths as RegExp', () => {
  let app = null;
  let basePath = null;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'ignore.paths.yaml');
    app = await createApp(
      { apiSpec, ignorePaths: /.*\/hippies$/ },
      3005,
      app => {
        app.all('/v1/hippies', (req, res) => {
          res.json([
            { id: 1, name: 'farah' },
            { id: 2, name: 'fred' },
          ]);
        });
        app.get('/v1/hippies/1', (req, res) => {
          res.json({ id: 1, name: 'farah' });
        });
        app.get('/v1/pets/1', (req, res) => {
          res.json({ id: 1, name: 'sparky' });
        });
        // app.get('/v1/route_defined_in_express_only', (req, res) => {
        //   res.json({ hi: 'there' });
        // });
      },
    );
    basePath = app.basePath;
  });

  after(() => app.server.close());

  it('should ignore path and return 200, rather than validate', async () =>
    request(app)
      .get(`${basePath}/hippies`)
      .query({
        test: 'one',
        limit: 2,
      })
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200));

  it('should ignore path and return 200, rather than validate', async () =>
    request(app)
      .post(`${basePath}/hippies?test`)
      .query({
        test: 'one',
        limit: 2,
      })
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200));

  it('should not ignore path and return 404', async () =>
    request(app)
      .get(`${basePath}/hippies/1`)
      .query({
        test: 'one',
        limit: 2,
      })
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(404));

  describe(`GET ${basePath}/pets/:id`, () => {
    it('should validate a path within the base path that is not ignored', async () => {
      const id = 'my_id';
      return request(app)
        .get(`${basePath}/pets/${id}`)
        .expect(400)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].path).contains('id');
          expect(e[0].message).equals('should be integer');
        });
    });

    it('should validate a route defined in openapi but not express with invalid params', async () =>
      request(app)
        .get(`${basePath}/route_defined_in_openapi_only`)
        .expect(400)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].message).to.equal("should have required property 'id'");
        }));

    it('should return 404 if route is defined in openapi but not express and params are valid', async () =>
      request(app)
        .get(`${basePath}/route_defined_in_openapi_only`)
        .query({ id: 123 })
        .expect(404)
        .then(r => {
          const e = r.body;
          // There is no route defined by express, hence the validator verifies parameters,
          // then it fails over to the express error handler. In this case returns empty
          expect(e).to.be.empty;
        }));
  });
});

describe('ignorePaths as Function', () => {
  let app = null;
  let basePath = null;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'ignore.paths.yaml');

    app = await createApp(
      { apiSpec, ignorePaths: (path) => path.endsWith('/hippies') },
      3005,
      app => {
        app.all('/v1/hippies', (req, res) => {
          res.json([
            { id: 1, name: 'farah' },
            { id: 2, name: 'fred' },
          ]);
        });
        app.get('/v1/hippies/1', (req, res) => {
          res.json({ id: 1, name: 'farah' });
        });
        app.get('/v1/pets/1', (req, res) => {
          res.json({ id: 1, name: 'sparky' });
        });
      },
    );
    basePath = app.basePath;
  });

  after(() => app.server.close());

  it('should ignore path and return 200, rather than validate', async () =>
    request(app)
      .get(`${basePath}/hippies`)
      .query({
        test: 'one',
        limit: 2,
      })
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200));

  it('should ignore path and return 200, rather than validate', async () =>
    request(app)
      .post(`${basePath}/hippies?test`)
      .query({
        test: 'one',
        limit: 2,
      })
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200));

  it('should not ignore path and return 404', async () =>
    request(app)
      .get(`${basePath}/hippies/1`)
      .query({
        test: 'one',
        limit: 2,
      })
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(404));

  describe(`GET ${basePath}/pets/:id`, () => {
    it('should validate a path within the base path that is not ignored', async () => {
      const id = 'my_id';
      return request(app)
        .get(`${basePath}/pets/${id}`)
        .expect(400)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].path).contains('id');
          expect(e[0].message).equals('should be integer');
        });
    });

    it('should validate a route defined in openapi but not express with invalid params', async () =>
      request(app)
        .get(`${basePath}/route_defined_in_openapi_only`)
        .expect(400)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].message).to.equal("should have required property 'id'");
        }));

    it('should return 404 if route is defined in openapi but not express and params are valid', async () =>
      request(app)
        .get(`${basePath}/route_defined_in_openapi_only`)
        .query({ id: 123 })
        .expect(404)
        .then(r => {
          const e = r.body;
          // There is no route defined by express, hence the validator verifies parameters,
          // then it fails over to the express error handler. In this case returns empty
          expect(e).to.be.empty;
        }));
  });
});
