import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

const apiSpecPath = path.join('test', 'resources', 'coercecomponents.yaml');

class ObjectID {
  id : string;

  constructor(id: string = "5fdefd13a6640bb5fb5fa925") {
    this.id= id;
  }

  toString() {
    return this.id;
  }

}

describe('path params', () => {
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
        coerceComponents: {
          'ObjectId': {
            serialize: (o) => new ObjectID(o),
            deserialize: (o) => o.toString(),
          },
          'Date': {
            serialize: (o) => new Date(o),
            deserialize: (o) => o.toISOString().slice(0, 10),
          },
          'DateTime': {
            serialize: (o) => new Date(o),
            deserialize: (o) => o.toISOString(),
          },
        },

      },
      3005,
      (app) => {
        app.get([`${app.basePath}/users/:id?`], (req, res) => {
          let date = new Date("2020-12-20T07:28:19.213Z");
          res.json({
            id: req.params.id,
            creationDateTime : date,
            creationDate: date
          });
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
});
