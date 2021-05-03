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
      (app) => {
        app.get(`${app.basePath}/error`, (req, res) => {
          return res.status(400).json({
            message: 'test',
            code: 400,
          });
        });
        app.get(`${app.basePath}/ref_response_body`, (req, res) => {
          return res.json({ id: 213, name: 'name', kids: [] });
        });
        app.get(`${app.basePath}/empty_response`, (req, res) => {
          if (req.query.mode === 'non_empty_response') {
            return res.status(204).json({});
          }
          return res.status(204).json();
        });
        app.get(`${app.basePath}/boolean`, (req, res) => {
          return res.json(req.query.value);
        });
        app.get(`${app.basePath}/object`, (req, res) => {
          return res.json([
            { id: 1, name: 'name', tag: 'tag', bought_at: null },
          ]);
        });
        app.post(`${app.basePath}/object`, (req, res) => {
          return req.query.mode === 'array'
            ? res.json([req.body])
            : res.json(req.body);
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

  it('should return 200 on valid responses 200 $ref', async () =>
    request(app)
      .get(`${app.basePath}/ref_response_body`)
      .expect(200)
      .then((r: any) => {
        expect(r.body.id).to.be.a('number').that.equals(213);
      }));

  it('should return 200 on valid responses 200 $ref', async () =>
    request(app)
      .get(`${app.basePath}/ref_response_body`)
      .set('Accept', 'APPLICATION/JSON')
      .expect(200)
      .then((r: any) => {
        expect(r.body.id).to.be.a('number').that.equals(213);
      }));

  it('should fail if response field has a value of incorrect type', async () =>
    request(app)
      .get(`${app.basePath}/pets?mode=bad_type`)
      .expect(500)
      .then((r: any) => {
        expect(r.body.message).to.contain('should be integer');
        expect(r.body).to.have.property('code').that.equals(500);
      }));

  // TODO add test for allOf - when allOf is used an array value passes when object is expected
  it('should fail if response is array when expecting object', async () =>
    request(app)
      .get(`${app.basePath}/object`)
      .expect(500)
      .then((r: any) => {
        expect(r.body.message).to.contain('should be object');
        expect(r.body).to.have.property('code').that.equals(500);
      }));

  it.skip('should fail if response expects object (using allOf), but got array', async () =>
    request(app)
      .post(`${app.basePath}/object?mode=array`)
      .send({ id: 1, name: 'fido' })
      .expect(500)
      .then((r: any) => {
        expect(r.body.message).to.contain('should be object');
        expect(r.body).to.have.property('code').that.equals(500);
      }));

  it('should return 200 if returns expect object (using allOf) with type object', async () =>
    request(app)
      .post(`${app.basePath}/object`)
      .send({ id: 1, name: 'fido' })
      .expect(200));

  it('should fail if response is empty object', async () =>
    request(app)
      .get(`${app.basePath}/pets?mode=empty_object`)
      .expect(500)
      .then((r: any) => {
        expect(r.body.message).to.contain('should be array');
        expect(r.body).to.have.property('code').that.equals(500);
      }));

  it('should fail if response is empty', async () =>
    request(app)
      .get(`${app.basePath}/pets?mode=empty_response`)
      .expect(500)
      .then((r: any) => {
        expect(r.body.message).to.contain('body required');
        expect(r.body).to.have.property('code').that.equals(500);
      }));

  it('should return throw 500 on invalid error response', async () =>
    request(app)
      .get(`${app.basePath}/error`)
      .expect(500)
      .then((r) => {
        expect(r.body.message).to.include('required property');
      }));

  it('should return 204 for endpoints that return empty response', async () =>
    request(app)
      .get(`${app.basePath}/empty_response`)
      .expect(204)
      .then((r) => {
        expect(r.body).to.be.empty;
      }));

  it('should fail if response is not empty and an empty response is expected', async () =>
    request(app)
      .get(`${app.basePath}/empty_response?mode=non_empty_response`)
      .expect(500)
      .then((r) => {
        expect(r.body.message).to.contain('response should NOT have a body');
        expect(r.body).to.have.property('code').that.equals(500);
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
        expect(r.body).is.an('array').with.length(3);
        expect(r.body[0].bought_at).equal(null);
        expect(r.body[1].bought_at).equal(today.toISOString());
        expect(r.body[2].bought_at).to.be.undefined;
      }));

  it('should pass if response is a list', async () =>
    request(app)
      .get(`${app.basePath}/users`)
      .expect(200)
      .then((r: any) => {
        expect(r.body).is.an('array').with.length(3);
      }));

  it('should be able to return `true` as the response body', async () =>
    request(app)
      .get(`${app.basePath}/boolean?value=true`)
      .expect(200)
      .then((r: any) => {
        expect(r.body).to.equal(true);
      }));

  it('should be able to return `false` as the response body', async () =>
    request(app)
      .get(`${app.basePath}/boolean?value=false`)
      .expect(200)
      .then((r: any) => {
        expect(r.body).to.equal(false);
      }));
});
