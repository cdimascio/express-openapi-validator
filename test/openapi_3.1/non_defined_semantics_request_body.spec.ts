import * as request from 'supertest';
import * as express from 'express';
import { createApp } from '../common/app';
import { join } from 'path';
import { AppWithServer } from '../common/app.common';

describe('Request body in operations without well defined semantics - OpenAPI 3.1', () => {
  let app: AppWithServer;

  before(async () => {
    const apiSpec = join(
      'test',
      'openapi_3.1',
      'resources',
      'non_defined_semantics_request_body.yaml',
    );
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

  // In OpenAPI 3.0, methods that RFC7231 does not have explicitly defined semantics for request body (GET, HEAD, DELETE) do not allow request body
  // In OpenAPI 3.1, request body is allowed for these methods. This test ensures that GET it is correctly handled
  it('should validate a request body on GET', async () => {
    return request(app)
      .get(`${app.basePath}/entity`)
      .set('Content-Type', 'application/json')
      .send({ request: 123 })
      .expect(400);
  });

  // Ensures that DELETE it is correctly handled
  it('should validate a request body on DELETE', async () => {
    return request(app)
      .delete(`${app.basePath}/entity`)
      .set('Content-Type', 'application/json')
      .send({ request: 123 })
      .expect(400);
  });
});
