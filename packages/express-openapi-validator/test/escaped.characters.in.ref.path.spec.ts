import * as path from 'path';
import * as express from 'express';
import * as request from 'supertest';
import { createApp } from './common/app';

describe('when escaped characters are in path', () => {
  let app = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'escaped.characters.in.path.yaml');
    app = await createApp({ apiSpec, $refParser: {mode: 'dereference'} }, 3005, app => {
      app.use(
        `${app.basePath}`,
        express
          .Router()
          .post(`/auth/login`, (req, res) => res.json({
            'token': 'SOME_JWT_TOKEN',
            'user': {
              'fullName': 'Eric Cartman',
              'role': 'admin',
            },
          })),
      );
      app.use(
        `${app.basePath}`,
        express
          .Router()
          .post(`/auth/register`, (req, res) => res.status(200).end()),
      );
    });
  });

  after(() => {
    app.server.close();
  });

  // Without option "unsafeRefs" this test will fail
  it('should be able to use an endpoint with some nested paths $ref ', async () =>
    request(app)
      .post(`${app.basePath}/auth/register`)
      .send({
        email: 'jy95@perdu.com',
        password: '123456',
        fullName: 'Eric Cartman',
      })
      .expect(200),
  );

  it('should be able to use an endpoint with some nested paths $ref 2', async () =>
    request(app)
      .post(`${app.basePath}/auth/login`)
      .send({
        email: 'jy95@perdu.com',
        password: '123456',
      })
      .expect(200),
  );

});
