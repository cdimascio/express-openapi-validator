import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';
import { AppWithServer } from './common/app.common';

const apiSpecPath = path.join('test', 'resources', 'request.validation.yaml');

describe(packageJson.name, () => {
  let app: AppWithServer;

  let onErrorArgs: any[] | null;
  before(async () => {
    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpecPath,
        validateResponses: false,
        validateRequests: {
          onError: function (_err, req) {
            console.log(`XXX in onError`);
            onErrorArgs = [_err, req];
            if (req.query['limit'] === 'bad_type_throw') {
              throw new Error('error in onError handler');
            }
            console.log(`XXX not throwing`);
          },
        },
      },
      3005,
      (app) => {
        app.get(`${app.basePath}/pets`, (req, res) => {
          debugger;
          console.log(`XXX in route`);
          let json = [
            { id: '1', name: 'fido' },
            { id: '2', name: 'rex' },
            { id: '3', name: 'spot' },
          ];
          if (req.query.limit === 'not_an_integer') {
            json = [{ id: 'bad_limit', name: 'not an int' }];
          } else if (req.query.limit === 'bad_type_throw') {
            json = [{ id: 'bad_limit_throw', name: 'name' }];
          }
          console.log(`XXX returning json`, json);
          res.json(json);
        });
        app.use((err, _req, res, _next) => {
          res.status(err.status ?? 500).json({
            message: err.message,
            code: err.status ?? 500,
          });
        });
      },
      false,
    );
  });

  afterEach(() => {
    onErrorArgs = null;
  });

  after(() => {
    app.server.close();
  });

  it('custom error handler invoked if request query field has the wrong type', async () =>
    request(app)
      .get(`${app.basePath}/pets?limit=not_an_integer`)
      .expect(200)
      .then((r: any) => {
        const data = [{ id: 'bad_limit', name: 'not an int' }];
        expect(r.body).to.eql(data);
        expect(onErrorArgs?.length).to.equal(2);
        expect(onErrorArgs![0].message).to.equal(
          'request/query/limit must be integer',
        );
        expect(onErrorArgs![1].query).to.eql({
          limit: 'not_an_integer',
        });
      }));

  it('custom error handler not invoked on valid response', async () =>
    request(app)
      .get(`${app.basePath}/pets?limit=3`)
      .expect(200)
      .then((r: any) => {
        expect(r.body).is.an('array').with.length(3);
        expect(onErrorArgs).to.equal(null);
      }));

  it('returns error if custom error handler throws', async () =>
    request(app)
      .get(`${app.basePath}/pets?limit=bad_type_throw`)
      .expect(500)
      .then((r: any) => {
        const data = [{ id: 'bad_limit_throw', name: 'name' }];
        expect(r.body.message).to.equal('error in onError handler');
        expect(onErrorArgs!.length).to.equal(2);
        expect(onErrorArgs![0].message).to.equal(
          'request/query/limit must be integer',
        );
        expect(onErrorArgs![1].query).to.eql({
          limit: 'bad_type_throw',
        });
      }));
});
