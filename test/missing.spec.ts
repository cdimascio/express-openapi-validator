import path from 'path';
import express from 'express';
import request from 'supertest';
import { ExpressWithServer, createApp } from './common/app';
import * as packageJson from '../package.json';

describe.skip(packageJson.name, () => {
  let app: ExpressWithServer;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'does-not-exist.yaml');
    app = await createApp({ apiSpec, coerceTypes: false }, 3005, (app) =>
      app.use(
        `/`,
        express.Router().get(`/test`, (req, res) => res.json(req.body)),
      ),
    );
  });

  after(async () => {
    await app.closeServer();
  });

  it('should propagate missing spec to err handler', async () =>
    request(app).get('/test').expect(500));
});
