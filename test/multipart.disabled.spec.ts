import * as express from 'express';
import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app = null;
  before(async () => {
    const apiSpec = path.join('test', 'resources', 'multipart.yaml');
    app = await createApp({ apiSpec, fileUploader: false }, 3003, app =>
      app.use(
        `${app.basePath}`,
        express
          .Router()
          .post(`/sample_2`, (req, res) => res.json(req.body))
          .post(`/sample_1`, (req, res) => res.json(req.body))
          .get('/range', (req, res) => res.json(req.body)),
      ),
    );
  });
  after(() => {
    (<any>app).server.close();
  });
  describe(`multipart disabled`, () => {
    it('should throw 400 when required multipart file field', async () =>
      request(app)
        .post(`${app.basePath}/sample_2`)
        .set('Content-Type', 'multipart/form-data')
        .set('Accept', 'application/json')
        .expect(400)
        .then(e => {
          expect(e.body)
            .has.property('errors')
            .with.length(2);
          expect(e.body.errors[0])
            .has.property('message')
            .equal("should have required property 'file'");
          expect(e.body.errors[1])
            .has.property('message')
            .equal("should have required property 'metadata'");
        }));

    it('should throw 400 when required form field is missing during multipart upload', async () =>
      request(app)
        .post(`${app.basePath}/sample_2`)
        .set('Content-Type', 'multipart/form-data')
        .set('Accept', 'application/json')
        .attach('file', 'package.json')
        .expect(400));

    it('should validate x-www-form-urlencoded form_pa and and form_p2', async () =>
      request(app)
        .post(`${app.basePath}/sample_2`)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Accept', 'application/json')
        .send('form_p1=stuff&form_p2=morestuff')
        .expect(200));

    // TODO make this work when fileUploader i.e. multer is disabled
    it.skip('should return 200 for multipart/form-data with p1 and p2 fields present (with fileUploader false)', async () =>
      request(app)
        .post(`${app.basePath}/sample_1`)
        .set('Content-Type', 'multipart/form-data')
        .field('p1', 'some data')
        .field('p2', 'some data 2')
        .expect(200));

    it('should throw 405 get method not allowed', async () =>
      request(app)
        .get(`${app.basePath}/sample_2`)
        .set('Content-Type', 'multipart/form-data')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .attach('file', 'package.json')
        .field('metadata', 'some-metadata')
        .expect(405));

    it('should throw 415 unsupported media type', async () =>
      request(app)
        .post(`${app.basePath}/sample_2`)
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

    it('should return 400 when improper range specified', async () =>
      request(app)
        .get(`${app.basePath}/range`)
        .query({
          number: 2,
        })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(400)
        .then(r => {
          const e = r.body.errors;
          expect(e).to.have.length(1);
          expect(e[0].path).to.contain('number');
          expect(e[0].message).to.equal('should be >= 5');
        }));
  });
});
