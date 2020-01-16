import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

const apiSpecPath = path.join('test', 'resources', 'response.validation.yaml');
const today = new Date();

describe(packageJson.name, () => {
  let app = null;

  before(async () => {
    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpecPath,
        validateResponses: true,
      },
      3005,
      app => {
        app.get(`${app.basePath}/empty_response`, (req, res) => {
          return res.end();
        });
        app.get(`${app.basePath}/users`, (req, res) => {
          const json = ['user1', 'user2', 'user3'];
          return res.json(json);
        });
        app.get(`${app.basePath}/pets`, (req, res) => {
          let json = {};
          if (req.query.mode === 'bad_type') {
            json = [{ id: 'bad_id', name: 'name', tag: 'tag' }];
          } else if (req.query.mode == 'check_null') {
            json = [
              { id: 1, name: 'name', tag: 'tag', bought_at: null },
              {
                id: 2,
                name: 'name',
                tag: 'tag',
                bought_at: today.toISOString(),
              },
              { id: 3, name: 'name', tag: 'tag' },
            ];
          } else if (req.query.mode === 'empty_object') {
            json = {};
          } else if (req.query.mode === 'empty_response') {
            return res.json();
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
        expect(r.body)
          .to.have.property('code')
          .that.equals(500);
      }));

  it('should fail if response is response is empty object', async () =>
    request(app)
      .get(`${app.basePath}/pets?mode=empty_object`)
      .expect(500)
      .then((r: any) => {
        console.log(r.body);
        expect(r.body.message).to.contain('should be array');
        expect(r.body)
          .to.have.property('code')
          .that.equals(500);
      }));

  it('should fail if response is response is empty', async () =>
    request(app)
      .get(`${app.basePath}/pets?mode=empty_response`)
      .expect(500)
      .then((r: any) => {
        expect(r.body.message).to.contain('body required');
        expect(r.body)
          .to.have.property('code')
          .that.equals(500);
      }));

  it('should return 200 for endpoints that return empty response', async () =>
    request(app)
      .get(`${app.basePath}/empty_response`)
      .expect(200));

  it('should fail if additional properties are provided when set false', async () =>
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
      .expect(500)
      .then((r: any) => {
        const e = r.body;
        expect(e.message).to.contain('should NOT have additional properties');
        expect(e.code).to.equal(500);
      }));

  it('should fail if additional properties are provided when set false', async () =>
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
      .expect(500)
      .then((r: any) => {
        const e = r.body;
        expect(e.message).to.contain('should NOT have additional properties');
        expect(e.code).to.equal(500);
      }));

  it('should pass if value is null', async () =>
    request(app)
      .get(`${app.basePath}/pets?mode=check_null`)
      .expect(200)
      .then((r: any) => {
        expect(r.body)
          .is.an('array')
          .with.length(3);
        expect(r.body[0].bought_at).equal(null);
        expect(r.body[1].bought_at).equal(today.toISOString());
        expect(r.body[2].bought_at).to.be.undefined;
      }));

  it('should pass if response is a list', async () =>
    request(app)
      .get(`${app.basePath}/users`)
      .expect(200)
      .then((r: any) => {
        expect(r.body)
          .is.an('array')
          .with.length(3);
      }));
});
