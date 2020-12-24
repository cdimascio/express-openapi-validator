import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

const apiSpecPath = path.join('test', 'resources', 'schemaobjectmapper.yaml');

class ObjectID {
  id: string;

  constructor(id: string = '5fdefd13a6640bb5fb5fa925') {
    this.id = id;
  }

  toString() {
    return this.id;
  }
}

describe('schemaobjectmapper', () => {
  let app = null;

  before(async () => {
    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpecPath,
        validateRequests: {
          coerceTypes: true,
        },
        validateResponses: {
          coerceTypes: true,
        },
        schemaObjectMapper: {
          ObjectId: {
            deserialize: (o) => new ObjectID(o),
            serialize: (o) => o.toString(),
          },
          Date: {
            deserialize: (o) => new Date(o),
            serialize: (o) => o.toISOString().slice(0, 10),
          },
          DateTime: {
            deserialize: (o) => new Date(o),
            serialize: (o) => o.toISOString(),
          },
        },
      },
      3005,
      (app) => {
        app.get([`${app.basePath}/tests`], (req, res) => {
          let date = new Date('2020-12-20T07:28:19.213Z');
          res.json({
            id: req.params.id,
            created_at: date,
          });
        });
        app.get([`${app.basePath}/users/:id?`], (req, res) => {
          let date = new Date('2020-12-20T07:28:19.213Z');
          res.json({
            id: req.params.id || 10,
            created_at: date,
            creationDate: date,
          });
        });
        app.use((err, req, res, next) => {
          console.error(err);
          res.status(err.status ?? 500).json({
            message: err.message,
            code: err.status ?? 500,
          });
        });
      },
      false,
    );
    return app;
  });

  after(() => {
    app.server.close();
  });

  it('serialize datae object in response', async () =>
    request(app)
      .get(`${app.basePath}/tests`)
      .expect(200)
      .then((r) => {
        console.log(r.body);
        expect(r.body.created_at).to.equal('2020-12-20T07:28:19.213Z');
      }));
  it('should control BAD id format and throw an error', async () =>
    request(app)
      .get(`${app.basePath}/users/1234`)
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.equal(
          'request.params.id should match pattern "^[0-9a-fA-F]{24}$"',
        );
      }));

  it('should control GOOD id format and get a response in expected format', async () =>
    request(app)
      .get(`${app.basePath}/users/5fdefd13a6640bb5fb5fa925`)
      .expect(200)
      .then((r) => {
        expect(r.body.id).to.equal('5fdefd13a6640bb5fb5fa925');
        expect(r.body.creationDate).to.equal('2020-12-20');
        expect(r.body.creationDateTime).to.equal('2020-12-20T07:28:19.213Z');
      }));
});
