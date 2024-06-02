import express from 'express';
import * as OpenApiValidator from '../src';
import { expect } from 'chai';
import request from 'supertest';
import path from 'path';
import { ExpressWithServer, startServer } from './common/app.common';
import { OpenAPIV3 } from '../src/framework/types';

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
  let app: ExpressWithServer;

  before(async () => {
    app = express() as ExpressWithServer;
    app.basePath = '';

    app.use(
      OpenApiValidator.middleware({
        apiSpec: schema,
        operationHandlers: path.join(__dirname, 'resources'),
      }),
    );

    await startServer(app, 3000);
  });

  after(async () => {
    await app.closeServer();
  });

  it('should use default export operation', async () => {
    return request(app)
      .get(`/`)
      .expect(200)
      .then((r) => {
        expect(r.body).to.have.property('success').that.equals(true);
      });
  });
});
