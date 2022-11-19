import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

import { date, dateTime } from '../src/framework/base.serdes';

const apiSpecPath = path.join('test', 'resources', '699.yaml');

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

describe('699', () => {
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
            creationDate: date,
            shortOrLong: 'a',
            history: [{ modificationDate: date }],
            historyWithoutRef: [{ modificationDate: date }],
          });
        });
        app.post([`${app.basePath}/users`], (req, res) => {
          if (typeof req.body.history[0].modificationDate !== 'object' || !(req.body.history[0].modificationDate instanceof Date)) {
            throw new Error("Should be deserialized to Date object");
          }
          if (typeof req.body.historyWithoutRef[0].modificationDate !== 'object' || !(req.body.historyWithoutRef[0].modificationDate instanceof Date)) {
            throw new Error("Should be deserialized to Date object");
          }
          res.json(req.body);
        });
        app.use((err, req, res, next) => {
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

  it('should control GOOD id format and get a response in expected format', async () =>
    request(app)
      .get(`${app.basePath}/users/5fdefd13a6640bb5fb5fa925`)
      .expect(200)
      .then((r) => {
        expect(r.body.history[0].modificationDate).to.equal("2020-12-20");
        expect(r.body.historyWithoutRef[0].modificationDate).to.equal("2020-12-20");
      }));

  it('should POST also works with deserialize on request then serialize en response', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: '5fdefd13a6640bb5fb5fa925',
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20',
        shortOrLong: 'ab',
        history: [{ modificationDate: '2020-12-20' }],
        historyWithoutRef: [{ modificationDate: '2020-12-20' }],
      })
      .set('Content-Type', 'application/json')
      .expect(200)
      .then((r) => {
        expect(r.body.history[0].modificationDate).to.equal("2020-12-20");
        expect(r.body.historyWithoutRef[0].modificationDate).to.equal("2020-12-20");
      }));

  it('should POST throw error on invalid schema Date', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: '5fdefd13a6640bb5fb5fa925',
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20',
        history: [{ modificationDate: '2020-1f-20' }],
        historyWithoutRef: [{ modificationDate: '2020-12-20' }],
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.equal('request/body/history/0/modificationDate must match format "date"');
      }));

  it('should POST throw error on invalid schema Date', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: '5fdefd13a6640bb5fb5fa925',
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20',
        history: [{ modificationDate: '2020-12-20' }],
        historyWithoutRef: [{ modificationDate: '2020-1f-20' }],
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.equal('request/body/historyWithoutRef/0/modificationDate must match format "date"');
      }));

});



