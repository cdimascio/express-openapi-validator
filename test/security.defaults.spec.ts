import path from 'path';
import express from 'express';
import { expect } from 'chai';
import request from 'supertest';
import { ExpressWithServer, createApp } from './common/app';

describe('security.defaults', () => {
  let app: ExpressWithServer;
  let basePath: string;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'security.yaml');
    app = await createApp({ apiSpec }, 3005);
    basePath = app.basePath;

    app.use(
      `${basePath}`,
      express
        .Router()
        .get(`/api_key`, (req, res) => res.json({ logged_in: true }))
        .get(`/cookie_auth`, (req, res) => res.json({ logged_in: true }))
        .get(`/bearer`, (req, res) => res.json({ logged_in: true }))
        .get(`/basic`, (req, res) => res.json({ logged_in: true }))
        .get('/no_security', (req, res) => res.json({ logged_in: true })),
    );
  });

  after(async () => {
    await app.closeServer();
  });

  it('should return 200 if no security', async () =>
    request(app).get(`${basePath}/no_security`).expect(200));

  it('should skip validation, even if auth header is missing for basic auth', async () =>
    request(app)
      .get(`${basePath}/basic`)
      .expect(401)
      .then((r) => {
        expect(r.body)
          .to.have.property('message')
          .that.equals('Authorization header required');
      }));

  it('should skip security validation, even if auth header is missing for bearer auth', async () =>
    request(app)
      .get(`${basePath}/bearer`)
      .expect(401)
      .then((r) => {
        expect(r.body)
          .to.have.property('message')
          .that.equals('Authorization header required');
      }));

  it('should return 401 if cookie auth property is missing', async () =>
    request(app)
      .get(`${basePath}/cookie_auth`)
      .expect(401)
      .then((r) => {
        expect(r.body)
          .to.have.property('message')
          .that.equals("cookie 'JSESSIONID' required");
      }));
});
