import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import { AppWithServer } from './common/app.common';

const apiSpecPath = path.join(
  'test',
  'resources',
  'response.validation.defaults.yaml',
);

describe('response validation with type coercion', () => {
  let app: AppWithServer;

  before(async () => {
    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpecPath,
        validateResponses: true,
      },
      3005,
      (app) => {
        app.get(`${app.basePath}/default_inline`, (req, res) => {
          const q = req.query.q;

          if (q === '200') {
            res.status(200).json({ data: 'good' });
          } else if (q === '400') {
            res.status(400).json({ message: 'message', code: 400 });
          } else if (q === '400_bad') {
            res.status(400).json({ bad: 'malformed' });
          }
        });
      },
    );
  });

  after(() => {
    app.server.close();
  });

  it('should validate 200 using explicit response', async () =>
    request(app).get(`${app.basePath}/default_inline?q=200`).expect(200));

  it('should validate undeclared 400 using default response', async () =>
    request(app).get(`${app.basePath}/default_inline?q=400`).expect(400));

  it('should validate undeclared 400 using default response', async () =>
    request(app)
      .get(`${app.basePath}/default_inline?q=400_bad`)
      .expect(500)
      .then((r) => {
        expect(r.body.message).to.include('must have required property');
      }));
});
