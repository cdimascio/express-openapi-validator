import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  const apps = [];
  let basePath = null;

  before(() => {
    const apiSpecPath = path.join('test', 'resources', 'openapi.yaml');
    const apiSpecJson = require('./resources/openapi.json');
    return Promise.all([
      createApp({ apiSpec: apiSpecPath }, 3001),
      createApp({ apiSpec: apiSpecJson }, 3002),
    ]).then(([a1, a2]) => {
      apps.push(a1);
      apps.push(a2);
      basePath = (<any>a1).basePath;
    });
  });

  after(() => {
    apps.forEach(app => app.server.close());
  });

  // [0,1] simulate range of 2 items - each item references an index in `apps`
  [0, 1].forEach(i => {
    describe(`GET ${basePath}/pets`, () => {
      it('should throw 400 on missing required query parameter', async () =>
        request(apps[i])
          .get(`${basePath}/pets`)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(400)
          .then(r => {
            const e = r.body.errors;
            expect(e).to.have.length(2);
            expect(e[0].path).to.equal('.query.limit');
            expect(e[1].path).to.equal('.query.test');
          }));

      it('should respond with json on proper get call', async () =>
        request(apps[i])
          .get(`${basePath}/pets`)
          .query({
            test: 'one',
            limit: 10,
          })
          .set('Accept', 'application/json')
          // .expect('Content-Type', /json/)
          .expect(200));

      it('should return 400 with unknown query parameter', async () =>
        request(apps[i])
          .get(`${basePath}/pets`)
          .query({
            test: 'one',
            limit: 10,
            unknown_param: 'test',
          })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(400));

      it('should return 400 when improper range specified', async () =>
        request(apps[i])
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
            expect(e[0].path).to.contain('limit');
            expect(e[0].message).to.equal('should be >= 5');
          }));

      it('should return 400 when non-urlencoded JSON in query param', async () =>
        request(apps[i])
          .get(`${basePath}/pets`)
          .query(`limit=10&test=one&testJson={"foo": "bar"}`)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .then(r => {
            expect(r.body)
              .to.have.property('message')
              .that.equals(
                "Parameter 'testJson' must be url encoded. Its value may not contain reserved characters.",
              );
          }));

      it('should return 200 when JSON in query param', async () =>
        request(apps[i])
          .get(`${basePath}/pets`)
          .query(
            `limit=10&test=one&testJson=${encodeURIComponent(
              '{"foo": "bar"}',
            )}`,
          )
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200));

      it('should return 400 when improper JSON in query param', async () =>
        request(apps[i])
          .get(`${basePath}/pets`)
          .query({
            limit: 10,
            test: 'one',
            testJson: { foo: 'test' },
          })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(400)
          .then(r => {
            const e = r.body.errors;
            expect(e).to.have.length(1);
            expect(e[0].path).to.contain('testJson');
            expect(e[0].message).to.equal(
              'should be equal to one of the allowed values: bar, baz',
            );
          }));

      it('should return 400 when comma separated array in query param', async () =>
        request(apps[i])
          .get(`${basePath}/pets`)
          .query({
            limit: 10,
            test: 'one',
            testArray: 'foo,bar,baz',
          })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200));

      it('should return 400 when comma separated array in query param is not url encoded', async () =>
        request(apps[i])
          .get(`${basePath}/pets`)
          .query(`limit=10&test=one&testArray=foo,bar,baz`)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(400)
          .then(r => {
            expect(r.body)
              .to.have.property('message')
              .that.equals(
                "Parameter 'testArray' must be url encoded. Its value may not contain reserved characters.",
              );
          }));

      it('should return 200 when separated array in query param', async () =>
        request(apps[i])
          .get(`${basePath}/pets`)
          .query(
            `limit=10&test=one&testArray=${encodeURIComponent('foo,bar,baz')}`,
          )
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200));

      it('should return 400 when improper separated array in query param', async () =>
        request(apps[i])
          .get(`${basePath}/pets`)
          .query({
            limit: 10,
            test: 'one',
            testArray: 'foo,bar,test',
          })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(400)
          .then(r => {
            const e = r.body.errors;
            expect(e).to.have.length(1);
            expect(e[0].path).to.contain('testArray');
            expect(e[0].message).to.equal(
              'should be equal to one of the allowed values: foo, bar, baz',
            );
          }));

      it('should return 200 when array explode in query param', async () =>
        request(apps[i])
          .get(`${basePath}/pets`)
          .query(`limit=10&test=one&testArrayExplode=foo`)
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200));

      it('should return 400 when improper array explode in query param', async () =>
        request(apps[i])
          .get(`${basePath}/pets`)
          .query(
            `limit=10&test=one&testArrayExplode=foo&testArrayExplode=bar&testArrayExplode=test`,
          )
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(400)
          .then(r => {
            const e = r.body.errors;
            expect(e).to.have.length(1);
            expect(e[0].path).to.contain('testArrayExplode');
            expect(e[0].message).to.equal(
              'should be equal to one of the allowed values: foo, bar, baz',
            );
          }));
    });

    describe('POST /pets', () => {
      it('should return 400 if required body is missing', async () =>
        request(apps[i])
          .post(`${basePath}/pets`)
          .set('content-type', 'application/json')
          .expect(400)
          .then(r => {
            const e = r.body.errors;
            expect(e[0].message).to.equal(
              "should have required property 'name'",
            );
          }));

      it('should return 400 if required "name" property is missing', async () =>
        request(apps[i])
          .post(`${basePath}/pets`)
          .send({})
          .expect(400)
          .then(r => {
            const e = r.body.errors;
            expect(e[0].message).to.equal(
              "should have required property 'name'",
            );
          }));

      it('should return 200 when post props are met', async () =>
        request(apps[i])
          .post(`${basePath}/pets`)
          .send({
            name: 'test',
          })
          .expect(200)
          .then(r => {
            expect(r.body.id).to.equal('new-id');
          }));
    });

    describe('when a route defined either in express or openapi, but not both', () => {
      it('should not validate a route defined in express, but not under an openapi basepath', async () =>
        request(apps[i])
          .get('/not_under_an_openapi_basepath')
          .expect(200)
          .then(r => {
            expect(r.body.id).to.equal('/not_under_an_openapi_basepath');
          }));

      it(
        'should return 400 if route is defined in openapi but not express and is ' +
          'called with invalid parameters',
        async () =>
          request(apps[i])
            .get(`${basePath}/route_not_defined_within_express`)
            .expect(400)
            .then(r => {
              const e = r.body.errors;
              expect(e[0].message).to.equal(
                "should have required property 'name'",
              );
            }),
      );

      it('should return 404 if route is defined in swagger but not express', async () =>
        request(apps[i])
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
        request(apps[i])
          .get(`${basePath}/router_1/10`)
          .set('Accept', 'application/json')
          .expect(404)
          .then(r => {
            const e = r.body.errors[0];
            expect(e.message).to.equal('not found');
            expect(e.path).to.equal(`${basePath}/router_1/10`);
          }));

      it('should return 405 if route is defined in swagger but not express and the method is invalid', async () =>
        request(apps[i])
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
        request(apps[i])
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
        request(apps[i])
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
        request(apps[i])
          .post(`${basePath}/pets`)
          .send('<xml>stuff</xml>')
          .set('content-type', 'application/xml')
          .expect(415)
          .then(r => {
            const e = r.body.errors;
            expect(e[0].message).to.equal(
              'unsupported media type application/xml',
            );
          }));

      it('should return 405 when method is not allows', async () =>
        request(apps[i])
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
        return request(apps[i])
          .get(`${basePath}/pets/${id}`)
          .expect(400)
          .then(r => {
            const e = r.body.errors;
            expect(e[0].path).contains('id');
            expect(e[0].message).equals('should be integer');
          });
      });

      it('should return 400 an invalid enum value is given', async () => {
        return request(apps[i])
          .get(`${basePath}/pets`)
          .query({
            limit: 10,
            test: 'one',
            testArray: ['unknown_value'],
          })
          .expect(400)
          .then(r => {
            const e = r.body.errors;
            expect(e[0].message).equals(
              'should be equal to one of the allowed values: foo, bar, baz',
            );
          });
      });

      it('should handle multiple path params with coereion', async () => {
        const id = '10';
        const attributeId = '12';
        return request(apps[i])
          .get(`${basePath}/pets/${id}/attributes/${attributeId}`)
          .expect(200)
          .then(r => {
            expect(r.body.id).equals(Number.parseInt(id));
            expect(r.body.attribute_id).equals(Number.parseInt(attributeId));
          });
      });

      it('should return 200 and get the id from the response', async () => {
        const id = 10;
        return request(apps[i])
          .get(`${basePath}/pets/${id}`)
          .expect(200)
          .then(r => {
            expect(r.body.id).equals(id);
          });
      });
    });
  });
});
