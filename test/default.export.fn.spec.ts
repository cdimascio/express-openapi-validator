import express from 'express';
import * as OpenApiValidator from '../src';
import { expect } from 'chai';
import request from 'supertest';
import path from 'path';
import { ExpressWithServer, startServer } from './common/app.common';
import { OpenAPIV3 } from '../src/framework/types';

describe('default export resolver', () => {
  let app: ExpressWithServer;

  before(async () => {
    app = express() as ExpressWithServer;
    app.basePath = '';

    app.use(
      OpenApiValidator.middleware({
        apiSpec: {
          openapi: '3.0.0',
          info: { version: '1.0.0', title: 'test bug OpenApiValidator' },
          paths: {
            '/': {
              get: {
                operationId: 'test#get',
                'x-eov-operation-handler': 'routes/default-export-fn',
                responses: { 200: { description: 'homepage' } },
              } as OpenAPIV3.OperationObject,
            },
          },
        },
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
        expect(r.body).to.have.property('message').that.equals('It Works!');
      });
  });
});
