import * as express from 'express';
import { Server } from 'http';
import * as request from 'supertest';
import * as OpenApiValidator from '../src';
import { OpenAPIV3, OpenApiValidatorOpts } from '../src/framework/types';
import { startServer } from './common/app.common';

describe('invalid api spec', () => {
  it('should propagate spec errors when validateApiSpec is true', async () => {
    const apiSpec = createApiSpec();
    const app = await createApp({
      apiSpec,
    });
    await request(app).get('/dev/hello/echo').expect(500);
    app.server.close();
  });
  it('should fail gracefully when validateApiSpec is false', async () => {
    const apiSpec = createApiSpec();
    const app = await createApp({
      apiSpec,
      validateApiSpec: false,
    });
    await request(app).get('/dev/hello/echo').expect(500);
    app.server.close();
  });
});

async function createApp(
  opts: OpenApiValidatorOpts,
): Promise<express.Express & { server?: Server }> {
  const app = express();

  app.use(OpenApiValidator.middleware(opts));
  app.use(
    express.Router().get('/dev/hello/echo', (req, res) => {
      res.status(200).send((<any>req.params).value);
    }),
  );

  await startServer(app, 3001);
  return app;
}

function createApiSpec(): OpenAPIV3.Document {
  return <any>{
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
          parameters: { q: 'string' }, // <-- THE INCORRECT BIT
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
