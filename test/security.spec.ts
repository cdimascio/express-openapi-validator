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
        .get(`/api_key`, (req, res) => res.json({ logged_in: true }))
        .get(`/bearer`, (req, res) => res.json({ logged_in: true }))
        .get(`/basic`, (req, res) => res.json({ logged_in: true })),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should return 401 if apikey handler throws exception', async () =>
    request(app)
      .get(`${basePath}/api_key`)
      .set('X-API-Key', 'test')
      .expect(401)
      .then(r => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.equals('unauthorized');
      }));

  it('should return 401 if apikey handler returns false', async () => {
    eovConf.securityHandlers.ApiKeyAuth = <any>function(req, scopes, schema) {
      expect(scopes).to.be.an('array').with.length(0);
      return false;
    };
    return request(app)
      .get(`${basePath}/api_key`)
      .set('X-API-Key', 'test')
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
      expect(scopes).to.be.an('array').with.length(0);
      return Promise.resolve(false);
    };
    return request(app)
      .get(`${basePath}/api_key`)
      .set('X-API-Key', 'test')
      .expect(401)
      .then(r => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.equals('unauthorized');
      });
  });

  it('should return 401 if apikey header is missing', async () => {
    eovConf.securityHandlers.ApiKeyAuth = <any>function(req, scopes, schema) {
      return true;
    };
    return request(app)
      .get(`${basePath}/api_key`)
      .expect(401)
      .then(r => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.include('X-API-Key');
      });
  });

  it('should return 200 if apikey header exists and handler returns true', async () => {
    eovConf.securityHandlers.ApiKeyAuth = <any>function(req, scopes, schema) {
      expect(scopes).to.be.an('array').with.length(0);
      return true;
    };
    return request(app)
      .get(`${basePath}/api_key`)
      .set('X-API-Key', 'test')
      .expect(200);
  });

  it('should return 401 if auth header is missing for basic auth', async () => {
    (<any>eovConf.securityHandlers).BasicAuth = function(req, scopes, schema) {
      return true;
    };
    return request(app)
      .get(`${basePath}/basic`)
      .expect(401)
      .then(r => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.include('Authorization');
      });
  });

  it('should return 401 if auth header has malformed basic auth', async () => {
    (<any>eovConf.securityHandlers).BasicAuth = <any>(
      function(req, scopes, schema) {
        return true;
      }
    );
    return request(app)
      .get(`${basePath}/basic`)
      .set('Authorization', 'XXXX')
      .expect(401)
      .then(r => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.include(
          "Authorization header with scheme 'Basic' required.",
        );
      });
  });

  it('should return 401 if auth header is missing for bearer auth', async () => {
    (<any>eovConf.securityHandlers).BearerAuth = <any>(
      function(req, scopes, schema) {
        return true;
      }
    );
    return request(app)
      .get(`${basePath}/bearer`)
      .expect(401)
      .then(r => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.include('Authorization');
      });
  });

  it('should return 401 if auth header has malformed bearer auth', async () => {
    (<any>eovConf.securityHandlers).BearerAuth = <any>(
      function(req, scopes, schema) {
        return true;
      }
    );
    return request(app)
      .get(`${basePath}/bearer`)
      .set('Authorization', 'XXXX')
      .expect(401)
      .then(r => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.include(
          "Authorization header with scheme 'Bearer' required.",
        );
      });
  });

  it('should return 200 if bearer auth succeeds', async () => {
    (<any>eovConf.securityHandlers).BearerAuth = <any>(
      function(req, scopes, schema) {
        expect(scopes).to.be.an('array').with.length(0);
        return true;
      }
    );
    return request(app)
      .get(`${basePath}/bearer`)
      .set('Authorization', 'Bearer XXXX')
      .expect(200);
  });

  // TODO create tests for oauth2 and openid
});
