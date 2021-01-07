import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import {
  OpenApiValidatorOpts,
  ValidateSecurityOpts,
  OpenAPIV3,
} from '../src/framework/types';

// NOTE/TODO: These tests modify eovConf.validateSecurity.handlers
// Thus test execution order matters :-(
describe('security.handlers', () => {
  let app = null;
  let basePath = null;
  const eovConf: OpenApiValidatorOpts = {
    apiSpec: path.join('test', 'resources', 'security.yaml'),
    validateSecurity: {
      handlers: {
        ApiKeyAuth: (req, scopes, schema) => {
          throw Error('custom api key handler failed');
        },
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
        .get(`/cookie_auth`, (req, res) => res.json({ logged_in: true }))
        .get(`/oauth2`, (req, res) => res.json({ logged_in: true }))
        .get(`/openid`, (req, res) => res.json({ logged_in: true }))
        .get(`/api_key_or_anonymous`, (req, res) =>
          res.json({ logged_in: true }),
        )
        .get('/no_security', (req, res) => res.json({ logged_in: true })),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should return 200 if no security', async () =>
    request(app).get(`${basePath}/no_security`).expect(200));

  it('should return 401 if apikey handler throws exception', async () =>
    request(app)
      .get(`${basePath}/api_key`)
      .set('X-API-Key', 'test')
      .expect(401)
      .then((r) => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.equals(
          'custom api key handler failed',
        );
      }));

  it('should return 401 if apikey handler returns false', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    validateSecurity.handlers.ApiKeyAuth = <any>function (req, scopes, schema) {
      expect(scopes).to.be.an('array').with.length(0);
      return false;
    };
    return request(app)
      .get(`${basePath}/api_key`)
      .set('X-API-Key', 'test')
      .expect(401)
      .then((r) => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.equals('unauthorized');
      });
  });

  it('should return 401 if apikey handler returns Promise with false', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    validateSecurity.handlers.ApiKeyAuth = <any>function (req, scopes, schema) {
      expect(scopes).to.be.an('array').with.length(0);
      return Promise.resolve(false);
    };
    return request(app)
      .get(`${basePath}/api_key`)
      .set('X-API-Key', 'test')
      .expect(401)
      .then((r) => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.equals('unauthorized');
      });
  });

  it('should return 401 if cookie auth handler returns Promise with false', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    validateSecurity.handlers.CookieAuth = <any>function (req, scopes, schema) {
      expect(scopes).to.be.an('array').with.length(0);
      return Promise.resolve(false);
    };
    return request(app)
      .get(`${basePath}/cookie_auth`)
      .set('Cookie', ['JSESSIONID=12345667', 'myApp-other=blah'])
      .expect(401)
      .then((r) => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.equals('unauthorized');
      });
  });

  it('should return 401 if apikey handler returns Promise reject with custom message', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    validateSecurity.handlers.ApiKeyAuth = (req, scopes, schema) => {
      expect(scopes).to.be.an('array').with.length(0);
      return Promise.reject(new Error('rejected promise'));
    };
    return request(app)
      .get(`${basePath}/api_key`)
      .set('X-API-Key', 'test')
      .expect(401)
      .then((r) => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.equals('rejected promise');
      });
  });

  it('should return 401 if apikey header is missing', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    validateSecurity.handlers.ApiKeyAuth = (req, scopes, schema) => true;
    return request(app)
      .get(`${basePath}/api_key`)
      .expect(401)
      .then((r) => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.include('X-API-Key');
      });
  });

  it('should return 200 if apikey header exists and handler returns true', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    validateSecurity.handlers.ApiKeyAuth = function (
      req,
      scopes,
      schema: OpenAPIV3.ApiKeySecurityScheme,
    ) {
      expect(schema.type).to.equal('apiKey');
      expect(schema.in).to.equal('header');
      expect(schema.name).to.equal('X-API-Key');
      expect(scopes).to.be.an('array').with.length(0);
      return true;
    };
    return request(app)
      .get(`${basePath}/api_key`)
      .set('X-API-Key', 'test')
      .expect(200);
  });

  it('should return 404 if apikey header exists and handler returns true but path doesnt exist', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    validateSecurity.handlers.ApiKeyAuth = (
      req,
      scopes,
      schema: OpenAPIV3.ApiKeySecurityScheme,
    ) => {
      expect(schema.type).to.equal('apiKey');
      expect(schema.in).to.equal('header');
      expect(schema.name).to.equal('X-API-Key');
      expect(scopes).to.be.an('array').with.length(0);
      return true;
    };
    return request(app)
      .get(`${basePath}/api_key_but_invalid_path`)
      .set('X-API-Key', 'test')
      .expect(404);
  });

  it('should return 401 if auth header is missing for basic auth', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    validateSecurity.handlers.BasicAuth = (req, scopes, schema) => true;
    return request(app)
      .get(`${basePath}/basic`)
      .expect(401)
      .then((r) => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.include('Authorization');
      });
  });

  it('should return 401 if auth header has malformed basic auth', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    validateSecurity.handlers.BasicAuth = (req, scopes, schema) => true;
    return request(app)
      .get(`${basePath}/basic`)
      .set('Authorization', 'XXXX')
      .expect(401)
      .then((r) => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.include(
          "Authorization header with scheme 'Basic' required",
        );
      });
  });

  it('should return 401 if auth header is missing for bearer auth', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    validateSecurity.handlers.BearerAuth = (req, scopes, schema) => true;
    return request(app)
      .get(`${basePath}/bearer`)
      .expect(401)
      .then((r) => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.include('Authorization');
      });
  });

  it('should return 401 if auth header has malformed bearer auth', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    validateSecurity.handlers.BearerAuth = (req, scopes, schema) => true;
    return request(app)
      .get(`${basePath}/bearer`)
      .set('Authorization', 'XXXX')
      .expect(401)
      .then((r) => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.errors[0].message).to.include(
          "Authorization header with scheme 'Bearer' required",
        );
      });
  });

  it('should return 200 if bearer auth succeeds', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    validateSecurity.handlers.BearerAuth = (
      req,
      scopes,
      schema: OpenAPIV3.HttpSecurityScheme,
    ) => {
      expect(schema.type).to.equal('http');
      expect(schema.scheme).to.equal('bearer');
      expect(scopes).to.be.an('array').with.length(0);
      return true;
    };
    return request(app)
      .get(`${basePath}/bearer`)
      .set('Authorization', 'Bearer XXXX')
      .expect(200);
  });

  it('should return 200 if oauth2 auth succeeds', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    validateSecurity.handlers.OAuth2 = function (
      req,
      scopes,
      schema: OpenAPIV3.OAuth2SecurityScheme,
    ) {
      expect(schema.type).to.equal('oauth2');
      expect(schema).to.have.property('flows');
      expect(scopes).to.be.an('array').with.length(2);

      return true;
    };
    return request(app).get(`${basePath}/oauth2`).expect(200);
  });

  it('should return 403 if oauth2 handler throws 403', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    validateSecurity.handlers.OAuth2 = function (
      req,
      scopes: string[],
      schema: OpenAPIV3.OAuth2SecurityScheme,
    ) {
      expect(schema.type).to.equal('oauth2');
      expect(schema).to.have.property('flows');
      expect(scopes).to.be.an('array').with.length(2);

      throw { status: 403, message: 'forbidden' };
    };
    return request(app)
      .get(`${basePath}/oauth2`)
      .expect(403)
      .then((r) => {
        const body = r.body;
        expect(r.body.message).to.equal('forbidden');
      });
  });

  it('should return 200 if openid auth succeeds', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    validateSecurity.handlers.OpenID = (
      req,
      scopes,
      schema: OpenAPIV3.OpenIdSecurityScheme,
    ) => {
      expect(schema.type).to.equal('openIdConnect');
      expect(schema).to.have.property('openIdConnectUrl');
      expect(scopes).to.be.an('array').with.length(2);

      return true;
    };
    return request(app).get(`${basePath}/openid`).expect(200);
  });

  it('should return 500 if security handlers are defined, but not for all securities', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    delete validateSecurity.handlers.OpenID;
    validateSecurity.handlers.Test = (
      req,
      scopes,
      schema: OpenAPIV3.OpenIdSecurityScheme,
    ) => {
      expect(schema.type).to.equal('openIdConnect');
      expect(schema).to.have.property('openIdConnectUrl');
      expect(scopes).to.be.an('array').with.length(2);

      return true;
    };
    return request(app)
      .get(`${basePath}/openid`)
      .expect(500)
      .then((r) => {
        const body = r.body;
        const msg = "a security handler for 'OpenID' does not exist";
        expect(body.message).to.equal(msg);
        expect(body.errors[0].message).to.equal(msg);
        expect(body.errors[0].path).to.equal(`${basePath}/openid`);
      });
  });

  it('should return 200 if api_key or anonymous and no api key is supplied', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    validateSecurity.handlers.ApiKeyAuth = <any>((req, scopes, schema) => true);
    return request(app).get(`${basePath}/api_key_or_anonymous`).expect(200);
  });

  it('should return 200 if api_key or anonymous and api key is supplied', async () => {
    const validateSecurity = <ValidateSecurityOpts>eovConf.validateSecurity;
    validateSecurity.handlers.ApiKeyAuth = <any>((req, scopes, schema) => true);
    return request(app)
      .get(`${basePath}/api_key_or_anonymous`)
      .set('x-api-key', 'XXX')
      .expect(200);
  });
});