describe('699 serialize response components only', () => {
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
          debugger;
          if (typeof req.params.id !== 'string') {
            throw new Error("Should be not be deserialized to ObjectId object");
          }
          let date = new Date("2020-12-20T07:28:19.213Z");
          let result = {
            id: new ObjectID(req.params.id),
            creationDateTime: date,
            creationDate: date,
            shortOrLong: 'a',
            history: [{ modificationDate: undefined }],
            historyWithoutRef: [{ modificationDate: undefined }],
          };
          if (req.query.baddateresponse === 'functionNotExists') {
            result.history[0].modificationDate = new ObjectID();
            result.historyWithoutRef[0].modificationDate = date;
          }
          else if (req.query.baddateresponse === 'functionNotExistsWithoutRef') {
            result.history[0].modificationDate = date;
            result.historyWithoutRef[0].modificationDate = new ObjectID();
          }
          else if (req.query.baddateresponse === 'functionBadFormat') {
            result.history[0].modificationDate = new BadDate();
            result.historyWithoutRef[0].modificationDate = date;
          }
          else if (req.query.baddateresponse === 'functionBadFormatWithoutRef') {
            result.history[0].modificationDate = date;
            result.historyWithoutRef[0].modificationDate = new BadDate();
          }
          else {
            result.history[0].modificationDate = date;
            result.historyWithoutRef[0].modificationDate = date;
          }
          res.json(result);
        });
        app.post([`${app.basePath}/users`], (req, res) => {
          if (typeof req.body.id !== 'string') {
            throw new Error("Should NOT be deserialized to ObjectId object");
          }
          if (typeof req.body.history[0].modificationDate !== 'string') {
            throw new Error("Should NTO be deserialized to Date object");
          }
          if (typeof req.body.historyWithoutRef[0].modificationDate !== 'string') {
            throw new Error("Should NOT be deserialized to Date object");
          }
          req.body.id = new ObjectID(req.body.id);
          req.body.creationDateTime = new Date(req.body.creationDateTime);
          req.body.history[0].modificationDate = new Date(req.body.history[0].modificationDate);
          req.body.historyWithoutRef[0].modificationDate = new Date(req.body.historyWithoutRef[0].modificationDate);
          // We let creationDate et al as String and it should also work (either in Date Object ou String 'date' format)
          res.json(req.body);
        });
        app.use((err, req, res, next) => {
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

  it('should control GOOD id format and get a response in expected format', async () =>
    request(app)
      .get(`${app.basePath}/users/5fdefd13a6640bb5fb5fa925`)
      .expect(200)
      .then((r) => {
        expect(r.body.id).to.equal('5fdefd13a6640bb5fb5fa925');
        expect(r.body.creationDate).to.equal('2020-12-20');
        expect(r.body.creationDateTime).to.equal("2020-12-20T07:28:19.213Z");
        expect(r.body.history[0].modificationDate).to.equal("2020-12-20");
        expect(r.body.historyWithoutRef[0].modificationDate).to.equal("2020-12-20");
      }));

  it('should POST also works with deserialize on request then serialize en response', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: '5fdefd13a6640bb5fb5fa925',
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20',
        history: [{ modificationDate: '2020-12-20' }],
        historyWithoutRef: [{ modificationDate: '2020-12-20' }],
      })
      .set('Content-Type', 'application/json')
      .expect(200)
      .then((r) => {
        expect(r.body.history[0].modificationDate).to.equal("2020-12-20");
        expect(r.body.historyWithoutRef[0].modificationDate).to.equal("2020-12-20");
      }));

  it('should POST throw error on invalid schema Date', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: '5fdefd13a6640bb5fb5fa925',
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20',
        history: [{ modificationDate: '2020-1f-20' }],
        historyWithoutRef: [{ modificationDate: '2020-12-20' }],
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.equal('request/body/history/0/modificationDate must match format "date"');
      }));

  it('should POST throw error on invalid schema Date', async () =>
    request(app)
      .post(`${app.basePath}/users`)
      .send({
        id: '5fdefd13a6640bb5fb5fa925',
        creationDateTime: '2020-12-20T07:28:19.213Z',
        creationDate: '2020-12-20',
        history: [{ modificationDate: '2020-12-20' }],
        historyWithoutRef: [{ modificationDate: '2020-1f-20' }],
      })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.equal('request/body/historyWithoutRef/0/modificationDate must match format "date"');
      }));

  it('should throw error 500 on invalid object type instead of Date expected', async () =>
    request(app)
      .get(`${app.basePath}/users/5fdefd13a6640bb5fb5fa925`)
      .query({ baddateresponse: 'functionNotExists' })
      .expect(500)
      .then((r) => {
        expect(r.body.message).to.equal(
          '/response/history/0/modificationDate format is invalid',
        );
      }));

  it('should throw error 500 on invalid object type instead of Date expected', async () =>
    request(app)
      .get(`${app.basePath}/users/5fdefd13a6640bb5fb5fa925`)
      .query({ baddateresponse: 'functionNotExistsWithoutRef' })
      .expect(500)
      .then((r) => {
        expect(r.body.message).to.equal(
          '/response/historyWithoutRef/0/modificationDate format is invalid',
        );
      }));

  // This FIXME from serdes.spec.ts
  /*
  FIXME Manage format validation after serialize ? I can serialize using a working serialize method but that respond a bad format
  it('should throw error 500 on an object that serialize to a bad string format', async () =>

    request(app)
      .get(`${app.basePath}/users/5fdefd13a6640bb5fb5fa925`)
      .query({baddateresponse : 'functionBadFormat'})
      .expect(200)
      .then((r) => {
        expect(r.body.message).to.equal('Something saying that date is not date-time format');
      }));

   */

});


