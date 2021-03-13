import { expect } from 'chai';
import * as express from 'express';
import { Server } from 'http';
import * as request from 'supertest';
import * as packageJson from '../package.json';
import * as OpenApiValidator from '../src';
import { OpenAPIV3 } from '../src/framework/types';
import { startServer } from './common/app.common';

describe(packageJson.name, () => {
  let app = null;

  before(async () => {
    app = await createApp();
  });

  after(() => {
    app.server.close();
  });

  it('adds "Allow" header to 405 - Method Not Allowed', async () =>
    request(app)
      .put('/v1/pets/greebo')
      .expect(405)
      .then((response) => {
        expect(response.header.allow.split(', ')).to.have.members([
          'GET',
          'POST',
        ]);
      }));
});

async function createApp(): Promise<express.Express & { server?: Server }> {
  const app = express();

  app.use(
    OpenApiValidator.middleware({
      apiSpec: createApiSpec(),
      validateRequests: true,
    }),
  );
  app.use(
    express
      .Router()
      .get('/v1/pets/:petId', () => ['cat', 'dog'])
      .post('/v1/pets/:petId', (req, res) => res.json(req.body)),
  );

  await startServer(app, 3001);
  return app;
}

function createApiSpec(): OpenAPIV3.Document {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Petstore API',
      version: '1.0.0',
    },
    servers: [
      {
        url: '/v1/',
      },
    ],
    paths: {
      '/pets/{petId}': {
        parameters: [
          {
            in: 'path',
            name: 'petId',
            required: true,
            schema: { type: 'string' },
          },
        ],
        get: {
          responses: {
            '200': { description: 'GET Pet' },
          },
        },
        post: {
          responses: {
            '200': { description: 'POST Pet' },
          },
        },
      },
    },
  };
}
