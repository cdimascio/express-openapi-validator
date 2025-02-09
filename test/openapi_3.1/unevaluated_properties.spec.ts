import * as request from 'supertest';
import * as express from 'express';
import { createApp } from '../common/app';
import { join } from 'path';
import { AppWithServer } from '../common/app.common';

describe('Unevaluated Properties in requests', () => {
  let app: AppWithServer;

  before(async () => {
    const apiSpec = join(
      'test',
      'openapi_3.1',
      'resources',
      'unevaluated_properties.yaml',
    );
    app = await createApp({ apiSpec, validateRequests: true }, 3005, (app) =>
      app.use(
        express.Router().post(`/v1/entity`, (_req, res) => {
          res.status(204).json();
        }),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should reject request body with unevaluated properties', async () => {
    return request(app)
      .post(`${app.basePath}/entity`)
      .set('Content-Type', 'application/json')
      .send({ request: '123', additionalProperty: '321' })
      .expect(400);
  });

  it('should accept request body without unevaluated properties', async () => {
    return request(app)
      .post(`${app.basePath}/entity`)
      .set('Content-Type', 'application/json')
      .send({ request: '123' })
      .expect(204);
  });
});
