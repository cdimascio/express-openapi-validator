import path from 'path';
import express from 'express';
import request from 'supertest';
import { ExpressWithServer, createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app: ExpressWithServer;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'circular.yaml');
    app = await createApp({ apiSpec }, 3005, (app) =>
      app.use(
        `${app.basePath}`,
        express.Router().post(`/circular`, (req, res) => res.json(req.body)),
      ),
    );
  });

  after(async () => {
    await app.closeServer();
  });

  it('should validate circular ref successfully', async () =>
    request(app)
      .post(`${app.basePath}/circular`)
      .send({
        id: 1,
        name: 'dad',
        favorite: {
          id: 1,
          name: 'dad',
        },
        children: [
          { id: 2, name: 'tyler' },
          { id: 3, name: 'taylor' },
        ],
      })
      .expect(200));
});
