import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

import { date, dateTime } from '../src/framework/base.serdes';
import Ajv from 'ajv';
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
            format: "mongo-objectid",
            async: true,
            deserialize: async function (s) {
              const req = this;
              if (!req || !req.user) {
                throw new Error('passContext did not result in "this" set to Request on deserialize.');
              }
              return await new Promise((resolve, reject) => {
                try {
                  if (s == notFoundUserId) {
                    // Simulate a not found user
                    throw new NotFound({
                      path: req.path,
                      message: 'Could not find user'
                    });
                  } else if (s == forbiddenUserId) {
                    // Simulate a not found user
                    throw new Forbidden({
                      path: req.path,
                      message: 'Verboten'
                    });
                  } else {
                    const o = new ObjectID(s);
                    resolve(o);
                  }
                } catch (err) {
                  reject(err);
                }
              });
            },
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
          console.error(err);
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
            id: '5fdefd13a6640bb5fb5fa925'
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
      .get(`${app.basePath}/users/5fdefd13a6640bb5fb5fa925`)
      .expect(200)
      .then((r) => {
        expect(r.body.id).to.equal('5fdefd13a6640bb5fb5fa925');
        expect(r.body.creationDate).to.equal('2020-12-20');
        expect(r.body.creationDateTime).to.equal("2020-12-20T07:28:19.213Z");
      }));

  it('should return 404 when user id in path deserializatoin throws NotFound', async () =>
      request(app)
        .get(`${app.basePath}/users/${notFoundUserId}`)
        .expect(404)
        .then((r) => {
          expect(r.body.message).to.equal('Could not find user');
        }));

  it('should POST also works with deserialize on request then serialize en response', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: '5fdefd13a6640bb5fb5fa925',
        id2: '5fdefd13a6640bb5fb5fa925',
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20',
        shortOrLong: 'ab',
        tags: 'a, b, c'
      })
      .set('Content-Type', 'application/json')
      .expect(200)
      .then((r) => {
        expect(r.body.id).to.equal('5fdefd13a6640bb5fb5fa925');
        expect(r.body.creationDate).to.equal('2020-12-20');
        expect(r.body.creationDateTime).to.equal("2020-12-20T07:28:19.213Z");
      }));

  it('should POST 400 when user id not found in body, with good messages', async () =>
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
          console.info(r.body);
        }));
});
