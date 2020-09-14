import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

const apiSpecPath = path.join('test', 'resources', 'formats.yaml');

describe('path params', () => {
  let app = null;

  before(async () => {
    // set up express app
    app = await createApp(
      { apiSpec: apiSpecPath },
      3005,
      (app) => {
        app.get(`${app.basePath}/fees`, (req, res) => {
          res.json([req.query]);
        });
        app.use((err, req, res, next) => {
          console.error(err);
          res.status(err.status ?? 500).json({
            message: err.message,
            code: err.status ?? 500,
          });
        });
      },
      false,
    );
    return app;
  });

  after(() => {
    app.server.close();
  });

  // TODO add tests for min and max float values
  // TODO add tests for min max float and max min float

  it('should handle float type with negative', async () =>
    request(app)
      .get(`${app.basePath}/fees`)
      .query({
        id: 10,
        amount: -10.0,
      })
      .expect(200)
      .then((r) => {
        const body = r.body;
        console.log(body);
        expect(body[0]).to.have.property('amount').that.equals(-10.0);
      }));

  it('should handle float type with 0 value', async () =>
    request(app)
      .get(`${app.basePath}/fees`)
      .query({
        id: 10,
        amount: -0.0,
      })
      .expect(200)
      .then((r) => {
        const body = r.body;
        console.log(body);
        expect(body[0]).to.have.property('amount').that.equals(0.0);
      }));
  it('should handle float type with positive value', async () =>
    request(app)
      .get(`${app.basePath}/fees`)
      .query({
        id: 10,
        amount: 10.0,
      })
      .expect(200)
      .then((r) => {
        const body = r.body;
        console.log(body);
        expect(body[0]).to.have.property('amount').that.equals(10.0);
      }));
});
