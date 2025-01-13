import * as path from 'path';
import * as express from 'express';
import * as request from 'supertest';
import { createApp } from './common/app';

// NOTE/TODO: These tests modify eovConf.validateSecurity.handlers
// Thus test execution order matters :-(
describe('security.disabled', () => {
  let app = null;
  let basePath = null;
  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'security.yaml');
    app = await createApp({ apiSpec, validateSecurity: false }, 3005);
    basePath = app.basePath;
    app.use(
      `${basePath}`,
      express
        .Router()
        .get(`/api_key`, (req, res) => res.json({ logged_in: true }))
        .get(`/bearer`, (req, res) => res.json({ logged_in: true }))
        .get(`/basic`, (req, res) => res.json({ logged_in: true }))
        .get('/no_security', (req, res) => res.json({ logged_in: true })),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should return 200 if no security', async () =>
    request(app)
      .get(`${basePath}/no_security`)
      .expect(200));

  it('should skip validation, even if auth header is missing for basic auth', async () => {
    return request(app)
      .get(`${basePath}/basic`)
      .expect(200);
  });

  it('should skip security validation, even if auth header is missing for bearer auth', async () => {
    return request(app)
      .get(`${basePath}/bearer`)
      .expect(200);
  });
});
