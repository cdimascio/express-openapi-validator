import * as path from 'path';
import * as express from 'express';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join(__dirname, 'optional-request-body.yaml');
    app = await createApp({ apiSpec }, 3005, (app) =>
      app.use(
        express.Router().post(`/documents`, (req, res) =>
          res.status(201).json({
            id: 123,
            name: req.body ? req.body.name : '',
          }),
        ),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('create document should return 201', async () =>
    request(app)
      .post(`/documents`)
      .set('Content-Type', 'application/json')
      .expect(201));

  it('create document should return 201 with empty body', async () =>
    request(app)
      .post(`/documents`)
      .expect(201));

  it('return 415', async () =>
    request(app)
      .post(`/documents`)
      .set('Content-Type', 'image/png')
      .send()
      .expect(415));
});
