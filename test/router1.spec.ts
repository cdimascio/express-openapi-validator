const expect = require('chai').expect;
import * as request from 'supertest';
import app from './app';
const packageJson = require('../package.json');

describe(packageJson.name, () => {
  it('should throw 200 on route from new router', async () =>
    request(app)
      .get('/v1/router1/10')
      .set('Accept', 'application/json')
      .expect(404)
      .then(r => {
        const e = r.body;
        console.log('--ERROR BODY--', e);
      }));
});
