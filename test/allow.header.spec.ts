import { expect } from 'chai';
import * as express from 'express';
import { Server } from 'http';
import * as request from 'supertest';
import * as packageJson from '../package.json';
import * as OpenApiValidator from '../src';
import { OpenAPIV3 } from '../src/framework/types';
import { startServer } from './common/app.common';
import { RequestHandler } from 'express';

interface AppWithServer extends express.Application {
  server: Server;
}

describe(packageJson.name, () => {
  let app: AppWithServer;

  before(async () => {
    app = await createApp() as AppWithServer;
  });

  after(() => {
    if (app && app.server) {
      app.server.close();
    }
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

  const router = express.Router();
  
  const getHandler: RequestHandler = (req, res) => {
    res.json(['cat', 'dog']);
  };
  
  const postHandler: RequestHandler = (req, res) => {
    res.json(req.body);
  };
  
  router.get('/v1/pets/:petId', getHandler);
  router.post('/v1/pets/:petId', postHandler);
  
  app.use(router);

  await startServer(app, 3001);
  return app;
}

function createApiSpec(): OpenAPIV3.DocumentV3 {
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
