import * as request from 'supertest';
import * as express from 'express';
import { createApp } from '../common/app';
import { join } from 'path';
import { AppWithServer } from '../common/app.common';

describe('component path item support - OpenAPI 3.1', () => {
  let app: AppWithServer;

  before(async () => {
    const apiSpec = join(
      'test',
      'openapi_3.1',
      'resources',
      'components_path_items.yaml',
    );
    app = await createApp(
      { apiSpec, validateRequests: true, validateResponses: true },
      3005,
      (app) =>
        app.use(
          express.Router().get(`/v1/entity`, (req, res) => {
            res.status(200).json({});
          }),
        ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should support path item on components', async () => {
    return request(app).get(`${app.basePath}/entity`).expect(200);
  });
});
