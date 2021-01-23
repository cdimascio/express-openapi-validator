import 'mocha';
import path from 'path';
import request from 'supertest';
import { expect } from 'chai';
import { createApp } from '../common/app';

describe('a multipart request', () => {
  let server = null;
  const fileNames = [];
  before(async () => {
    const apiSpec = path.join('test', 'multipart', 'multipart.yaml');
    server = await createApp(
      {
        apiSpec,
      },
      3003,
      (r) =>
        r.post('/v1/mp2', (ctx, next) => {
          ctx.body = {
            succes: true,
          };
        }),
    );
  });
  after(() => {
    server.close();
  });

  it('should throw 400 when required multipart file field', async () =>
    request(server)
      .post(`/v1/mp2`)
      .set('Content-Type', 'multipart/form-data')
      .set('Accept', 'application/json')
      .expect(400)
      .then((e) => {
        expect(e.body).has.property('errors').with.length(1);
        expect(e.body.errors[0])
          .has.property('message')
          .equal('multipart file(s) required');
      }));

  it('should return 200 on valid form urlencoded data', async () =>
    request(server)
      .post(`/v1/mp2`)
      .type('form')
      .send({ form_p1: 'test' })
      .expect('Content-Type', /json/)
      .expect(200));

  // it('should validate multipart file and metadata', async () => {
  //   await request(server)
  //     .post(`/v1/mp2`)
  //     .set('Content-Type', 'multipart/form-data')
  //     .set('Accept', 'application/json')
  //     .attach('file', 'package.json')
  //     .field('metadata', 'some-metadata')
  //     .expect(200)
  //     .then((r) => {
  //       const b = r.body;
  //       expect(b.files).to.be.an('array').with.length(1);
  //       expect(b.files[0]).to.have.property('fieldname').to.equal('file');
  //       expect(b.metadata).to.equal('some-metadata');
  //     });
  //   expect(fileNames).to.deep.equal(['package.json']);
  // });
});
