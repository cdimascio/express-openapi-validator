import { expect } from 'chai';
import * as express from 'express';
import { join } from 'path';
import * as request from 'supertest';
import { createApp } from './common/app';

describe('WWW-Authenticate Header', () => {
  let app = null;

  before(async () => {
    app = await createApp(
      { apiSpec: join(__dirname, 'resources/security.yaml') },
      3001,
      (app) =>
        app.use(
          express
            .Router()
            .get('/v1/basic', (req, res) => res.json({ logged_in: true }))
            .get('/v1/bearer', (req, res) => res.json({ logged_in: true })),
        ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('adds "WWW-Authenticate" header on 401 when using basic auth', async () =>
    request(app)
      .get('/v1/basic')
      .expect(401)
      .then((response) => {
        expect(response.header['www-authenticate']).to.equal('Basic');
      }));

  it('does not add "WWW-Authenticate" header on 401 when using bearer auth', async () =>
    request(app)
      .get('/v1/bearer')
      .expect(401)
      .then((response) => {
        expect(response.header['www-authenticate']).to.be.undefined;
      }));
});
