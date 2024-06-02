import express, { Request } from 'express';
import request from 'supertest';
import * as OpenApiValidator from '../src';
import { OpenAPIV3, OpenApiValidatorOpts } from '../src/framework/types';
import { ExpressWithServer, startServer } from './common/app.common';

describe('invalid api spec', () => {
  let apiSpec: OpenAPIV3.Document;
  let app: ExpressWithServer;

  beforeEach(() => {
    apiSpec = createApiSpec();
  });

  afterEach(async () => {
    await app.closeServer();
  });

  it('should propagate spec errors when validateApiSpec is true', async () => {
    app = await createApp({
      apiSpec,
    });
    await request(app).get('/dev/hello/echo').expect(500);
  });

  it('should fail gracefully when validateApiSpec is false', async () => {
    app = await createApp({
      apiSpec,
      validateApiSpec: false,
    });
    await request(app).get('/dev/hello/echo').expect(500);
  });
});

async function createApp(
  opts: OpenApiValidatorOpts,
): Promise<ExpressWithServer> {
  const app = express() as ExpressWithServer;
  app.basePath = '';

  app.use(OpenApiValidator.middleware(opts));
  app.use(
    express.Router().get('/dev/hello/echo', (req, res) => {
      res.status(200).send((req as Request).params.value);
    }),
  );

  await startServer(app, 3001);
  return app;
}

function createApiSpec(): OpenAPIV3.Document {
  return {
    openapi: '3.0.3',
    info: {
      title: 'The API',
      version: '1.0.0',
      description: 'Welcome to the API.',
    },
    servers: [{ url: 'http://localhost:54321/v1', description: 'Running' }],
    components: {
      securitySchemes: {
        AuthJWT: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Enter a JSON Web Token (JWT) to be sent with each request in the HTTP **Authorization** header.',
        },
      },
    },
    security: [{ AuthJWT: [] }],
    paths: {
      '/dev/hello/echo': {
        get: {
          security: [],
          summary: 'Responds with the request.',
          description: '',
          responses: { '200': { description: 'OK' } },
          // Incorrect parameters, should be array.
          parameters: { q: 'string' } as unknown as OpenAPIV3.ParameterObject[],
          tags: ['dev/hello'],
        },
      },
      '/dev/hello/err': {
        get: {
          security: [],
          summary: 'Responds with an error.',
          description: '',
          responses: { '500': { description: 'Error' } },
          tags: ['dev/hello'],
        },
      },
    },
    tags: [{ name: 'dev/hello', description: 'API introduction' }],
  };
}
