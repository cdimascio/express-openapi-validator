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
      'serialized-deep-object.objects.yaml',
    );
    app = await createApp({ apiSpec }, 3005, (app) =>
      app.use(
        `${app.basePath}`,
        express
          .Router()
          .get(`/deep_object`, (req, res) => res.json(req.query))
          .get(`/deep_object_2`, (req, res) => res.json(req.query)),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should explode deepObject and set default', async () =>
    request(app)
      .get(`${app.basePath}/deep_object_2`)
      .expect(200)
      .then((r) => {
        expect(r.body).to.deep.equals({
          pedestrian: { speed: 1 },
        });
      }));

  it('should explode deepObject query params', async () =>
    request(app)
      .get(`${app.basePath}/deep_object?settings[state]=default`)
      .expect(200)
      .then((r) => {
        const expected = {
          settings: {
            greeting: 'hello',
            state: 'default',
          },
        };
        expect(r.body).to.deep.equals(expected);
      }));

  it('should explode deepObject query params (optional query param)', async () =>
    request(app)
      .get(`${app.basePath}/deep_object`)
      .expect(200)
      .then((r) => {
        const expected = {};
        expect(r.body).to.deep.equals({
          settings: {
            greeting: 'hello',
            state: 'default',
          },
        });
      }));
});
