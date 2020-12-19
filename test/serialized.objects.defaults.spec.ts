import * as path from 'path';
import * as express from 'express';
import * as request from 'supertest';
import * as packageJson from '../package.json';
import { expect } from 'chai';
import { createApp } from './common/app';

describe(packageJson.name, () => {
  let app = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join(
      'test',
      'resources',
      'serialized.objects.defaults.yaml',
    );
    app = await createApp({ apiSpec }, 3005, (app) =>
      app.use(
        `${app.basePath}`,
        express.Router().get(`/deep_object`, (req, res) => res.json(req.query)),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should use defaults when empty', async () =>
    request(app)
      .get(`${app.basePath}/deep_object`)
      .expect(200)
      .then((r) => {
        expect(r.body).to.deep.equals({
          pagesort: { page: 1, perPage: 25, field: 'id', order: 'ASC' },
        });
      }));

  it('should use defaults for values not provided', async () =>
    request(app)
      .get(`${app.basePath}/deep_object?pagesort[field]=name`)
      .expect(200)
      .then((r) => {
        expect(r.body).to.deep.equals({
          pagesort: { page: 1, perPage: 25, field: 'name', order: 'ASC' },
        });
      }));
});
