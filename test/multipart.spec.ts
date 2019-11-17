import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app = null;
  before(async () => {
    const apiSpec = path.join('test', 'resources', 'openapi.yaml');
    app = await createApp({ apiSpec }, 3003);
  });
  after(() => {
    (<any>app).server.close();
  });
  describe(`GET .../pets/:id/photos`, () => {
    it('should throw 400 when required multipart file field', async () =>
      request(app)
        .post(`${app.basePath}/pets/10/photos`)
        .set('Content-Type', 'multipart/form-data')
        .set('Accept', 'application/json')
        .expect(400)
        .then(e => {
          expect(e.body)
            .has.property('errors')
            .with.length(1);
          expect(e.body.errors[0])
            .has.property('message')
            .equal('multipart file(s) required');
        }));

    it('should throw 400 when required form field is missing during multipart upload', async () =>
      request(app)
        .post(`${app.basePath}/pets/10/photos`)
        .set('Content-Type', 'multipart/form-data')
        .set('Accept', 'application/json')
        .attach('file', 'package.json')
        .expect(400));

    it('should validate multipart file and metadata', async () =>
      request(app)
        .post(`${app.basePath}/pets/10/photos`)
        .set('Content-Type', 'multipart/form-data')
        .set('Accept', 'application/json')
        .attach('file', 'package.json')
        .field('metadata', 'some-metadata')
        .expect(200)
        .then(r => {
          const b = r.body;
          expect(b.files)
            .to.be.an('array')
            .with.length(1);
          expect(b.files[0])
            .to.have.property('fieldname')
            .to.equal('file');
          expect(b.metadata).to.equal('some-metadata');
        }));

    it('should throw 405 get method not allowed', async () =>
      request(app)
        .get(`${app.basePath}/pets/10/photos`)
        .set('Content-Type', 'multipart/form-data')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .attach('file', 'package.json')
        .field('metadata', 'some-metadata')
        .expect(405));

    it('should throw 415 unsupported media type', async () =>
      request(app)
        .post(`${app.basePath}/pets/10/photos`)
        .send({ test: 'test' })
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/)
        .expect(415)
        .then(r => {
          expect(r.body)
            .has.property('errors')
            .with.length(1);
          expect(r.body.errors[0])
            .has.property('message')
            .equal('unsupported media type application/json');
        }));
  });
});
