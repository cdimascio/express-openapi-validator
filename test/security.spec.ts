import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import { config } from 'chai/lib/chai';

const packageJson = require('../package.json');

describe(packageJson.name, () => {
  let app = null;
  let basePath = null;
  const eovConf = {
    apiSpec: path.join('test', 'resources', 'security.yaml'),
    securityHandlers: {
      ApiKeyAuth: function(req, scopes, schema) {
        console.log('apikey handler throws custom error');
        throw { errors: [] };
      },
    },
  };
  before(async () => {
    // Set up the express app
    app = await createApp(eovConf, 3005);
    basePath = app.basePath;

    app.use(
      `${basePath}`,
      express
        .Router()
        .get(`/api_key`, (req, res) => res.json({ logged_in: true })),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should return 401 if apikey handler throws exception', async () =>
    request(app)
      .get(`${basePath}/api_key`)
      .send({})
      .expect(401)
      .then(r => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.equals('unauthorized');
      }));

  it('should return 401 if apikey handler returns false', async () => {
    eovConf.securityHandlers.ApiKeyAuth = <any>function(req, scopes, schema) {
      console.log('apikey handler returns false');
      return false;
    };
    return request(app)
      .get(`${basePath}/api_key`)
      .send({})
      .expect(401)
      .then(r => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.equals('unauthorized');
      });
  });

  it('should return 401 if apikey handler returns Promise with false', async () => {
    eovConf.securityHandlers.ApiKeyAuth = <any>function(req, scopes, schema) {
      console.log('apikey handler returns promise false');
      return Promise.resolve(false);
    };
    return request(app)
      .get(`${basePath}/api_key`)
      .send({})
      .expect(401)
      .then(r => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.equals('unauthorized');
      });
  });
});
