import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

const apiSpecPath = path.join('test', 'resources', 'response.validation.yaml');

describe(packageJson.name, () => {
  let app = null;

  let onErrorArgs = null;
  before(async () => {
    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpecPath,
        validateResponses: {
          onError: function(_err, body) {
            onErrorArgs = Array.from(arguments);
            if (body[0].id === 'bad_id_throw') {
              throw new Error('error in onError handler');
            }
          }
        },
      },
      3005,
      app => {
        app.get(`${app.basePath}/users`, (_req, res) => {
          const json = ['user1', 'user2', 'user3'];
          return res.json(json);
        });
        app.get(`${app.basePath}/pets`, (req, res) => {
          let json = {};
          if (req.query.mode === 'bad_type') {
            json = [{ id: 'bad_id', name: 'name', tag: 'tag' }];
          } else if (req.query.mode === 'bad_type_throw') {
            json = [{ id: 'bad_id_throw', name: 'name', tag: 'tag' }];
          }
          return res.json(json);
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
  })

  after(() => {
    app.server.close();
  });

  it('custom error handler invoked if response field has a value of incorrect type', async () =>
    request(app)
      .get(`${app.basePath}/pets?mode=bad_type`)
      .expect(200)
      .then((r: any) => {
        const data = [{ id: 'bad_id', name: 'name', tag: 'tag' }];
        expect(r.body).to.eql(data);
        expect(onErrorArgs.length).to.equal(3);
        expect(onErrorArgs[0].message).to.equal('.response[0].id should be integer');
        expect(onErrorArgs[1]).to.eql(data);
        expect(onErrorArgs[2].query).to.eql({
          mode: 'bad_type'
        });
      }));

  it('custom error handler not invoked on valid response', async () =>
    request(app)
      .get(`${app.basePath}/users`)
      .expect(200)
      .then((r: any) => {
        expect(r.body).is.an('array').with.length(3);
        expect(onErrorArgs).to.equal(null);
      }));

  it('returns error if custom error handler throws', async () =>
    request(app)
      .get(`${app.basePath}/pets?mode=bad_type_throw`)
      .expect(500)
      .then((r: any) => {
        const data = [{ id: 'bad_id_throw', name: 'name', tag: 'tag' }];
        expect(r.body.message).to.equal('error in onError handler');
        expect(onErrorArgs.length).to.equal(3);
        expect(onErrorArgs[0].message).to.equal('.response[0].id should be integer');
        expect(onErrorArgs[1]).to.eql(data);
      }));
});
