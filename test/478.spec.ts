import * as request from 'supertest';
import { OpenAPIV3 } from '../src/framework/types';
import { createApp } from './common/app';

describe('issue #478', () => {
  let app = null;

  before(async () => {
    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpec(),
        validateResponses: {
          onError: (error, body) => {
            console.debug(error);
            console.debug(body);
          },
        },
        validateSecurity: {
          handlers: {
            bearerAuth(req, _scopes, _schema): boolean {
              // check stuff
              return true;
            },
          },
        },
      },
      3001,
      (app) => {
        app.post('/auth', (req, res) => {
          res.json({
            token: 'fake_token',
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

  it('should return 200', async () =>
    request(app)
      .post(`/auth`)
      .send({
        email: 'test@test.com',
        password: 'secret',
        remember_me: true,
      })
      .expect(200));
});

function apiSpec(): OpenAPIV3.Document {
  return {
    openapi: '3.0.3',
    info: {
      title: 'API Elig Admin',
      description: "API d'administration interne de la base d'éligibilité",
      version: '0.1',
    },
    paths: {
      '/auth': {
        post: {
          description: "Autentification d'un utilisateur",
          operationId: 'auth.auth',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/authLogin',
                },
              },
              'application/x-www-form-urlencoded': {
                schema: {
                  $ref: '#/components/schemas/authLogin',
                },
              },
            },
          },
          responses: {
            '200': {
              $ref: '#/components/responses/auth200',
            },
            '400': {
              $ref: '#/components/responses/auth400',
            },
            '401': {
              description: 'Auth NOK',
              content: {
                'text/html': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        $ref: '#/components/schemas/non_empty_string',
                      },
                    },
                    required: ['error'],
                    example: {
                      error: 'Email and or Password invalid.',
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
        email: {
          type: 'string',
          format: 'email',
          pattern: '^.+@.+..+$',
          minLength: 5,
        },
        password: {
          type: 'string',
          format: 'password',
          minLength: 1,
        },
        non_empty_string: {
          type: 'string',
          minLength: 1,
        },
        authLogin: {
          type: 'object',
          properties: {
            email: {
              $ref: '#/components/schemas/email',
            },
            password: {
              $ref: '#/components/schemas/password',
            },
            remember_me: {
              type: 'boolean',
            },
          },
          required: ['email', 'password'],
        },
        authToken: {
          type: 'object',
          properties: {
            token: {
              $ref: '#/components/schemas/non_empty_string',
            },
          },
          required: ['token'],
          example: {
            token:
              'eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxMiwiZW1haWwiOiJhZG1pbkBvdmVhIiwibmFtZSI6IlplIEFkbWluIiwicm9sZXMiOlsiYWRtaW4iXX0sImlhdCI6MTYwMzM1OTM2NCwiZXhwIjoxNjAzMzY2NTY0LCJhdWQiOiJodHRwczovL2FwaS9hdXRoIiwiaXNzIjoiaHR0cHM6Ly9hcGkifQ.HSAR7kD1XcHEZURj5HOq6gk3eEPHqTBNQUIQAoXkhIesrQXQHZd2W1LBmMPmZ2ph',
          },
        },
      },
      responses: {
        auth200: {
          description: 'Auth ok',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/authToken',
              },
            },
          },
        },
        auth400: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    $ref: '#/components/schemas/non_empty_string',
                  },
                },
                required: ['error'],
              },
            },
          },
        },
      },
    },
  };
}
