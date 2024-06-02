import express from 'express';
import request from 'supertest';
import * as OpenApiValidator from '../src';
import { OpenAPIV3 } from '../src/framework/types';
import { ExpressWithServer, startServer } from './common/app.common';
import { deepStrictEqual } from 'assert';

describe('#577 - Exclude response validation that is not in api spec', () => {
  let apiSpec: OpenAPIV3.Document;
  let app: ExpressWithServer;

  before(async () => {
    apiSpec = createApiSpec();
    app = await createApp(apiSpec);
  });

  after(async () => {
    await app.closeServer();
  });

  it('does not validate responses which are not present in the spec', async () => {
    await request(app).get('/users').expect(200, 'some users');
    await request(app).post('/users').expect(201, 'Created!');
    await request(app).get('/example').expect(200, 'Example indeed');
    deepStrictEqual(apiSpec, createApiSpec());
  });
});

async function createApp(
  apiSpec: OpenAPIV3.Document,
): Promise<ExpressWithServer> {
  const app = express() as ExpressWithServer;
  app.basePath = '';

  app.use(
    OpenApiValidator.middleware({
      apiSpec,
      validateRequests: true,
      validateResponses: true,
      ignoreUndocumented: true,
    }),
  );
  app.get('/users', (req, res) => {
    res.status(200).send('some users');
  });
  app.post('/users', (req, res) => {
    res.status(201).send('Created!');
  });

  app.get('/example', (req, res) => {
    res.status(200).send('Example indeed');
  });

  await startServer(app, 3001);
  return app;
}

function createApiSpec(): OpenAPIV3.Document {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Ping API',
      version: '1.0.0',
    },
    paths: {
      '/users': {
        get: {
          responses: {
            '200': { description: 'pong!' },
          },
        },
      },
    },
  };
}
