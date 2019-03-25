const expect = require('chai').expect;
import * as request from 'supertest';
import app from './app';
const packageJson = require('../package.json');

describe(packageJson.name, () => {
  it('should throw 404 on a route defined in express, but not documented in the openapi spec', async () =>
    request(app)
      .get('/v1/router1/10')
      .set('Accept', 'application/json')
      .expect(404)
      .then(r => {
        const e = r.body.errors[0];
        expect(e.message).to.equal('not found')
        expect(e.path).to.equal('/v1/router1/10')
      }));
});
