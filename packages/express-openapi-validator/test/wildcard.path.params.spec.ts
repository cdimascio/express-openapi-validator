import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

describe('wildcard path params', () => {
  let app = null;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'wildcard.path.params.yaml');
    app = await createApp(
      {
        apiSpec,
      },
      3001,
      (app) => {
        app
          .get(`${app.basePath}/d1/:id`, (req, res) =>
            res.json({
              ...req.params,
            }),
          )
          .get(`${app.basePath}/d2/:path(*)`, (req, res) =>
            res.json({
              ...req.params,
            }),
          )
          .get(`${app.basePath}/d3/:path(*)`, (req, res) =>
            res.json({
              ...req.params,
            }),
          )
          .get(`${app.basePath}/d3`, (req, res) =>
            res.json({
              success: true,
            }),
          );
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

  it('should allow path param with slashes "/" using wildcard', async () =>
    request(app)
      .get(`${app.basePath}/d2/some/long/path`)
      .expect(200)
      .then((r) => {
        expect(r.body.path).to.equal('some/long/path');
      }));

  it('should return not found if no path is specified', async () =>
    request(app).get(`${app.basePath}/d2`).expect(404));

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
});
