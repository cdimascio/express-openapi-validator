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
      {
        apiSpec: apiSpecPath,
        formats: [
          {
            name: 'three-digits',
            type: 'number',
            validate: (v) => /^[0-9]{3}$/.test(v.toString()),
          },
          {
            name: 'three-letters',
            type: 'string',
            validate: (v) => /^[A-Za-z]{3}$/.test(v),
          },
        ],
      },
      3005,
      (app) => {
        app.get(`${app.basePath}/fees`, (req, res) => res.json([req.query]));
        app.all(`${app.basePath}/formats/1`, (req, res) =>
          res.json([req.query]),
        );
        app.use((err, req, res, next) => {
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
        expect(body[0]).to.have.property('amount').that.equals(10.0);
      }));

  // TODO test fails - bug fix me
  it('should require the query parameter number_id has 3 digits', async () =>
    request(app)
      .get(`${app.basePath}/formats/1`)
      .query({
        number_id: 3342,
      })
      .expect(400)
      .then((r) => {
        const body = r.body;
        expect(body.message).to.contain('three-digits');
      }));

  it('should require the query parameter string_id has 3 letters', async () =>
    request(app)
      .get(`${app.basePath}/formats/1`)
      .query({
        string_id: 123,
      })
      .expect(400)
      .then((r) => {
        const body = r.body;
        expect(body.message).to.contain('three-letters');
      }));

  it('should require the query parameter string_id has 3 letters', async () =>
    request(app)
      .post(`${app.basePath}/formats/1`)
      .send({
        string_id: '12',
      })
      .expect(400)
      .then((r) => {
        const body = r.body;
        expect(body.message).to.contain('three-letters');
      }));

  it('should return success if the query parameter string_id has 3 letters', async () =>
    request(app)
      .post(`${app.basePath}/formats/1`)
      .send({
        string_id: 'abc',
      })
      .expect(200));
});
