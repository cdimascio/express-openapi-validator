import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

const apiSpecPath = path.join('test', 'resources', 'path.params.yaml');

describe('path params', () => {
  let app = null;

  before(async () => {
    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpecPath,
        validateResponses: true,
      },
      3005,
      (app) => {
        app.get(`${app.basePath}/users/:id?`, (req, res) => {
          res.json({
            id: req.params.id,
          });
        });
        app.get(`${app.basePath}/multi_users/:ids?`, (req, res) => {
          res.json({
            ids: req.params.ids,
          });
        });
        app.use((err, req, res, next) => {
          res.status(err.status ?? 500).json({
            message: err.message,
            code: err.status ?? 500,
          });
        });
      },
      false,
    );
  });

  after(() => {
    app.server.close();
  });

  it('should url decode path parameters', async () =>
    request(app)
      .get(`${app.basePath}/users/c%20dimascio`)
      .expect(200)
      .then((r) => {
        expect(r.body.id).to.equal('c dimascio');
      }));

  it('should handle path parameter with style=simple', async () =>
    request(app)
      .get(`${app.basePath}/multi_users/aa,bb,cc`)
      .expect(200)
      .then((r) => {
        expect(r.body.ids).to.deep.equal(['aa', 'bb', 'cc']);
      }));
});
