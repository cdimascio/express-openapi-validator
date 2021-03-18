import { expect } from 'chai';
import * as express from 'express';
import { Server } from 'http';
import { join } from 'path';
import * as request from 'supertest';
import * as OpenApiValidator from '../src';
import { startServer } from './common/app.common';

describe('WWW-Authenticate Header', () => {
  let app = null;

  before(async () => {
    app = await createApp();
  });

  after(() => {
    app.server.close();
  });

  it('adds "WWW-Authenticate" Header on 401 when using basic auth', async () =>
    request(app)
      .get('/v1/basic')
      .expect(401)
      .then((response) => {
        expect(response.header['www-authenticate']).to.equal('Basic');
      }));

  it('does not add "WWW-Authenticate" Header on 401 when using bearer auth', async () =>
    request(app)
      .get('/v1/bearer')
      .expect(401)
      .then((response) => {
        expect(response.header['www-authenticate']).to.be.undefined;
      }));
});

async function createApp(): Promise<express.Express & { server?: Server }> {
  const app = express();

  app.use(
    OpenApiValidator.middleware({
      apiSpec: join(__dirname, 'resources/security.yaml'),
    }),
  );
  app.use(
    express
      .Router()
      .get('/v1/basic', (req, res) => res.json({ logged_in: true }))
      .get('/v1/bearer', (req, res) => res.json({ logged_in: true })),
  );

  await startServer(app, 3001);
  return app;
}
