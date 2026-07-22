import * as express from 'express';
import * as request from 'supertest';
import { expect } from 'chai';
import { join } from 'path';
import { createApp } from '../common/app';
import { OpenAPIV3 } from '../../src/framework/types';
import { AppWithServer } from '../common/app.common';

describe('Xquik search security - OpenAPI 3.1', () => {
  let app: AppWithServer;

  before(async () => {
    const apiSpec = join(
      'test',
      'openapi_3.1',
      'resources',
      'xquik_search_security.yaml',
    );
    app = await createApp(
      {
        apiSpec,
        validateRequests: true,
        validateResponses: true,
        validateSecurity: {
          handlers: {
            apiKey: (_req, scopes, schema: OpenAPIV3.ApiKeySecurityScheme) => {
              expect(scopes).to.be.an('array').with.length(0);
              expect(schema.type).to.equal('apiKey');
              expect(schema.in).to.equal('header');
              expect(schema.name).to.equal('x-api-key');
              return true;
            },
          },
        },
      },
      3005,
      (app) =>
        app.use(
          express.Router().get('/api/v1/x/tweets/search', (_req, res) => {
            res.status(200).json({
              tweets: [
                {
                  id: '1234567890',
                  text: 'Just launched our new feature!',
                  author: {
                    id: '9876543210',
                    username: 'xquikcom',
                  },
                },
              ],
              has_next_page: true,
              next_cursor: 'DAACCgACGRElMJcAAA',
            });
          }),
        ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should validate the api key search operation', async () => {
    return request(app)
      .get('/api/v1/x/tweets/search')
      .query({ q: 'openapi', limit: 20 })
      .set('x-api-key', 'test-key')
      .expect(200);
  });
});
