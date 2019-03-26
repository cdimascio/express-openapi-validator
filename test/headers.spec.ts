import { expect } from 'chai';
import * as request from 'supertest';
import app from './app';

const packageJson = require('../package.json');
const basePath = app.basePath;

describe(packageJson.name, () => {
  after(() => {
    app.server.close();
  });

  it('should throw 400 if required header is missing', async () =>
    request(app)
      .get(`${basePath}/pets/10/attributes`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400)
      .then(r => {
        const e = r.body.errors;
        expect(e).to.have.length(1);
        expect(e[0].path).to.equal('x-attribute-id');
      }));
});
