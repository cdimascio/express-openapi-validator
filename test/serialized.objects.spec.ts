import * as path from 'path';
import * as express from 'express';
import * as request from 'supertest';
import * as packageJson from '../package.json';
import { createApp } from './common/app';

describe(packageJson.name, () => {
  let app = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'serialized.objects.yaml');
    app = await createApp({ apiSpec }, 3005, app =>
      app.use(
        `${app.basePath}`,
        express
          .Router()
          .get(`/serialisable`, (req, res) => res.json({ id: 'test' })),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should deserialize object', async () =>
    request(app)
      .get(`${app.basePath}/serialisable`)
      .query({
        settings: '{"onlyValidated":true}',
      })
      .expect(200));
});
