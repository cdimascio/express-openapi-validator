import { expect } from 'chai';
import * as express from 'express';
import * as request from 'supertest';
import { OpenAPIV3 } from '../src/framework/types';
import { createApp } from './common/app';

describe('Allow Header', () => {
  let app = null;

  before(async () => {
    app = await createApp({ apiSpec: createApiSpec() }, 3001, (app) =>
      app.use(
        express
          .Router()
          .get('/v1/pets/:petId', () => ['cat', 'dog'])
          .post('/v1/pets/:petId', (req, res) => res.json(req.body)),
      ),
    );
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
