import * as path from 'path';
import * as request from 'supertest';
import { createApp } from './common/app';

describe('request body validation coercion', () => {
  let coerceApp = null;
  let nonCoerceApp = null;

  const defineRoutes = (app) => {
    app.post(`${app.basePath}/coercion_test`, (req, res) => {
      res.status(200).send();
    });
  };

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'request.bodies.ref.yaml');
    coerceApp = await createApp(
      {
        apiSpec,
        validateRequests: {
          coerceTypes: true,
        },
        unknownFormats: ['phone-number'],
      },
      3005,
      defineRoutes,
      true,
    );

    nonCoerceApp = await createApp(
      {
        apiSpec,
        unknownFormats: ['phone-number'],
      },
      3006,
      defineRoutes,
      true,
    );
  });

  after(() => {
    coerceApp.server.close();
    nonCoerceApp.server.close();
  });

  it('should return 200 if coercion is enabled and the type is correct', async () =>
    request(coerceApp)
      .post(`${coerceApp.basePath}/coercion_test`)
      .set('accept', 'application/json')
      .set('content-type', 'application/json')
      .send({
        aNumberProperty: 4,
      })
      .expect(200));

  it('should return 200 if coercion is enabled and the type is incorrect but can be coerced', async () =>
    request(coerceApp)
      .post(`${coerceApp.basePath}/coercion_test`)
      .set('accept', 'application/json')
      .set('content-type', 'application/json')
      .send({
        aNumberProperty: '4',
      })
      .expect(200));

  it('should return 400 if coercion is enabled and the type is incorrect and cannot be coerced', async () =>
    request(coerceApp)
      .post(`${coerceApp.basePath}/coercion_test`)
      .set('accept', 'application/json')
      .set('content-type', 'application/json')
      .send({
        aNumberProperty: 'this is a string and definitely not a number',
      })
      .expect(400));

  it('should return 200 if coercion is disabled and the type is correct', async () =>
    request(nonCoerceApp)
      .post(`${nonCoerceApp.basePath}/coercion_test`)
      .set('accept', 'application/json')
      .set('content-type', 'application/json')
      .send({
        aNumberProperty: 4,
      })
      .expect(200));

  it('should return 400 if coercion is disabled and the type is incorrect', async () =>
    request(nonCoerceApp)
      .post(`${nonCoerceApp.basePath}/coercion_test`)
      .set('accept', 'application/json')
      .set('content-type', 'application/json')
      .send({
        aNumberProperty: '4',
      })
      .expect(400));
});
