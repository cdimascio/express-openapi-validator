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
});
