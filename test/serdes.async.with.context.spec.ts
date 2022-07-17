import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

import { date, dateTime } from '../src/framework/base.serdes';
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
      if (!req || !req.user || !req.openapi) {
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
          passContext: true
        },
        validateResponses: {
          coerceTypes: true,
          passContext: true
        },
        validateFormats: "full",
        unknownFormats: ['string-list'],
        serDes: [
          date,
          dateTime,
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
          let date = new Date("2020-12-20T07:28:19.213Z");
          res.json({
            id: req.params.id,
            creationDateTime: date,
            creationDate: date,
            shortOrLong: 'a',
            tags: 'a, b, c'
          });
        });
        app.post([`${app.basePath}/users`], (req, res) => {
          if (typeof req.body.id !== 'object') {
            throw new Error("Should be deserialized to ObjectId object");
          }
          if (typeof req.body.creationDate !== 'object' || !(req.body.creationDate instanceof Date)) {
            throw new Error("Should be deserialized to Date object");
          }
          if (typeof req.body.creationDateTime !== 'object' || !(req.body.creationDateTime instanceof Date)) {
            throw new Error("Should be deserialized to Date object");
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
        expect(r.body.id).to.equal(foundUserId);
        expect(r.body.creationDate).to.equal('2020-12-20');
        expect(r.body.creationDateTime).to.equal("2020-12-20T07:28:19.213Z");
      }));

  it('should return 404 when user id in path deserialization throws NotFound', async () =>
    request(app)
      .get(`${app.basePath}/users/${notFoundUserId}`)
      .expect(404)
      .then((r) => {
        expect(r.body.message).to.equal('request/params/id Could not find user');
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

  it('should return 400 when only 1 user id in body throws NotFound', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: foundUserId,
        id2: notFoundUserId,
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20',
        shortOrLong: 'ab',
        tags: 'a, b, c'
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
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20',
        shortOrLong: 'ab',
        tags: 'a, b, c'
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
        expect(r.body.message).to.equal('request/params/id Verboten');
      }));

  it('should POST works with deserialize on request then serialize en response', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: foundUserId,
        id2: foundUserId,
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20',
        shortOrLong: 'ab',
        tags: 'a, b, c'
      })
      .set('Content-Type', 'application/json')
      .expect(200)
      .then((r) => {
        expect(r.body.id).to.equal(foundUserId);
        expect(r.body.creationDate).to.equal('2020-12-20');
        expect(r.body.creationDateTime).to.equal("2020-12-20T07:28:19.213Z");
      }));

  it('should POST 400 when 1 user id not found, and 1 user id forbidden in body, with good messages', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: notFoundUserId,
        id2: forbiddenUserId,
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20',
        shortOrLong: 'ab',
        tags: 'a, b, c'
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        expect(r.body.errors.length).to.equal(2);
        expect(r.body.errors[0].message).to.equal('Could not find user');
        expect(r.body.errors[1].message).to.equal('Verboten');
      }));
});
