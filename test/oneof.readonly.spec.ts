import * as path from 'path';
import * as express from 'express';
import * as request from 'supertest';
import { createApp } from './common/app';

describe('one.of readonly', () => {
  let app = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join(__dirname, 'oneof.readonly.yaml');
    app = await createApp({ apiSpec }, 3005, (app) =>
      app.use(
        express
          .Router()
          .post(`${app.basePath}/orders`, (req, res) =>
            res.status(200).json({ success: true }),
          ),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('post type (without readonly id) should pass', async () =>
    request(app)
      .post(`${app.basePath}/orders`)
      .send({ type: 'A' })
      .set('Content-Type', 'application/json')
      .expect(200))
});
