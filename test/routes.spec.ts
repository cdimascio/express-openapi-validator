const expect = require('chai').expect;
import * as request from 'supertest';
import app from './app';

const packageJson = require('../package.json');

describe(packageJson.name, () => {
  it(`should test something`, () => {
    expect('a').to.equal('a');
  });

  describe('GET /pets', () => {
    it('should throw 400 on missing required query parameter', async () =>
      request(app)
        .get('/v1/pets')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(400)
        .then(r => {
          const e = r.body.errors;
          expect(e).to.have.length(2);
          expect(e[0].path).to.equal('limit');
          expect(e[1].path).to.equal('test');
        }));

    it('should respond with json on proper get call', async () =>
      request(app)
        .get('/v1/pets')
        .query({
          test: 'one',
          limit: 10,
        })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200));

    it('should return 200 with unknown query parameter', async () =>
      request(app)
        .get('/v1/pets')
        .query({
          test: 'one',
          limit: 10,
          bad_param: 'test',
        })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200));

    it('should return 400 when improper range specified', async () =>
      request(app)
        .get('/v1/pets')
        .query({
          test: 'one',
          limit: 2,
        })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(400)
        .then(r => {
          const e = r.body.errors;
          expect(e).to.have.length(1);
          expect(e[0].path).to.equal('limit');
          expect(e[0].message).to.equal('should be >= 5');
        }));
  });

  describe('POST /pets', () => {
    it('should return 400 if required body is missing', async () =>
      request(app)
        .post('/v1/pets')
        .set('content-type', 'application/json')
        .expect(400)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].message).to.equal("should have required property 'name'");
        }));

    it('should return 400 if required "name" property is missing', async () =>
      request(app)
        .post('/v1/pets')
        .send({})
        .expect(400)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].message).to.equal("should have required property 'name'");
        }));

    it('should return 200 when post props are met', async () =>
      request(app)
        .post('/v1/pets')
        .send({
          name: 'test',
        })
        .expect(200)
        .then(r => {
          console.log(r.body);
        }));
  });

  describe('POST failures', () => {
    it('should return 200 when post props are met', async () =>
      request(app)
        .post('/v1/unknown-route')
        .send({
          name: 'test',
        })
        .expect(404)
        .then(r => {
          console.log(r.body);
        }));

    it('should return 415 when media type is not supported', async () =>
      request(app)
        .post('/v1/pets')
        .send('<xml>stuff</xml>')
        .set('content-type', 'application/xml')
        .expect(415)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].message).to.equal(
            'Unsupported Content-Type application/xml'
          );
        }));

    it('should return 405 when method is not allows', async () =>
      request(app)
        .patch('/v1/pets')
        .send({ name: 'test' })
        .expect(405)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].message).to.equal('PATCH method not allowed');
        }));
    // TODO write test when route exists, but doc does not
  });

  describe('GET /pets/:id', () => {
    it('should return 400 when path param should be int, but instead is string', async () => {
      const id = 'my_id';
      return request(app)
        .get(`/v1/pets/${id}`)
        .expect(400)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].path).equals('id');
          expect(e[0].message).equals('should be integer');
        });
    });
    it('should return 200 and get the id from the response', async () => {
      const id = 10;
      return request(app)
        .get(`/v1/pets/${id}`)
        .expect(200)
        .then(r => {
          console.log(r.body);
          expect(r.body.id).equals(id);
        });
    });
  });
});
