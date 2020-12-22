import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import * as OpenApiValidator from '../src';

describe('security.defaults', () => {
  let app = express();
  let basePath = '/api';
  let server = null;

  before(async () => {
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

    app.use((err, req, res, next) => {
      res.status(err.status ?? 500).json({
        message: err.message,
        errors: err.errors,
      });
    });

    server = app.listen(3000);
    console.log('server start port 3000');
  });

  after(async () => server.close());

  it('should return 404 for undocumented route when using Router', async () => {
    return request(app)
      .get(`${basePath}/notDefined`)
      .expect(404)
      .then((r) => {
        expect(r.body).to.have.property('message').that.equals('not found');
      });
  });
});
