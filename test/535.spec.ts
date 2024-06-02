import express from 'express';
import request from 'supertest';
import * as OpenApiValidator from '../src';
import { OpenAPIV3 } from '../src/framework/types';
import { ExpressWithServer, startServer } from './common/app.common';
import { deepStrictEqual } from 'assert';

describe('#535 - calling `middleware()` multiple times', () => {
  let apiSpec: OpenAPIV3.Document;
  let app: ExpressWithServer;

  before(async () => {
    apiSpec = createApiSpec();
    app = await createApp(apiSpec);
  });

  after(async () => {
    await app.closeServer();
  });

  it('does not mutate the API specification', async () => {
    await request(app).get('/ping/GNU Sir Terry').expect(200, 'GNU Sir Terry');
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
    }),
  );
  app.use(
    express.Router().get('/ping/:value', (req, res) => {
      res.status(200).send(req.params.value);
    }),
  );

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
      '/ping/{value}': {
        parameters: [
          {
            in: 'path',
            name: 'value',
            required: true,
            schema: { type: 'string' },
          },
        ],
        get: {
          responses: {
            '200': { description: 'pong!' },
          },
        },
      },
    },
  };
}
