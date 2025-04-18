import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';
import { AppWithServer } from './common/app.common';

describe(packageJson.name, () => {
  let app: AppWithServer;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'nested.routes.yaml');
    const apiRoute = express.Router(),
      nestedRoute = express.Router();
    app = await createApp(
      {
        apiSpec,
        validateRequests: true,
        validateResponses: true,
      },
      3005,
      (app) => {
        app.use(`${app.basePath}`, apiRoute);
        apiRoute.use('/api-path', nestedRoute);
        nestedRoute.get('/pets', (_req, res) => {
          const json = [
            {
              name: 'test',
              tag: 'tag',
            },
          ];
          res.json(json);
        });
      },
      true,
    );
  });

  after(() => {
    app.server.close();
  });

  it('should fail, because response does not satisfy schema', async () =>
    request(app)
      .get(`${app.basePath}/api-path/pets?qparam=test`)
      .send()
      .expect(500)
      .then((r: any) => {
        const e = r.body;
        expect(e.message).to.contain(
          "/response/0 must have required property 'id'",
        );
      }));
});
