import * as express from 'express';
import { Server } from 'http';
import * as request from 'supertest';
import * as OpenApiValidator from '../src';
import { OpenAPIV3 } from '../src/framework/types';
import { startServer } from './common/app.common';
import { deepStrictEqual } from 'assert';

describe('AJV: reference resolves to more than one schema', () => {
  it('it should ignore x-stoplight properties', async () => {
    const apiSpec = createApiSpec();

    const app = await createApp(apiSpec);

    await request(app).get('/bear').expect(res => {
      if (res.text.includes('resolves to more than one schema')) {
        throw new Error('AJV not processing x-stoplight property correctly.')
      }

      if (!res.text.includes('Black Bear')) {
        throw new Error()
      }
    })

    app.server.close();

    deepStrictEqual(apiSpec, createApiSpec());
  });
});

async function createApp(
  apiSpec: any,
): Promise<express.Express & { server?: Server }> {
  const app = express();

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

  app.use((err, req, res, next) => {
    res.status(500).send(err.stack)
  })

  await startServer(app, 3001);
  return app;
}

function createApiSpec() {
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
                    $ref: '#/components/schemas/Bear'
                  }
                }
              }
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
            id: 'ug68n9uynqll0'
          },
          properties: {
            type: {
              type: 'string'
            }
          }
        }
      }
    }
  };
}
