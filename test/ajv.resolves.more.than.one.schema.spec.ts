import express from 'express';
import request from 'supertest';
import * as OpenApiValidator from '../src';
import {
  EovErrorHandler,
  ExpressWithServer,
  startServer,
} from './common/app.common';
import { deepStrictEqual } from 'assert';
import { OpenAPIV3 } from '../src/framework/types';

describe('AJV: reference resolves to more than one schema', () => {
  let apiSpec: OpenAPIV3.Document;
  let app: ExpressWithServer;

  before(async () => {
    apiSpec = createApiSpec();
    app = await createApp(apiSpec);
  });

  after(async () => {
    await app.closeServer();
  });

  it('it should ignore x-stoplight properties', async () => {
    await request(app)
      .get('/bear')
      .expect((res) => {
        if (res.text.includes('resolves to more than one schema')) {
          throw new Error('AJV not processing x-stoplight property correctly.');
        }

        if (!res.text.includes('Black Bear')) {
          throw new Error();
        }
      });

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
    express.Router().get('/bear', (req, res) => {
      res.status(200).send({ type: 'Black Bear' });
    }),
  );

  app.use(<EovErrorHandler>((err, req, res, next) => {
    res.status(500).send(err.stack);
  }));

  await startServer(app, 3001);
  return app;
}

function createApiSpec(): OpenAPIV3.Document {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Bear API',
      version: '1.0.0',
    },
    paths: {
      '/bear': {
        parameters: [],
        get: {
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Bear',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Bear: {
          title: 'Bear',
          'x-stoplight': {
            id: 'ug68n9uynqll0',
          },
          properties: {
            type: {
              type: 'string',
            },
          },
        } as OpenAPIV3.SchemaObject,
      },
    },
  };
}
