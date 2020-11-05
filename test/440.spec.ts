import * as express from 'express';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';
import { OpenAPIV3 } from '../src/framework/types';

describe(packageJson.name, () => {
  let app = null;

  before(async () => {
    // Set up the express app
    const apiSpec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Api test', version: '1.0.0' },
      servers: [{ url: '/api' }],
      paths: {
        '/test/{id}': {
          description: 'Description',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          get: {
            responses: {
              '200': {
                description: 'response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        label: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    app = await createApp({
      apiSpec,
      validateRequests: true,
      validateResponses: true, 
    }, 3005, (app) =>
      app.use(
        express
          .Router()
          .post(`/test/abc123`, (req, res) => res.status(200).json(req.body)),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('create campaign should return 200', async () =>
    request(app).post(`/test/abc123`).send({ id: 'abc123' }).expect(200));
});
