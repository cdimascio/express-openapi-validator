import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import { AppWithServer } from './common/app.common';

const apiSpecPath = path.join('test', 'resources', 'response.validation.yaml');

describe('response validation with type coercion', () => {
  let app: AppWithServer;

  before(async () => {
    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpecPath,
        validateResponses: {
          coerceTypes: true,
        },
      },
      3005,
      (app) => {
        app
          .get(`${app.basePath}/boolean`, (req, res) => {
            res.json(req.query.value);
          })
          .get(`${app.basePath}/object`, (req, res) => {
            res.json({
              id: '1', // we expect this to type coerce to number
              name: 'name',
              tag: 'tag',
              bought_at: null,
            });
          });
      },
      false,
    );
  });

  after(() => {
    app.server.close();
  });

  it('should be able to return `true` as the response body', async () =>
    request(app)
      .get(`${app.basePath}/boolean?value=true`)
      .expect(200)
      .then((r: any) => {
        expect(r.body).to.equal(true);
      }));
  it('should coerce id from string to number', async () =>
    request(app).get(`${app.basePath}/object`).expect(200));
});
