import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

const packageJson = require('../package.json');

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
      .expect(200)
      .then(r => {
        console.log(r.body);
      }));
});
