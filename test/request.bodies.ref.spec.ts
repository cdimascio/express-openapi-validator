import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
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
      app => {
        // Define new coercion routes
        app.post(`${app.basePath}/request_bodies_ref`, (req, res) => {
          if (req.header('accept') && req.header('accept').indexOf('text/plain') > -1) {
            res.type('text').send(req.body);
          } else if (req.header('accept') && req.header('accept').indexOf('application/hal+json') > -1) {
            res.type('application/hal+json').send(req.body);
          } else if (req.query.bad_body) {
            const r = req.body;
            r.unexpected_prop = 'bad';
            res.json(r);
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

  it('should return 200 if text/plain request body is satisfied', async () => {
    const stringData = 'my string data';
    return request(app)
      .post(`${app.basePath}/request_bodies_ref`)
      .set('content-type', 'text/plain')
      .set('accept', 'text/plain')
      .send(stringData)
      .expect(200)
      .then(r => {
        expect(r.text).equals(stringData);
      });
  });

  it('should return 400 if testProperty body property is not provided', async () =>
    request(app)
      .post(`${app.basePath}/request_bodies_ref`)
      .send({})
      .expect(400)
      .then(r => {
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
      .then(r => {
        const { body } = r;
        expect(body).to.have.property('testProperty');
      }));

  it('should return 200 if a json suffex is used for content-type', async () =>
    request(app)
      .post(`${app.basePath}/request_bodies_ref`)
      .set('accept', 'application/hal+json')
      .set('content-type', 'application/hal+json')
      .send({
        testProperty: 'abc',
      })
      .expect(200)
      .then(r => {
        const { body } = r;
        expect(r.get('content-type')).to.contain('application/hal+json')
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
      .then(r => {
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
      .then(r => {
        const errors = r.body.errors;
        expect(errors)
          .to.be.an('array')
          .with.length(2);
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
