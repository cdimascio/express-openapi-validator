import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

const apiSpecPath = path.join('test', 'resources', 'response.validation.yaml');

describe(packageJson.name, () => {
  let app = null;

  before(async () => {
    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpecPath,
        validateResponses: {
          removeAdditional: 'failing',
        },
      },
      3005,
      (app) => {
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

  after(() => {
    app.server.close();
  });

  it('should fail if response field has a value of incorrect type', async () =>
    request(app)
      .get(`${app.basePath}/pets?mode=bad_type`)
      .expect(500)
      .then((r: any) => {
        expect(r.body.message).to.contain('should be integer');
        expect(r.body).to.have.property('code').that.equals(500);
      }));

  it('should remove additional properties when set false', async () =>
    request(app)
      .post(`${app.basePath}/no_additional_props`)
      .send({
        token_type: 'token',
        expires_in: 1000,
        access_token: 'token',
        refresh_token: 'refresh_token',
        user: {
          id: 10,
        },
        some_invalid_prop: 'test',
      })
      .expect(200)
      .then((r: any) => {
        const body = r.body;
        expect(body).to.have.property('token_type');
        expect(body).to.not.have.property('some_invalid_prop');
      }));

  it('should remove nested additional prop if additionalProperties is false', async () =>
    request(app)
      .post(`${app.basePath}/no_additional_props`)
      .send({
        token_type: 'token',
        expires_in: 1000,
        access_token: 'token',
        refresh_token: 'refresh_token',
        user: {
          id: 10,
          extra_prop: true,
        },
      })
      .expect(200)
      .then((r: any) => {
        const body = r.body;
        expect(body.user).to.have.property('id');
        expect(body.user).to.not.have.property('extra_prop');
      }));

  it('should pass if response is a list', async () =>
    request(app)
      .get(`${app.basePath}/users`)
      .expect(200)
      .then((r: any) => {
        expect(r.body).is.an('array').with.length(3);
      }));
});
