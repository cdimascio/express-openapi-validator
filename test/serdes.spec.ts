import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

import { date, dateTime } from '../src/framework/base.serdes';

const apiSpecPath = path.join('test', 'resources', 'serdes.yaml');

class ObjectID {
  id: string;

  constructor(id: string = "5fdefd13a6640bb5fb5fa925") {
    this.id = id;
  }

  toString() {
    return this.id;
  }

}

class BadDate extends Date {
  public toISOString(): string {
    return "oh no a bad iso date";
  }
}

describe('serdes', () => {
  let app = null;

  before(async () => {
    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpecPath,
        validateRequests: {
          coerceTypes: true
        },
        validateResponses: {
          coerceTypes: true
        },
        serDes: [
          date,
          dateTime,
          {
            format: "mongo-objectid",
            deserialize: (s) => new ObjectID(s),
            serialize: (o) => o.toString(),
          },
        ],
        unknownFormats: ['string-list'],
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
            creationDate: date
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
          console.error(err)
          res.status(err.status ?? 500).json({
            message: err.message,
            code: err.status ?? 500,
          });
        });
      },
      false,
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
        expect(r.body.message).to.equal('request.params.id should match pattern "^[0-9a-fA-F]{24}$"');
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

  it('should POST also works with deserialize on request then serialize en response', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: '5fdefd13a6640bb5fb5fa925',
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20'
      })
      .set('Content-Type', 'application/json')
      .expect(200)
      .then((r) => {
        expect(r.body.id).to.equal('5fdefd13a6640bb5fb5fa925');
        expect(r.body.creationDate).to.equal('2020-12-20');
        expect(r.body.creationDateTime).to.equal("2020-12-20T07:28:19.213Z");
      }));

  it('should POST throw error on invalid schema ObjectId', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: '5fdefd13a6640bb5fb5fa',
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20'
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.equal('request.body.id should match pattern "^[0-9a-fA-F]{24}$"');
      }));

  it('should POST throw error on invalid schema Date', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: '5fdefd13a6640bb5fb5fa925',
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-1f-20'
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.equal('request.body.creationDate should match format "date"');
      }));

});



describe('serdes serialize response components only', () => {
  let app = null;

  before(async () => {
    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpecPath,
        validateRequests: {
          coerceTypes: true
        },
        validateResponses: {
          coerceTypes: true
        },
        serDes: [
          date.serializer,
          dateTime.serializer,
          {
            format: "mongo-objectid",
            serialize: (o) => o.toString(),
          },
        ],
        unknownFormats: ['mongo-objectid', 'string-list'],
      },
      3005,
      (app) => {
        app.get([`${app.basePath}/users/:id?`], (req, res) => {
          if (typeof req.params.id !== 'string') {
            throw new Error("Should be not be deserialized to ObjectId object");
          }
          let date = new Date("2020-12-20T07:28:19.213Z");
          let result = {
            id: new ObjectID(req.params.id),
            creationDateTime: date,
            creationDate: undefined,
          };
          if (req.query.baddateresponse === 'functionNotExists') {
            result.creationDate = new ObjectID();
          }
          else if (req.query.baddateresponse === 'functionBadFormat') {
            result.creationDate = new BadDate();
          }
          else {
            result.creationDate = date;
          }
          res.json(result);
        });
        app.post([`${app.basePath}/users`], (req, res) => {
          if (typeof req.body.id !== 'string') {
            throw new Error("Should NOT be deserialized to ObjectId object");
          }
          if (typeof req.body.creationDate !== 'string') {
            throw new Error("Should NTO be deserialized to Date object");
          }
          if (typeof req.body.creationDateTime !== 'string') {
            throw new Error("Should NOT be deserialized to Date object");
          }
          req.body.id = new ObjectID(req.body.id);
          req.body.creationDateTime = new Date(req.body.creationDateTime);
          // We let creationDate as String and it should also work (either in Date Object ou String 'date' format)
          res.json(req.body);
        });
        app.use((err, req, res, next) => {
          console.error(err)
          res.status(err.status ?? 500).json({
            message: err.message,
            code: err.status ?? 500,
          });
        });
      },
      false,
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
        expect(r.body.message).to.equal('request.params.id should match pattern "^[0-9a-fA-F]{24}$"');
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

  it('should POST also works with deserialize on request then serialize en response', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: '5fdefd13a6640bb5fb5fa925',
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20'
      })
      .set('Content-Type', 'application/json')
      .expect(200)
      .then((r) => {
        expect(r.body.id).to.equal('5fdefd13a6640bb5fb5fa925');
        expect(r.body.creationDate).to.equal('2020-12-20');
        expect(r.body.creationDateTime).to.equal("2020-12-20T07:28:19.213Z");
      }));

  it('should POST throw error on invalid schema ObjectId', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: '5fdefd13a6640bb5fb5fa',
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20'
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.equal('request.body.id should match pattern "^[0-9a-fA-F]{24}$"');
      }));

  it('should POST throw error on invalid schema Date', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: '5fdefd13a6640bb5fb5fa925',
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-1f-20'
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.equal('request.body.creationDate should match format "date"');
      }));

  it('should throw error 500 on invalid object type instead of Date expected', async () =>
    request(app)
      .get(`${app.basePath}/users/5fdefd13a6640bb5fb5fa925`)
      .query({ baddateresponse: 'functionNotExists' })
      .expect(500)
      .then((r) => {
        console.log(r);
        expect(r.body.message).to.equal('.response.creationDate format is invalid');
      }));

  /*
  FIXME Manage format validation after serialize ? I can serialize using a working serialize method but that respond a bad format
  it('should throw error 500 on an object that serialize to a bad string format', async () =>

    request(app)
      .get(`${app.basePath}/users/5fdefd13a6640bb5fb5fa925`)
      .query({baddateresponse : 'functionBadFormat'})
      .expect(200)
      .then((r) => {
        console.log(r.body);
        expect(r.body.message).to.equal('Something saying that date is not date-time format');
      }));

   */

});

