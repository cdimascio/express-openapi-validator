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
        app.get([`${app.basePath}/users/:id?`, `${app.basePath}/users_alt/:id?`], (req, res) => {
          res.json({
            id: req.params.id,
          });
        });
        app.get(`${app.basePath}/users:lookup`, (req, res) => {
          res.json([
            {
              id: req.query.name,
            },
          ]);
        });
        app.get(`${app.basePath}/multi_users/:ids?`, (req, res) => {
          res.json({
            ids: req.params.ids,
          });
        });
        app.use((err, req, res, next) => {
          console.error(err)
          res.status(err.status ?? 500).json({
            message: err.message,
            code: err.status ?? 500,
          });
        });
      },
      false,
    );
    return app
  });

  after(() => {
    app.server.close();
  });

  it('should url decode path parameters (type level)', async () =>
    request(app)
      .get(`${app.basePath}/users/c%20dimascio`)
      .expect(200)
      .then((r) => {
        expect(r.body.id).to.equal('c dimascio');
      }));

  it('should url decode path parameters (path level)', async () =>
      request(app)
        .get(`${app.basePath}/users_alt/c%20dimascio`)
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

  it("should handle :'s in path parameters", async () => {
    await request(app)
      .get(`${app.basePath}/users:lookup`)
      .query({ name: 'carmine' })
      .expect(200)
      .then((r) => {
        expect(r.body).to.be.an('array');
        expect(r.body[0].id).to.equal('carmine');
      });
  
    await request(app)
      .get(`${app.basePath}/users:noSuchEndpoint`)
      .query({ name: 'carmine' })
      .expect(404)
      .then(r => {
        const e = r.body.errors;
        expect(e[0].message).to.equal('not found');
        expect(e[0].path).to.equal(`${app.basePath}/users:noSuchEndpoint`);
      });
   });
});
