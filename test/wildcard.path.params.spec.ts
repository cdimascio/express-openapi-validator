import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import { AppWithServer } from './common/app.common';
import * as pkg from '../package.json';

const expressVersion = pkg.devDependencies.express;

describe('wildcard path params', () => {
  let app: AppWithServer;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'wildcard.path.params.yaml');
    app = await createApp(
      {
        apiSpec,
      },
      3001,
      (app) => {
        const firstDigit = expressVersion.match(/\d/)?.[0];
        const pathWildcard = firstDigit === '4'
          ? ':path(*)'
          : '*path';

        app
          .get(`${app.basePath}/d1/:id`, (req, res) => {
            res.json({
              ...req.params,
            });
          })
          .get(`${app.basePath}/d2/${pathWildcard}`, (req, res) => {
            res.json({
              ...req.params,
            });
          })
          .get(`${app.basePath}/d3/${pathWildcard}`, (req, res) => {
            res.json({
              ...req.params,
            });
          })
          .get(`${app.basePath}/d3`, (req, res) => {
            res.json({
              success: true,
            });
          })
          .get(`${app.basePath}/d4/:multi/spaced/${pathWildcard}`, (req, res) => {
            res.json({
              ...req.params,
            });
          })
          .get(`${app.basePath}/d5/:multi/${pathWildcard}`, (req, res) => {
            res.json({
              ...req.params,
            });
          });
      },
    );
  });

  after(() => app.server.close());

  it('should allow path param without wildcard', async () =>
    request(app)
      .get(`${app.basePath}/d1/my-id`)
      .expect(200)
      .then((r) => {
        expect(r.body.id).to.equal('my-id');
      }));

  // TODO - fails with express 4 - wildcard
  it('should allow path param with slashes "/" using wildcard', async () =>
    request(app)
      .get(`${app.basePath}/d2/some/long/path`)
      .expect(200)
      .then((r) => {
        expect(r.body.path).to.equal('some/long/path');
      }));

  it('should return not found if no path is specified', async () =>
    request(app).get(`${app.basePath}/d2`).expect(404));

  // TODO - fails with express 4 - wildcard
  it('should return 200 when wildcard path includes all required params', async () =>
    request(app)
      .get(`${app.basePath}/d3/long/path/file.csv`)
      .query({
        qp: 'present',
      })
      .expect(200));

  it('should 400 when wildcard path is missing a required query param', async () =>
    request(app)
      .get(`${app.basePath}/d3/long/path/file.csv`)
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.include('required');
      }));

  it('should return 200 if root of an existing wildcard route is defined', async () =>
    request(app)
      .get(`${app.basePath}/d3`)
      .expect(200)
      .then((r) => {
        expect(r.body.success).to.be.true;
      }));

  // TODO - fails with express 4 - wildcard
  it('should return 200 when wildcard path includes all required params and multiple path params', async () =>
    request(app)
      .get(`${app.basePath}/d4/one/spaced/two/three/four`)
      .expect(200)
      .then((r) => {
        expect(r.body.multi).to.equal('one');
        expect(r.body.path).to.equal('two/three/four');
      }));

  // TODO - fails with express 4 - wildcard
  it('should return 200 when wildcard path includes all required params and multiple path params', async () =>
    request(app)
      .get(`${app.basePath}/d5/one/two/three/four`)
      .expect(200)
      .then((r) => {
        expect(r.body.multi).to.equal('one');
        expect(r.body.path).to.equal('two/three/four');
      }));
});
