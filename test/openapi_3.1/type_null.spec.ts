import * as request from 'supertest';
import * as express from 'express';
import { createApp } from '../common/app';
import { join } from 'path';
import { AppWithServer } from '../common/app.common';

describe('type null support - OpenAPI 3.1', () => {
  let app: AppWithServer;

  before(async () => {
    const apiSpec = join('test', 'openapi_3.1', 'resources', 'type_null.yaml');
    app = await createApp(
      { apiSpec, validateRequests: true, validateResponses: true },
      3005,
      (app) =>
        app.use(
          express.Router().get(`/v1/entity`, (req, res) => {
            res.status(200).json({
              property: null,
            });
          }),
        ),
    );
  });

  after(() => {
    app.server.close();
  });

  // In OpenAPI 3.1, nullable = true was replaced by types = [..., null]. This test ensure that it works with Express OpenAPI Validator
  it('should support an API with types set to null', async () => {
    return request(app).get(`${app.basePath}/entity`).expect(200);
  });
});
