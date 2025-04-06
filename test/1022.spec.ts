import { expect } from 'chai';
import * as express from 'express';
import * as request from 'supertest';
import * as packageJson from '../package.json';
import { OpenAPIV3 } from '../src/framework/types';
import { createApp } from './common/app';
import { AppWithServer } from './common/app.common';

describe(packageJson.name, () => {
  let app: AppWithServer;
  before(async () => {
    // Set up the express app
    const apiSpec: OpenAPIV3.DocumentV3 = {
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
        '/test/{id}:clone': {
          description: 'Description',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],

          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['id'],
                    properties: {
                      id: {
                        type: 'integer',
                      },
                    },
                  },
                },
              },
            },
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

        '/some/*wildcard': {
          parameters: [
            {
              name: 'wildcard',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
              },
            },
          ],
          get: {
            responses: {
              '200': {
                description: 'OK',
              },
            },
          },
        },
      },
    };

    app = await createApp(
      {
        apiSpec,
        validateRequests: true,
        validateResponses: true,
      },
      3005,
      (app) =>
        app.use(
          express
            .Router()
            .get(`/api/test/:id`, (req, res) => {
              res.status(200).json({ id: 'id-test', label: 'label' });
            })
            .post(`/api/test/:id\\:clone`, (req, res) => {
              res.status(200).json({ ...req.body, id: 'id-test' });
            })
            .get('/api/some/*wildcard', (req, res) => {
              const wildcard = (req.params as { wildcard: string }).wildcard;
              console.log(`Wildcard: ${wildcard}`);
              res.status(200).send(`Matched wildcard: ${wildcard}`);
            }),
        ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('GET /test/{id} should return 200', async () =>
    request(app).get(`/api/test/abc123`).expect(200));

  it('POST /test/{id}:clone should return 200', async () =>
    request(app).post(`/api/test/abc123:clone`).send({ id: 10 }).expect(200));

  it('POST /test/{id}:clone should return 400', async () =>
    request(app)
      .post(`/api/test/abc123:clone`)
      .send({ id: 'abc123' })
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.include('id must be integer');
      }));

  it('GET /some/test with wildcard should return 200', async () =>
    request(app).get(`/api/some/test/stuff`).expect(200));
});
