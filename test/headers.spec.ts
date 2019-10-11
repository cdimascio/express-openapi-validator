import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app = null;

  before(() => {
    const apiSpec = path.join('test', 'resources', 'openapi.yaml');
    return createApp({ apiSpec }, 3004).then(a => {
      app = a;
    });
  });

  after(() => {
    (<any>app).server.close();
  });

  it('should throw 400 if required header is missing', async () =>
    request(app)
      .get(`${app.basePath}/pets/10/attributes`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400)
      .then(r => {
        const e = r.body.errors;
        expect(e).to.have.length(1);
        expect(e[0].path).to.equal('.headers.x-attribute-id');
      }));
});
