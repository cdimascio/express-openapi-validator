import * as express from 'express';
import { Server } from 'http';
import * as path from 'path';
import * as request from 'supertest';
import * as packageJson from '../package.json';
import { createApp } from './common/app';
import { AppWithServer } from './common/app.common';


describe(packageJson.name, () => {
  let app: AppWithServer;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'circular.yaml');
    app = await createApp({ apiSpec }, 3005, (app) =>
      app.use(
        `${app.basePath}`,
        express.Router().post('/circular', (req, res) => {
          res.json(req.body);
        }),
      ),
    );
  });

  after(() => {
    if (app && app.server) {
      app.server.close();
    }
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
