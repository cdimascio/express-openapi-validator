import * as request from 'supertest';
import { createApp } from './common/app';

describe('509 schema.preprocessor', () => {
  let app = null;

  before(async () => {
    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpec(),
      },
      3001,
      (app) => {
        app.get('/v1/users/:user_id', (req, res) => {
          res.json([
            {
              id: 1,
              name: 'sparky',
              tag: 'test',
            },
          ]);
        });
      },
      false,
    );
    return app;
  });

  after(() => {
    app.server.close();
  });

  it('should return 200', async () =>
    request(app).get(`${app.basePath}/users/aafasdf`).expect(200));
});

function apiSpec(): any {
  return {
    openapi: '3.0.1',
    info: {
      title: 'service',
      version: 'v1',
    },
    // security: [
    //   {
    //     Authorizer: [],
    //   },
    // ],
    servers: [
      {
        url: 'https://example.com/v1',
        description: 'NA',
      },
      {
        url: 'https://example.com/v1',
        description: 'NA',
      },
    ],
    tags: [
      {
        name: 'Users',
        description: 'NA',
      },
    ],
    paths: {
      '/users/{user_id}': {
        parameters: [
          {
            in: 'path',
            name: 'user_id',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        get: {
          tags: ['Users'],
          description: 'NA',
          summary: 'NA',
          operationId: 'get-user',
          responses: {
            '200': {
              description: 'NA',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      user_id: {
                        type: 'string',
                      },
                      email: {
                        type: 'string',
                        format: 'email',
                      },
                    },
                    required: ['user_id', 'email'],
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      parameters: {
        MemberId: {
          in: 'path',
          name: 'member_id',
          required: true,
          schema: {
            $ref: '#/components/schemas/MemberId',
          },
        },
        PartnerId: {
          in: 'path',
          name: 'partner_id',
          required: true,
          schema: {
            $ref: '#/components/schemas/PartnerId',
          },
        },
      },
      schemas: {
        Error: {
          type: 'object',
        },
        Deleted: {
          type: 'object',
          properties: {
            deleted: {
              type: 'boolean',
              description: 'NA',
              enum: [true],
            },
          },
          required: ['deleted'],
        },
        MemberId: {
          description: 'NA',
          type: 'string',
          format: 'uuid',
        },
        OrganizationId: {
          description: 'NA',
          type: 'string',
          format: 'uuid',
        },
        PartnerId: {
          description: 'NA',
          type: 'string',
          format: 'uuid',
        },
        Role: {
          type: 'string',
          description: 'NA',
        },
        Roles: {
          description: 'NA',
          type: 'array',
          items: {
            $ref: '#/components/schemas/Role',
          },
        },
        ApiKeyDescription: {
          description: 'NA',
          type: 'string',
        },

        Member: {
          allOf: [
            {
              $ref: '#/components/schemas/Resource',
            },
            {
              type: 'object',
              properties: {
                member_id: {
                  $ref: '#/components/schemas/MemberId',
                },
                organization_id: {
                  $ref: '#/components/schemas/OrganizationId',
                },
                roles: {
                  $ref: '#/components/schemas/Roles',
                },
              },
              required: ['member_id', 'organization_id', 'roles'],
            },
          ],
        },
        Resource: {
          type: 'object',
          properties: {
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
            },
          },
          required: ['created_at', 'updated_at'],
        },
      },
      securitySchemes: {},
      responses: {
        UnprocessableEntity: {
          description: 'NA',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        NotFound: {
          description: 'NA',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
    },
  };
}
