import * as express from 'express';
import * as OpenApiValidator from '../src';
import { expect } from 'chai';
import * as request from 'supertest';
import * as path from 'path';

const schema = {
  openapi: '3.0.0',
  info: { version: '1.0.0', title: 'test bug OpenApiValidator' },
  servers: [],
  paths: {
    '/': {
      get: {
        operationId: 'anything',
        'x-eov-operation-handler': 'controller-with-default',
        responses: { 200: { description: 'home api' } },
      },
    },
  },
} as const;

describe('default export resolver', () => {
  let server = null;
  let app = express();

  before(async () => {
    app.use(
      OpenApiValidator.middleware({
        apiSpec: schema,
        operationHandlers: path.join(__dirname, 'resources'),
      }),
    );

    server = app.listen(3000);
    console.log('server start port 3000');
  });

  after(async () => server.close());

  it('should use default export operation', async () => {
    return request(app)
      .get(`/`)
      .expect(200)
      .then((r) => {
        expect(r.body).to.have.property('success').that.equals(true);
      });
  });
});
