import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe.skip(packageJson.name, () => {
  let app = null;
  after(() => {
    app.server.close();
  });

  it('should propagate missing spec to err handler', async () => {
    const apiSpec = path.join('test', 'resources', 'does-not-exist.yaml');
    app = await createApp({ apiSpec, coerceTypes: false }, 3005, (app) =>
      app.use(
        `/`,
        express.Router().get(`/test`, (req, res) => res.json(req.body)),
      ),
    );

    request(app).get('/test').expect(500);
  });
});