describe('serdes with jsonType array type string-list', () => {
  let app = null;

  before(async () => {
    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpecPath,
        validateRequests: {
          coerceTypes: true
        },
        validateResponses: {
          coerceTypes: true
        },
        serDes: [
          date,
          dateTime,
          {
            format: "mongo-objectid",
            deserialize: (s) => new ObjectID(s),
            serialize: (o) => o.toString(),
          },
          {
            format: 'string-list',
            jsonType: 'array',
            deserialize: (s): string[] => s.split(',').map(s => s.trim()),
            serialize: (o): string => (o as string[]).join(','),
          },
        ],
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
            tags: ['aa', 'bb', 'cc'],
            creationDateTime: date,
            creationDate: date
          });
        });
        app.post([`${app.basePath}/users`], (req, res) => {
          if (typeof req.body.id !== 'object') {
            throw new Error("Should be deserialized to ObjectId object");
          }
          if (!Array.isArray(req.body.tags)) {
            throw new Error("Should be deserialized to an Array object");
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
          console.error(err)
          res.status(err.status ?? 500).json({
            message: err.message,
            code: err.status ?? 500,
          });
        });
      },
      false,
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
        expect(r.body.message).to.equal('request.params.id should match pattern "^[0-9a-fA-F]{24}$"');
      }));

  it('should control GOOD id format and get a response in expected format', async () => {
    request(app)
      .get(`${app.basePath}/users/5fdefd13a6640bb5fb5fa925`)
      .expect(200)
      .then((r) => {
        expect(r.body.id).to.equal('5fdefd13a6640bb5fb5fa925');
        expect(r.body.creationDate).to.equal('2020-12-20');
        expect(r.body.creationDateTime).to.equal("2020-12-20T07:28:19.213Z");
        expect(r.body.tags).to.equal('aa,bb,cc');
      })
  });


  it('should POST also works with deserialize on request then serialize en response', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: '5fdefd13a6640bb5fb5fa925',
        tags: 'aa,bb,cc',
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20'
      })
      .set('Content-Type', 'application/json')
      .expect(200)
      .then((r) => {
        expect(r.body.id).to.equal('5fdefd13a6640bb5fb5fa925');
        expect(r.body.creationDate).to.equal('2020-12-20');
        expect(r.body.creationDateTime).to.equal("2020-12-20T07:28:19.213Z");
        expect(r.body.tags).to.equal('aa,bb,cc');
      }));

  it('should POST throw error on invalid schema ObjectId', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: '5fdefd13a6640bb5fb5fa',
        tags: 'aa,bb,cc',
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20'
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.equal('request.body.id should match pattern "^[0-9a-fA-F]{24}$"');
      }));

  it('should POST throw error on invalid schema Date', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: '5fdefd13a6640bb5fb5fa925',
        tags: 'aa,bb,cc',
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-1f-20'
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.equal('request.body.creationDate should match format "date"');
      }));

  it('should POST throw error for deserialize on request of non-string format', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: '5fdefd13a6640bb5fb5fa925',
        tags: ['aa', 'bb', 'cc'],
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20'
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.equal('request.body.tags must be a string');
      }));

});


