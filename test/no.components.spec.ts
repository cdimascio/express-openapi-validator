import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import { OpenAPIV3 } from '../src/framework/types';

describe('no components', () => {
  let app = null;

  before(async () => {
    // Set up the express app
    const apiSpec = apiDoc();
    app = await createApp({ apiSpec, validateResponses: true }, 3005, (app) =>
      app.use(
        `${app.basePath}`,
        express
          .Router()
          .get(`/ping`, (req, res) => res.json({ success: true })),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should pass if /components is not present', async () =>
    request(app)
      .get(`${app.basePath}/ping`)
      .expect(200)
      .then((r) => {
        expect(r.body.success).to.equal(true);
      }));
});

function apiDoc(): OpenAPIV3.Document {
  return {
    openapi: '3.0.1',
    info: {
      version: '1.0.0',
      title: 'no components',
      description: 'no components',
    },
    servers: [
      {
        url: '/v1',
      },
    ],
    paths: {
      '/ping': {
        get: {
          description: 'ping',
          responses: {
            '200': {
              description: 'pong',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                      },
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
}
