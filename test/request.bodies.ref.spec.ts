import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe('request bodies', () => {
  let app = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'request.bodies.ref.yaml');
    app = await createApp(
      {
        apiSpec,
        validateResponses: true,
        unknownFormats: ['phone-number'],
      },
      3005,
      (app) => {
        // Define new coercion routes
        app
          .post(`${app.basePath}/415_test`, (req, res) => ({
            success: true,
            ...req,
          }))
          .post(`${app.basePath}/request_bodies_ref`, (req, res) => {
            if (req.query.bad_body) {
              const r = req.body;
              r.unexpected_prop = 'bad';
              res.json(r);
            } else if (req.header('accept')) {
              res.type(req.header('accept')).send(req.body);
            } else {
              res.json(req.body);
            }
          });
      },
      true,
    );
  });

  after(() => {
    app.server.close();
  });

  it('should return 415 for undeclared media type', async () =>
    request(app)
      .post(`${app.basePath}/415_test`)
      .set('accept', 'text/plain')
      .expect(415)
      .then((r) => {
        expect(r.body.message).includes('unsupported media type');
      }));

  it('should return 200 if text/plain request body is satisfied', async () => {
    const stringData = 'my string data';
    return request(app)
      .post(`${app.basePath}/request_bodies_ref`)
      .set('content-type', 'text/plain')
      .set('accept', 'text/plain')
      .send(stringData)
      .expect(200)
      .then((r) => {
        expect(r.text).equals(stringData);
      });
  });

  it('should return 200 if text/html request body is satisfied by */*', async () => {
    const stringData = '<html><body>my html data</body></html>';
    return request(app)
      .post(`${app.basePath}/request_bodies_ref`)
      .set('content-type', 'text/html')
      .set('accept', 'text/html')
      .send(stringData)
      .expect(200)
      .then((r) => {
        expect(r.get('content-type')).to.contain('text/html');
        expect(r.text).equals(stringData);
      });
  });

  it('should return 200 if application/ld+json request body is satisfied by application/*', async () => {
    request(app)
      .post(`${app.basePath}/request_bodies_ref`)
      .set('accept', 'application/ld+json')
      .set('content-type', 'application/ld+json')
      .send({
        testProperty: 'abc',
      })
      .expect(200)
      .then((r) => {
        const { body } = r;
        expect(r.get('content-type')).to.contain('application/ld+json');
        expect(body).to.have.property('testProperty');
      });
  });

  it('should return 200 if application/vnd.api+json; type=two request body is validated agains the corrent schema', async () => {
    request(app)
      .post(`${app.basePath}/request_bodies_ref`)
      .set('accept', 'application/vnd.api+json; type=two')
      .set('content-type', 'application/vnd.api+json; type=two')
      .send({
        testPropertyTwo: 'abc',
      })
      .expect(200)
      .then((r) => {
        const { body } = r;
        expect(r.get('content-type')).to.contain('application/vnd.api+json');
        expect(r.get('content-type')).to.contain(' type=two');
        expect(body).to.have.property('testPropertyTwo');
      });
  });

  it('should return 400 if testProperty body property is not provided', async () =>
    request(app)
      .post(`${app.basePath}/request_bodies_ref`)
      .send({})
      .expect(400)
      .then((r) => {
        expect(r.body.errors).to.be.an('array');
        expect(r.body.errors).to.have.length(1);
        const message = r.body.errors[0].message;
        expect(message).to.equal(
          "should have required property 'testProperty'",
        );
      }));

  it('should return 200 if testProperty body property is provided', async () =>
    request(app)
      .post(`${app.basePath}/request_bodies_ref`)
      .send({
        testProperty: 'abc',
      })
      .expect(200)
      .then((r) => {
        const { body } = r;
        expect(body).to.have.property('testProperty');
      }));

  it('should return 400 if array is passed (instead of object) and the array includes an object that meets requirements', async () =>
    request(app)
      .post(`${app.basePath}/request_bodies_ref`)
      .send([
        {
          testProperty: 'abc',
        },
      ])
      .expect(400)
      .then((r) => expect(r.body.message).to.include('should be object')));

  it('should return 200 if a json suffex is used for content-type', async () =>
    request(app)
      .post(`${app.basePath}/request_bodies_ref`)
      .set('accept', 'application/hal+json')
      .set('content-type', 'application/hal+json')
      .send({
        testProperty: 'abc',
      })
      .expect(200)
      .then((r) => {
        const { body } = r;
        expect(r.get('content-type')).to.contain('application/hal+json');
        expect(body).to.have.property('testProperty');
      }));

  it('should return 500 if additional response body property is returned', async () =>
    request(app)
      .post(`${app.basePath}/request_bodies_ref`)
      .query({
        bad_body: true,
      })
      .send({
        testProperty: 'abc',
      })
      .expect(500)
      .then((r) => {
        const { body } = r;
        expect(body.message).to.include(
          '.response should NOT have additional properties',
        );
        expect(body.errors[0].message).to.equals(
          'should NOT have additional properties',
        );
      }));

  it('should return 400 if an additional property is encountered', async () =>
    request(app)
      .post(`${app.basePath}/request_bodies_ref`)
      .send({
        testProperty: 'abc',
        invalidProperty: 'abc',
        invalidProperty2: 'abc',
      })
      .expect(400)
      .then((r) => {
        const errors = r.body.errors;
        expect(errors).to.be.an('array').with.length(2);
        expect(errors[0].path).to.equal('.body.invalidProperty');
        expect(errors[0].message).to.equal(
          'should NOT have additional properties',
        );
        expect(errors[1].path).to.equal('.body.invalidProperty2');
        expect(errors[1].message).to.equal(
          'should NOT have additional properties',
        );
      }));
});
