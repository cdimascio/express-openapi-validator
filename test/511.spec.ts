import * as request from 'supertest';
import { createApp } from './common/app';

describe('511 schema.preprocessor inheritance', () => {
  let app = null;

  before(async () => {
    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpec(),
        validateResponses: true,
      },
      3001,
      (app) => {
        app.post('/example', (req, res) => {
          res.status(201).json({
            object_type: 'PolyObject1',
            shared_prop1: 'sp1',
            shared_prop2: 'sp2',
            polyObject1SpecificProp1: 'poly1',
          });
        });
      },
      false,
    );
    return app;
  });

  after(() => {
    app.server.close();
  });

  it('should return 201', async () =>
    request(app)
      .post(`/example`)
      .send({
        object_type: 'PolyObject1',
        shared_prop1: 'sp1',
        shared_prop2: 'sp2',
        polyObject1SpecificProp1: 'poly1',
      })
      .expect(201));
});

function apiSpec(): any {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Example API',
      version: '0.1.0',
    },
    servers: [
      {
        url: 'https://localhost/',
      },
    ],
    paths: {
      '/example': {
        post: {
          description: 'Request',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PolyObject',
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
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
        PolyObject: {
          type: 'object',
          discriminator: {
            propertyName: 'object_type',
            mapping: {
              PolyObject1: '#/components/schemas/PolyObject1',
              PolyObject2: '#/components/schemas/PolyObject2',
            },
          },
          oneOf: [
            {
              $ref: '#/components/schemas/PolyObject1',
            },
            {
              $ref: '#/components/schemas/PolyObject2',
            },
          ],
        },
        PolyObjectBase: {
          type: 'object',
          required: ['object_type'],
          properties: {
            object_type: {
              type: 'string',
              enum: ['PolyObject1', 'PolyObject2'],
            },
            shared_prop1: {
              type: 'string',
            },
            shared_prop2: {
              type: 'string',
            },
          },
        },
        PolyObject1: {
          allOf: [
            {
              $ref: '#/components/schemas/PolyObjectBase',
            },
            {
              type: 'object',
              properties: {
                polyObject1SpecificProp1: {
                  type: 'string',
                },
              },
            },
          ],
        },
        PolyObject2: {
          allOf: [
            {
              $ref: '#/components/schemas/PolyObjectBase',
            },
            {
              type: 'object',
              properties: {
                polyObject2SpecificProp1: {
                  type: 'string',
                },
              },
            },
          ],
        },
      },
    },
  };
}
