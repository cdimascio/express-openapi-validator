import * as express from 'express';
import * as path from 'path';
import * as request from 'supertest';
import * as packageJson from '../package.json';
import { createApp } from './common/app';
import { AppWithServer } from './common/app.common';

describe.skip(packageJson.name, () => {
  let app: AppWithServer;
  after(() => {
    app.server.close();
  });

  it('should propagate missing spec to err handler', async () => {
    const apiSpec = path.join('test', 'resources', 'does-not-exist.yaml');
    app = await createApp({ apiSpec, coerceTypes: false }, 3005, (app) =>
      app.use(
        `/`,
        express.Router().get(`/test`, (req, res) => {
          res.json(req.body);
        }),
      ),
    );

    request(app).get('/test').expect(500);
  });
});
