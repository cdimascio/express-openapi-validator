import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './app';
import * as packageJson from '../package.json';

const app = createApp({ apiSpecPath: './openapi.yaml' }, 3004);
const basePath = (<any>app).basePath;

describe(packageJson.name, () => {
  after(() => {
    (<any>app).server.close();
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
