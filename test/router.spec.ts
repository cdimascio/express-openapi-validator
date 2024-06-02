import express from 'express';
import { expect } from 'chai';
import request from 'supertest';
import * as OpenApiValidator from '../src';
import {
  EovErrorHandler,
  ExpressWithServer,
  startServer,
} from './common/app.common';

describe('security.defaults', () => {
  let app: ExpressWithServer;
  let basePath: string;

  before(async () => {
    app = express() as ExpressWithServer;
    basePath = '/api';

    const router = express.Router();
    router.use(
      OpenApiValidator.middleware({
        apiSpec: {
          openapi: '3.0.0',
          info: { version: '1.0.0', title: 'test bug OpenApiValidator' },
          servers: [{ url: 'http://localhost:8080/api/' }],
          paths: {
            '/': { get: { responses: { 200: { description: 'home api' } } } },
          },
        },
      }),
    );

    router.get('/', (req, res) => res.status(200).send('home api\n'));
    router.get('/notDefined', (req, res) =>
      res.status(200).send('url api not defined\n'),
    );

    app.get('/', (req, res) => res.status(200).send('home\n'));
    app.use(basePath, router);

    app.use(<EovErrorHandler>((err, req, res, next) => {
      res.status(err.status ?? 500).json({
        message: err.message,
        errors: err.errors,
      });
    }));

    await startServer(app, 3000);
  });

  after(async () => {
    await app.closeServer();
  });

  it('should return 404 for undocumented route when using Router', async () => {
    return request(app)
      .get(`${basePath}/notDefined`)
      .expect(404)
      .then((r) => {
        expect(r.body).to.have.property('message').that.equals('not found');
      });
  });
});
