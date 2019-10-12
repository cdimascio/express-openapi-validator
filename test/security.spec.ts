import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import { config } from 'chai/lib/chai';

const packageJson = require('../package.json');

// NOTE/TODO: These tests modify eovConf.securityHandlers
// Thus test execution order matters :-(
describe(packageJson.name, () => {
  let app = null;
  let basePath = null;
  const eovConf = {
    apiSpec: path.join('test', 'resources', 'security.yaml'),
    securityHandlers: {
      ApiKeyAuth: (req, scopes, schema) => {
        throw Error('custom api key handler failed');
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
        .get(`/basic`, (req, res) => res.json({ logged_in: true }))
        .get(`/oauth2`, (req, res) => res.json({ logged_in: true }))
        .get(`/openid`, (req, res) => res.json({ logged_in: true })),
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
        expect(body.errors[0].message).to.equals(
          'custom api key handler failed',
        );
      }));

  it('should return 401 if apikey handler returns false', async () => {
    eovConf.securityHandlers.ApiKeyAuth = <any>function(req, scopes, schema) {
      expect(scopes)
        .to.be.an('array')
        .with.length(0);
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
      expect(scopes)
        .to.be.an('array')
        .with.length(0);
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

  it('should return 401 if apikey handler returns Promise reject with custom message', async () => {
    (<any>eovConf.securityHandlers).ApiKeyAuth = (req, scopes, schema) => {
      expect(scopes)
        .to.be.an('array')
        .with.length(0);
      return Promise.reject(new Error('rejected promise'));
    };
    return request(app)
      .get(`${basePath}/api_key`)
      .set('X-API-Key', 'test')
      .expect(401)
      .then(r => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.equals('rejected promise');
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
      expect(schema.type).to.equal('apiKey');
      expect(schema.in).to.equal('header');
      expect(schema.name).to.equal('X-API-Key');
      expect(scopes)
        .to.be.an('array')
        .with.length(0);
      return true;
    };
    return request(app)
      .get(`${basePath}/api_key`)
      .set('X-API-Key', 'test')
      .expect(200);
  });

  it('should return 401 if auth header is missing for basic auth', async () => {
    (<any>eovConf.securityHandlers).BasicAuth = async (req, scopes, schema) => {
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
        expect(schema.type).to.equal('http');
        expect(schema.scheme).to.equal('bearer');
        expect(scopes)
          .to.be.an('array')
          .with.length(0);
        return true;
      }
    );
    return request(app)
      .get(`${basePath}/bearer`)
      .set('Authorization', 'Bearer XXXX')
      .expect(200);
  });

  it('should return 200 if oauth2 auth succeeds', async () => {
    (<any>eovConf.securityHandlers).OAuth2 = <any>(
      function(req, scopes, schema) {
        expect(schema.type).to.equal('oauth2');
        expect(schema).to.have.property('flows');
        expect(scopes)
          .to.be.an('array')
          .with.length(2);

        return true;
      }
    );
    return request(app)
      .get(`${basePath}/oauth2`)
      .expect(200);
  });

  it('should return 403 if oauth2 handler throws 403', async () => {
    (<any>eovConf.securityHandlers).OAuth2 = <any>(
      function(req, scopes, schema) {
        expect(schema.type).to.equal('oauth2');
        expect(schema).to.have.property('flows');
        expect(scopes)
          .to.be.an('array')
          .with.length(2);

        throw { status: 403, message: 'forbidden' };
      }
    );
    return request(app)
      .get(`${basePath}/oauth2`)
      .expect(403)
      .then(r => {
        const body = r.body;
        expect(r.body.message).to.equal('forbidden');
      });
  });

  it('should return 200 if openid auth succeeds', async () => {
    (<any>eovConf.securityHandlers).OpenID = <any>(
      function(req, scopes, schema) {
        expect(schema.type).to.equal('openIdConnect');
        expect(schema).to.have.property('openIdConnectUrl');
        expect(scopes)
          .to.be.an('array')
          .with.length(2);

        return true;
      }
    );
    return request(app)
      .get(`${basePath}/openid`)
      .expect(200);
  });

  it('should return 500 if missing handler', async () => {
    delete (<any>eovConf.securityHandlers).OpenID;
    (<any>eovConf.securityHandlers).Test = <any>function(req, scopes, schema) {
      expect(schema.type).to.equal('openIdConnect');
      expect(schema).to.have.property('openIdConnectUrl');
      expect(scopes)
        .to.be.an('array')
        .with.length(2);

      return true;
    };
    return request(app)
      .get(`${basePath}/openid`)
      .expect(500)
      .then(r => {
        const body = r.body;
        const msg = "a handler for 'OpenID' does not exist";
        expect(body.message).to.equal(msg);
        expect(body.errors[0].message).to.equal(msg);
        expect(body.errors[0].path).to.equal(`${basePath}/openid`);
      });
  });
});
