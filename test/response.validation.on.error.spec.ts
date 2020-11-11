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
          onError: function() {
            onErrorArgs = Array.from(arguments);
          }
        },
      },
      3005,
      app => {
        app.get(`${app.basePath}/users`, (req, res) => {
          const json = ['user1', 'user2', 'user3'];
          return res.json(json);
        });
        app.get(`${app.basePath}/pets`, (req, res) => {
          let json = {};
          if ((req.query.mode = 'bad_type')) {
            json = [{ id: 'bad_id', name: 'name', tag: 'tag' }];
          }
          return res.json(json);
        });
        app.post(`${app.basePath}/no_additional_props`, (req, res) => {
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
  });

  afterEach(() => {
    onErrorArgs = false;
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
        expect(onErrorArgs[0].message).to.equal('.response[0].id should be integer');
        expect(onErrorArgs[4]).to.eql(data);
      }));
});
