import * as express from 'express';
import { Server } from 'http';
import * as request from 'supertest';
import * as OpenApiValidator from '../src';
import { OpenAPIV3 } from '../src/framework/types';
import { startServer } from './common/app.common';
import { deepStrictEqual } from 'assert';

describe('#535 - calling `middleware()` multiple times', () => {
  it('does not mutate the API specification', async () => {
    const apiSpec = createApiSpec();

    const app = await createApp(apiSpec);
    await request(app).get('/ping/GNU Sir Terry').expect(200, 'GNU Sir Terry');
    app.server.close();

    deepStrictEqual(apiSpec, createApiSpec());
  });
});

async function createApp(
  apiSpec: OpenAPIV3.Document,
): Promise<express.Express & { server?: Server }> {
  const app = express();

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
