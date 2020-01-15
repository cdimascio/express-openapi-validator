import * as path from 'path';
import * as express from 'express';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'path.order.yaml');
    app = await createApp({ apiSpec }, 3005, app =>
      app.use(
        `${app.basePath}`,
        express
          .Router()
          .get(`/users/:id`, (req, res) => res.json({ path: req.path }))
          .post(`/users/jimmy`, (req, res) =>
            res.json({ ...req.body, path: req.path }),
          ),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should match on users test', async () =>
    request(app)
      .get(`${app.basePath}/users/test`)
      .expect(200));

  it('static routes should be matched before dynamic routes', async () =>
    request(app)
      .post(`${app.basePath}/users/jimmy`)
      .send({
        id: 'some_id',
        name: 'sally',
      })
      .expect(200));
});
