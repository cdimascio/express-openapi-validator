import express from 'express';
import path from 'path';
import fs from 'fs';
import { expect } from 'chai';
import request from 'supertest';
import { ExpressWithServer, createApp } from './common/app';
import { Writable } from 'stream';
import { finished } from 'stream/promises';

describe('a multipart request', () => {
  let app: ExpressWithServer;
  const fileNames: string[] = [];

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
      (app) =>
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
            .post(`/sample_*`, (req, res) => res.json(req.body)),
        ),
    );
  });

  beforeEach(() => {
    fileNames.length = 0;
  });

  after(async () => {
    await app.closeServer();
  });

  describe('that contains $refs', () => {
    it('should validate a request body with a schemaObject $ref', async () =>
      request(app)
        .post(`${app.basePath}/sample_4`)
        .set('Content-Type', 'multipart/form-data')
        .attach('image', 'package.json')
        .expect(200));

    it('should validate a requestBody $ref', async () =>
      request(app)
        .post(`${app.basePath}/sample_5`)
        .set('Content-Type', 'multipart/form-data')
        .attach('image', 'package.json')
        .expect(200));

    it('should validate a requestBody $ref that contains a schemaObject $ref', async () =>
      request(app)
        .post(`${app.basePath}/sample_6`)
        .set('Content-Type', 'multipart/form-data')
        .attach('image', 'package.json')
        .expect(200));
  });

  describe('that is malformed or not defined', () => {
    it('should throw 400 when required multipart file field', async () =>
      request(app)
        .post(`${app.basePath}/sample_2`)
        .set('Content-Type', 'multipart/form-data')
        .set('Accept', 'application/json')
        .expect(400)
        .then((e) => {
          expect(e.body).has.property('errors').with.length(1);
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

    it('should throw 405 get method not allowed', async () =>
      request(app)
        .get(`${app.basePath}/sample_2`)
        .set('Content-Type', 'multipart/form-data')
        .set('Accept', 'application/json')
        .attach('file', 'package.json')
        .field('metadata', 'some-metadata')
        .expect('Content-Type', /json/)
        .expect(405));

    it('should throw 415 unsupported media type', async () =>
      request(app)
        .post(`${app.basePath}/sample_2`)
        .send({ test: 'test' })
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/)
        .expect(415)
        .then((r) => {
          expect(r.body).has.property('errors').with.length(1);
          expect(r.body.errors[0])
            .has.property('message')
            .equal('unsupported media type application/json');
        }));
  });

  describe('that is well formed', () => {
    it('should validate application/octet-stream file and metadata', async () => {
      const testImage = `${__dirname}/assets/image.png`;
      const imgStream = fs.createReadStream(testImage);
      const req = request(app)
        .post(`${app.basePath}/sample_3`)
        .set('content-type', 'application/octet-stream');
      const reqStream = new Writable({ write: req.write.bind(req) });
      imgStream.pipe(reqStream);
      await finished(imgStream);
      await req.expect(200);
    });

    it('should validate multipart file and metadata', async () => {
      const array_with_objects = JSON.stringify([{ foo: 'bar' }]);

      await request(app)
        .post(`${app.basePath}/sample_2`)
        .set('Content-Type', 'multipart/form-data')
        .set('Accept', 'application/json')
        .attach('file', 'package.json')
        .field('array_with_objects', array_with_objects)
        .field('metadata', 'some-metadata')
        .expect(200)
        .then((r) => {
          const b = r.body;
          expect(b.files).to.be.an('array').with.length(1);
          expect(b.files[0]).to.have.property('fieldname').to.equal('file');
          expect(b.metadata).to.equal('some-metadata');
        });
      expect(fileNames).to.deep.equal(['package.json']);
    });
  });
});

describe('when request does not use parsers', () => {
  let app: ExpressWithServer;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'multipart.yaml');
    app = await createApp(
      {
        apiSpec,
      },
      3004,
      (app) =>
        app.use(
          `${app.basePath}`,
          express.Router().post(`/sample_7`, (req, res) => res.json('ok')),
        ),
      false,
      false,
    );
  });

  after(async () => {
    await app.closeServer();
  });

  it('should validate that endpoint exists', async () => {
    await request(app)
      .post(`${app.basePath}/sample_7`)
      .set('Content-Type', 'multipart/form-data')
      .expect(200)
      .then((r) => {
        expect(r.body).to.equal('ok');
      });
  });
});
