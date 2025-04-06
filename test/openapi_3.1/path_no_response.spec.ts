import * as request from 'supertest';
import * as express from 'express';
import { createApp } from '../common/app';
import { join } from 'path';
import { AppWithServer } from '../common/app.common';

describe('operation object without response - OpenAPI 3.1', () => {
  let app: AppWithServer;

  before(async () => {
    const apiSpec = join(
      'test',
      'openapi_3.1',
      'resources',
      'path_no_response.yaml',
    );
    app = await createApp(
      { apiSpec, validateRequests: true, validateResponses: true },
      3005,
      (app) =>
        app.use(
          express.Router().get(`/v1`, (req, res) => {
            res.status(200).end();
          }),
        ),
    );
    app;
  });

  after(() => {
    app.server.close();
  });

  // In OpenAPI 3.1 it's possible to have a path without a response defined
  it('should support endpoint with defined operation object without response', () => {
    return request(app).get(`${app.basePath}`).expect(200);
  });
});