describe('when securities declare: (apikey && bearer) || basic', () => {
  let app = null;
  let basePath = null;
  const eovConf: OpenApiValidatorOpts = {
    apiSpec: path.join('test', 'resources', 'security.yaml'),
  };
  before(async () => {
    app = await createApp(eovConf, 3005);
    basePath = app.basePath;

    app.use(
      `${basePath}`,
      express
        .Router()
        .get('/apikey_and_bearer_or_basic', (req, res) =>
          res.json({ logged_in: true }),
        ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should return 401 if not X-Api-Key is missing', async () =>
    request(app)
      .get(`${basePath}/apikey_and_bearer_or_basic`)
      .set('Authorization', 'Bearer XXXX') // Bearer
      .expect(401)
      .then((r) => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.message).to.include("'X-API-Key' header required");
      }));

  it('should return 401 if Bearer token is missing', async () => {
    eovConf.validateSecurity = true;
    return request(app)
      .get(`${basePath}/apikey_and_bearer_or_basic`)
      .set('X-Api-Key', 'XXX') // api key
      .expect(401)
      .then((r) => {
        const body = r.body;
        expect(body.errors).to.be.an('array');
        expect(body.errors).to.have.length(1);
        expect(body.message).to.include('Authorization header required');
      });
  });

  it('should return 200 when X-Api-Key and Bearer token are present', async () => {
    eovConf.validateSecurity = true;
    return request(app)
      .get(`${basePath}/apikey_and_bearer_or_basic`)
      .set('Authorization', 'Bearer XXXX') // Bearer
      .set('X-Api-Key', 'XXX') // api key
      .expect(200);
  });

  it('should return 200 when Basic auth is present', async () => {
    eovConf.validateSecurity = true;
    return request(app)
      .get(`${basePath}/apikey_and_bearer_or_basic`)
      .set('Authorization', 'Basic XXXX')
      .expect(200);
  });
});
