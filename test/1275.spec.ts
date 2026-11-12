import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import { AppWithServer } from './common/app.common';

describe('#1275 - literal special characters in paths', () => {
  let app: AppWithServer;

  before(async () => {
    const apiSpec = path.join('test', 'resources', '1275.yaml');
    app = await createApp({ apiSpec }, 3005, (app) => {
      app.get(`${app.basePath}/health`, (req, res) => {
        res.json({ ok: true });
      });
      app.use(app.basePath, (req: any, res, next) => {
        if (!req.openapi) return next();
        res.json({
          route: req.openapi.openApiRoute,
          params: req.openapi.pathParams,
        });
      });
    });
  });

  after(() => app.server.close());

  it('should not break unrelated routes', async () =>
    request(app)
      .get(`${app.basePath}/health`)
      .expect(200)
      .then((r) => expect(r.body.ok).to.be.true));

  it('should match literal parentheses and quotes', async () =>
    request(app)
      .get(`${app.basePath}/People('ann')`)
      .expect(200)
      .then((r) => {
        expect(r.body.route).to.equal("/v1/People('{name}')");
        expect(r.body.params).to.deep.equal({ name: 'ann' });
      }));

  it('should match literal parentheses and exclamation mark', async () =>
    request(app)
      .get(`${app.basePath}/Orders(42)/Items!`)
      .expect(200)
      .then((r) => {
        expect(r.body.route).to.equal('/v1/Orders({id})/Items!');
        expect(r.body.params).to.deep.equal({ id: 42 });
      }));

  it('should match a literal plus', async () =>
    request(app)
      .get(`${app.basePath}/files/7+meta`)
      .expect(200)
      .then((r) => {
        expect(r.body.route).to.equal('/v1/files/{id}+meta');
        expect(r.body.params).to.deep.equal({ id: 7 });
      }));

  it('should match a literal asterisk and brackets', async () =>
    request(app)
      .get(`${app.basePath}/a*b/[7]`)
      .expect(200)
      .then((r) => {
        expect(r.body.route).to.equal('/v1/a*b/[{id}]');
        expect(r.body.params).to.deep.equal({ id: 7 });
      }));

  it('should not treat a literal asterisk as a wildcard', async () =>
    request(app).get(`${app.basePath}/aXb/[7]`).expect(404));

  it('should still validate path params', async () =>
    request(app)
      .get(`${app.basePath}/Orders(abc)/Items!`)
      .expect(400)
      .then((r) => expect(r.body.message).to.include('must be integer')));

  it('should keep param names that are not plain identifiers', async () =>
    request(app)
      .get(`${app.basePath}/users/ann`)
      .expect(200)
      .then((r) => {
        expect(r.body.route).to.equal('/v1/users/{user-id}');
        expect(r.body.params).to.deep.equal({ 'user-id': 'ann' });
      }));
});
