import * as express from 'express';
import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app = null;
  const fileNames = [];
  before(async () => {
    const apiSpec = path.join('test', 'resources', 'multipart.yaml');
    app = await createApp(
      {
        apiSpec,
        fileUploader: {
          fileFilter: (req, file, cb) => {
            fileNames.push(file.originalname);
            cb(null, true);
          },
        },
      },
      3003,
      app =>
        app.use(
          `${app.basePath}`,
          express
            .Router()
            .post(`/sample_2`, (req, res) => {
              const files = req.files;
              res.status(200).json({
                files,
                metadata: req.body.metadata,
              });
            })
            .post(`/sample_1`, (req, res) => res.json(req.body)),
        ),
    );
  });
  beforeEach(() => {
    fileNames.length = 0;
  });
  after(() => {
    (<any>app).server.close();
  });
  describe(`multipart`, () => {
    it('should throw 400 when required multipart file field', async () =>
      request(app)
        .post(`${app.basePath}/sample_2`)
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
        .post(`${app.basePath}/sample_2`)
        .set('Content-Type', 'multipart/sample_2')
        .set('Accept', 'application/json')
        .attach('file', 'package.json')
        .expect(400));

    it('should validate multipart file and metadata', async () => {
      await request(app)
        .post(`${app.basePath}/sample_2`)
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
        });
      expect(fileNames).to.deep.equal(['package.json']);
    });
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
  });
});
