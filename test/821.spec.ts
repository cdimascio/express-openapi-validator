import express from 'express';
import request from 'supertest';
import * as OpenApiValidator from '../src';
import { OpenAPIV3 } from '../src/framework/types';
import {
  EovErrorHandler,
  ExpressWithServer,
  startServer,
} from './common/app.common';
import path from 'path';

const apiSpecPath = path.join('test', 'resources', '699.yaml');
const date = new Date();

describe('issue #821 - serialization inside addiotionalProperties', () => {
  let app: ExpressWithServer;

  before(async () => {
    app = await createApp(apiSpecPath);
  });

  after(async () => {
    await app.closeServer();
  });

  it('serializa both outer and inner date in addiotionalProperties', async () =>
    request(app)
      .get('/test')
      .expect(200, {
        outer_date: date.toISOString(),
        other_info: {
          something: {
            inner_date: date.toISOString(),
          },
        },
      }));
});

async function createApp(
  apiSpec: OpenAPIV3.Document | string,
): Promise<ExpressWithServer> {
  const app = express() as ExpressWithServer;
  app.basePath = '';

  app.use(
    OpenApiValidator.middleware({
      apiSpec: apiSpecPath,
      validateRequests: true,
      validateResponses: true,
    }),
  );
  app.get('/test', (req, res) => {
    return res.status(200).json({
      outer_date: date,
      other_info: {
        something: {
          inner_date: date,
        },
      },
    });
  });

  app.use(<EovErrorHandler>((err, req, res, next) => {
    console.error(err); // dump error to console for debug
    res.status(err.status || 500).json({
      message: err.message,
      errors: err.errors,
    });
  }));

  await startServer(app, 3001);
  return app;
}
