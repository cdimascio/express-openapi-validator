import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app = null;

  /**
   * Required to create app for each step, since 'buildMiddleware' is cached by media-type in contentType.
   * So without Each, if 'buildMiddleware' is cached at the previous request with 'application/json',
   * following request with 'application/json; charset = utf-8' won't be evaluated.
   * To avoid any potential error, use beforeEach and afterEach.
   *
   * */
  beforeEach(() => {
    const apiSpec = path.join('test', 'resources', 'openapi.yaml');
    return createApp({ apiSpec }, 3004).then((a) => {
      app = a;
    });
  });

  afterEach(() => {
    (<any>app).server.close();
  });

  it('should throw 400 if required header is missing', async () =>
    request(app)
      .get(`${app.basePath}/pets/10/attributes`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400)
      .then((r) => {
        const e = r.body.errors;
        expect(e).to.have.length(1);
        expect(e[0].path).to.equal('.headers.x-attribute-id');
      }));

  describe(`POST .../pets`, () => {
    it('should find appropriate request body in spec by contentType with charset (compatibility)', async () =>
      request(app)
        .post(`${app.basePath}/pets_charset`)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .send({
          name: 'myPet',
          tag: 'cat',
        })
        .expect(200));

    it('should find appropriate request body in spec by contentType with charset', async () =>
      request(app)
        .post(`${app.basePath}/pets_charset`)
        .set('Content-Type', 'application/json; charset=utf-8')
        .set('Accept', 'application/json; charset=utf-8')
        .send({
          name: 'myPet',
          tag: 'cat',
        })
        .expect(200));

    it('should match mediatype when charset case does not match the case defined in the spec', async () =>
      request(app)
        .post(`${app.basePath}/pets_charset`)
        .set('Content-Type', 'application/json; charset=UTF-8')
        .set('Accept', 'application/json; charset=UTF-8')
        .send({
          name: 'myPet',
          tag: 'cat',
        })
        .expect(200));
  });
});
