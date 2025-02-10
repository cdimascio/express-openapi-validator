import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app = null;

  before(async () => {
    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpec(),
        validateRequests: true,
        validateResponses: true,
      },
      3001,
      (app) => {
        app.post('/ping', (req: any, res: any) => {
          res.json({
            id: req.body.id,
            message: 'Pong!',
          });
        });
      },
      false,
    );
  });

  after(() => {
    app.server.close();
  });

  it('should not throw an error when more than one example uses the same the value for a property "id"', async () =>
    request(app)
      .post('/ping')
      .send({ id: 'id', message: 'Ping!' })
      .expect(200));
});

function apiSpec(): any {
  return {
    openapi: '3.0.0',
    info: {
      version: 'v1',
      title: 'Validation Error',
      description:
        'A test spec that triggers an validation error on identical id fields in examples.',
    },
    paths: {
      '/ping': {
        post: {
          description: 'ping then pong!',
          operationId: 'ping',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Data',
                },
                examples: {
                  request1: {
                    summary: 'Request 1',
                    value: {
                      id: 'Some_ID_A',
                      message: 'Ping!',
                    },
                  },
                  request2: {
                    summary: 'Request 2',
                    value: {
                      id: 'Some_ID_A',
                      message: 'Ping!',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Data',
                  },
                  examples: {
                    response1: {
                      summary: 'Response 1',
                      value: {
                        id: 'Some_ID_B',
                        message: 'Pong!',
                      },
                    },
                    response2: {
                      summary: 'Response 2',
                      value: {
                        id: 'Some_ID_B',
                        message: 'Pong!',
                      },
                    },
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
        Data: {
          required: ['id', 'message'],
          properties: {
            id: {
              type: 'string',
            },
            message: {
              type: 'string',
            },
          },
        },
      },
      examples: {
        example1: {
          summary: 'Example 1',
          value: {
            id: 'Some_ID_C',
            message: 'Example!',
          },
        },
        response2: {
          summary: 'Example 2',
          value: {
            id: 'Some_ID_C',
            message: 'Example!',
          },
        },
      },
    },
  };
}
