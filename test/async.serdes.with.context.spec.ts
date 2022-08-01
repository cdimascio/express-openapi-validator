import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

import { Forbidden, NotFound } from '../src/openapi.validator';

const apiSpecPath = path.join('test', 'resources', 'async-serdes.yaml');

const notFoundUserId = '5fdefd13a6640bb5fb5fa676';
const forbiddenUserId = '5fdefd13a6640bb5fb5fa677';
const foundUserId = "5fdefd13a6640bb5fb5fa925";

class ObjectID {
  id: string;

  constructor(id: string = foundUserId) {
    this.id = id;
  }

  toString() {
    return this.id;
  }

}

describe('async serdes w/ context', () => {
  let app = null;

  before(async () => {

    function findUser(req, userId) {
      return new Promise((resolve, reject) => {
        try {
          // Note the deserialize function can't easily decide
          // if NotFound *should* result in 404 or 400.
          // The user id might be in a path param -> 404
          // or it might be in a request body -> 400.
          // or in a query parameter -> 400
          // A different layer in the library must figure that out, or the
          // developer has to write a bunch of code to figure it out themselves.
          // Same goes for Forbidden,
          // if its in the path, should 403.
          // if it's in the body, 400.
          // it it's in a query parameter -> 400
          if (userId == notFoundUserId) {
            // Simulate a not found user
            throw new NotFound({
              path: req.path,
              message: 'Could not find user'
            });
          } else if (userId == forbiddenUserId) {
            // Simulate a not found user
            throw new Forbidden({
              path: req.path,
              message: 'Verboten'
            });
          } else {
            const o = new ObjectID(userId);
            resolve(o);
          }
        } catch (err) {
          reject(err);
        }
      });
    }

    async function deserializeUserId(userId) {
      const req = this;
      if (!req || !req.user || !req.openapi || typeof userId !== 'string') {
        throw new Error('passContext did not result in "this" set to Request on deserialize.');
      }
      return await findUser(req, userId);
    }

    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpecPath,
        validateRequests: {
          coerceTypes: true,
          passContext: true,
          filterOneOf: true
        },
        validateResponses: {
          coerceTypes: true,
          passContext: true
        },
        validateFormats: "full",
        serDes: [
          {
            format: "user-id",
            async: true,
            deserialize: deserializeUserId,
            serialize: function (o) {
              const res = this;
              if (!res || !res.send) {
                throw new Error('passContext did not result in "this" set to Response on serialize.');
              }
              return o.toString();
            }
          }
        ]
      },
      3005,
      (app) => {
        app.get([`${app.basePath}/users/:id?`], (req, res) => {
          if (typeof req.params.id !== 'object') {
            throw new Error("Should be deserialized to ObjectId object");
          }
          res.json({
            id: req.params.id,
            id2: req.params.id,
            manager: {
              type: 'PLUS',
              plusUserId: foundUserId
            }
          });
        });
        app.post([`${app.basePath}/users`], (req, res) => {
          if (typeof req.body.id !== 'object') {
            throw new Error("Should be deserialized to ObjectId object");
          }
          res.json(req.body);
        });
        app.use((err, req, res, next) => {
          res.status(err.status ?? 500).json({
            message: err.message,
            code: err.status ?? 500,
            errors: err.errors
          });
        });
      },
      false,
      (app) => {
        app.use((req, res, next) => {
          req.user = {
            id: foundUserId
          };
          next();
        })
      }
    );
    return app
  });

  after(() => {
    app.server.close();
  });

  it('should control BAD id format and throw an error', async () =>
    request(app)
      .get(`${app.basePath}/users/1234`)
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.equal('request/params/id must match pattern "^[0-9a-fA-F]{24}$"');
      }));

  it('should control GOOD id format and get a response in expected format', async () =>
    request(app)
      .get(`${app.basePath}/users/${foundUserId}`)
      .expect(200)
      .then((r) => {
        expect(r.body).to.eql({
          id: foundUserId,
          id2: foundUserId,
          manager: {
            type: 'PLUS',
            plusUserId: foundUserId
          }
        });
      }));

  it('should return 404 when user id in path deserialization throws NotFound', async () =>
    request(app)
      .get(`${app.basePath}/users/${notFoundUserId}`)
      .expect(404)
      .then((r) => {
        expect(r.body.errors[0].message).to.equal('request/params/id Could not find user');
      }));

  it('should return 400 when user id in query throws NotFound', async () =>
    request(app)
      .get(`${app.basePath}/users/${foundUserId}?managerId=${notFoundUserId}`)
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.equal('request/query/managerId Could not find user');
      }));

  it('should return 400 when both query params have errors', async () =>
    request(app)
      .get(`${app.basePath}/users/${foundUserId}?managerId=${notFoundUserId}&anotherManagerId=${forbiddenUserId}`)
      .expect(400)
      .then((r) => {
        expect(r.body.errors.length).to.equal(2);
        expect(r.body.message).to.equal('request/query/managerId Could not find user, request/query/anotherManagerId Verboten');
      }));

  it('should return 400 when user id in query throws Forbidden', async () =>
    request(app)
      .get(`${app.basePath}/users/${foundUserId}?managerId=${forbiddenUserId}`)
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.equal('request/query/managerId Verboten');
      }));

  it('should return 400 with errors specific to PLUSPLUS', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: foundUserId,
        id2: notFoundUserId,
        manager: {
          type: 'PLUSPLUS',
          plusPlusOnly: 123
        }
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        console.info(r.body);
        // Expect only errors from oneOf subschemas with matching discriminator propertyName
        expect(r.body.errors.length).to.equal(3);
        expect(r.body.message).to.equal("request/body/id2 Could not find user, request/body/manager must have required property 'plusPlusUserId', request/body/manager/plusPlusOnly must match pattern \"/[A-Z]+/\"");
      }));

  it('should return 400 with error with invalid oneOf.mapping.propertyName and not found property', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: foundUserId,
        id2: notFoundUserId,
        manager: {
          type: 'BAR'
        }
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        console.info(r.body);
        // Expect only errors from oneOf subschemas with matching discriminator propertyName
        expect(r.body.errors.length).to.equal(2);
        expect(r.body.message).to.equal("request/body/id2 Could not find user, request/body/manager/type must be equal to one of the allowed values: PLUS, PLUSPLUS");
      }));

  it('should return 400 with error with only missing oneOf.mapping.propertyName event if some sub-schema properties are passed', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: foundUserId,
        id2: notFoundUserId,
        manager: {
          plusPlusOnly: 123
        }
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        console.info(r.body);
        expect(r.body.errors.length).to.equal(2);
        expect(r.body.message).to.equal("request/body/id2 Could not find user, request/body/manager must have required property 'type'");
      }));

  it('should return 400 with error with missing oneOf.mapping.propertyName and not found property', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: foundUserId,
        id2: notFoundUserId,
        manager: {}
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        console.info(r.body);
        expect(r.body.errors.length).to.equal(2);
        expect(r.body.message).to.equal("request/body/id2 Could not find user, request/body/manager must have required property 'type'");
      }));

  it('should return 400 when only 1 user id in body throws NotFound', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: foundUserId,
        id2: notFoundUserId,
        manager: {
          type: 'PLUS',
          plusUserId: foundUserId
        }
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.equal('request/body/id2 Could not find user');
      }));

  it('should return 400 when only 1 user id in body throws Forbidden', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: foundUserId,
        id2: forbiddenUserId,
        manager: {
          type: 'PLUS',
          plusUserId: foundUserId
        }
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.equal('request/body/id2 Verboten');
      }));

  it('should return 403 when user id in path deserialization throws Forbidden', async () =>
    request(app)
      .get(`${app.basePath}/users/${forbiddenUserId}`)
      .expect(403)
      .then((r) => {
        expect(r.body.errors[0].message).to.equal('request/params/id Verboten');
      }));

  it('should POST works with deserialize on request then serialize en response', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: foundUserId,
        id2: foundUserId,
        manager: {
          type: 'PLUS',
          plusUserId: foundUserId
        }
      })
      .set('Content-Type', 'application/json')
      .expect(200)
      .then((r) => {
        expect(r.body).to.eql({
          id: foundUserId,
          id2: foundUserId,
          manager: {
            type: 'PLUS',
            plusUserId: foundUserId
          }
        })
      }));

  it('should POST 400 when 1 user id not found, and 1 user id forbidden in body, with good messages', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: notFoundUserId,
        id2: forbiddenUserId,
        manager: {
          type: 'PLUS',
          plusUserId: foundUserId
        }
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        expect(r.body.errors.length).to.equal(2);
        expect(r.body.errors[0].message).to.equal('Could not find user');
        expect(r.body.errors[1].message).to.equal('Verboten');
      }));
});
