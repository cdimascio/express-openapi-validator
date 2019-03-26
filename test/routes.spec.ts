import { expect } from 'chai';
import * as request from 'supertest';
import app from './app';

const packageJson = require('../package.json');
const basePath = (<any>app).basePath;

describe(packageJson.name, () => {
  after(() => {
    (<any>app).server.close();
  });
  it(`should test something`, () => {
    expect('a').to.equal('a');
  });

  describe(`GET ${basePath}/pets`, () => {
    it('should throw 400 on missing required query parameter', async () =>
      request(app)
        .get(`${basePath}/pets`)
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
        .get(`${basePath}/pets`)
        .query({
          test: 'one',
          limit: 10,
        })
        .set('Accept', 'application/json')
        // .expect('Content-Type', /json/)
        .expect(200));

    it('should return 200 with unknown query parameter', async () =>
      request(app)
        .get(`${basePath}/pets`)
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
        .get(`${basePath}/pets`)
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
        .post(`${basePath}/pets`)
        .set('content-type', 'application/json')
        .expect(400)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].message).to.equal("should have required property 'name'");
        }));

    it('should return 400 if required "name" property is missing', async () =>
      request(app)
        .post(`${basePath}/pets`)
        .send({})
        .expect(400)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].message).to.equal("should have required property 'name'");
        }));

    it('should return 200 when post props are met', async () =>
      request(app)
        .post(`${basePath}/pets`)
        .send({
          name: 'test',
        })
        .expect(200)
        .then(r => {
          expect(r.body.id).to.equal('new-id');
        }));
  });

  describe('when a route is not defined in express or not documented in openapi, it', () => {
    it('should not validate a route defined in express, but not under an openapi basepath', async () =>
      request(app)
        .get('/not_under_an_openapi_basepath')
        .expect(200)
        .then(r => {
          expect(r.body.id).to.equal('/not_under_an_openapi_basepath');
        }));

    it('should return 400 if route is defined in openapi but not express and is called with invalid parameters', async () =>
      request(app)
        .get(`${basePath}/route_not_defined_within_express`)
        .expect(400)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].message).to.equal("should have required property 'name'");
        }));

    it('should return 404 if route is defined in swagger but not express', async () =>
      request(app)
        .get(`${basePath}/route_not_defined_within_express`)
        .query({ name: 'test' })
        .expect(404)
        .then(r => {
          const e = r.body;
          // There is no route defined by express, hence the validator verifies parameters,
          // then it fails over to the express error handler. In this case returns empty
          expect(e).to.be.empty;
        }));

    it('should throw 404 on a route defined in express, but not documented in the openapi spec', async () =>
      request(app)
        .get(`${basePath}/router_1/10`)
        .set('Accept', 'application/json')
        .expect(404)
        .then(r => {
          const e = r.body.errors[0];
          expect(e.message).to.equal('not found');
          expect(e.path).to.equal(`${basePath}/router_1/10`);
        }));

    it('should return 405 if route is defined in swagger but not express and media type is invalid', async () =>
      request(app)
        .post(`${basePath}/route_not_defined_within_express`)
        .send()
        .expect(405)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].message).to.equal('POST method not allowed');
          expect(e[0].path).to.equal(
            `${basePath}/route_not_defined_within_express`,
          );
        }));

    it('should return 404 for route not defined in openapi or express', async () =>
      request(app)
        .post(`${basePath}/unknown_route`)
        .send({
          name: 'test',
        })
        .expect(404)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].message).to.equal('not found');
          expect(e[0].path).to.equal(`${basePath}/unknown_route`);
        }));

    it('should return 404 for a route defined in express, but not documented in openapi', async () =>
      request(app)
        .post(`${basePath}/route_defined_in_express_not_openapi`)
        .send({
          name: 'test',
        })
        .expect(404)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].message).to.equal('not found');
          expect(e[0].path).to.equal(
            `${basePath}/route_defined_in_express_not_openapi`,
          );
        }));

    it('should return 415 when media type is not supported', async () =>
      request(app)
        .post(`${basePath}/pets`)
        .send('<xml>stuff</xml>')
        .set('content-type', 'application/xml')
        .expect(415)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].message).to.equal(
            'Unsupported Content-Type application/xml',
          );
        }));

    it('should return 405 when method is not allows', async () =>
      request(app)
        .patch(`${basePath}/pets`)
        .send({ name: 'test' })
        .expect(405)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].message).to.equal('PATCH method not allowed');
        }));
    // TODO write test when route exists, but doc does not
  });

  describe(`GET ${basePath}/pets/:id`, () => {
    it('should return 400 when path param should be int, but instead is string', async () => {
      const id = 'my_id';
      return request(app)
        .get(`${basePath}/pets/${id}`)
        .expect(400)
        .then(r => {
          const e = r.body.errors;
          expect(e[0].path).equals('id');
          expect(e[0].message).equals('should be integer');
        });
    });

    it('should handle multiple path params with coereion', async () => {
      const id = '10';
      const attributeId = '12';
      return (
        request(app)
          .get(`${basePath}/pets/${id}/attributes/${attributeId}`)
          // .expect(200)
          .then(r => {
            console.log(`${basePath}/pets/${id}/attributes/${attributeId}`);
            console.log(r.body);
            expect(r.body.id).equals(Number.parseInt(id));
            expect(r.body.attribute_id).equals(Number.parseInt(attributeId));
          })
      );
    });

    it('should return 200 and get the id from the response', async () => {
      const id = 10;
      return request(app)
        .get(`${basePath}/pets/${id}`)
        .expect(200)
        .then(r => {
          expect(r.body.id).equals(id);
        });
    });
  });
});
