import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

describe('json spec, disable dereference', () => {
  let app = null;

  before(async () => {
    // note when $refParser is false an invalid spec or a spec with $refs can cause unexpected errors
    const apiSpecJson = require('./resources/openapi.json');
    app = await createApp({ apiSpec: apiSpecJson, $refParser: false });
  });
  after(() => {
    app.server.close();
  });

  it('should bypass dereference step and load spec, and still validate apis ', async () =>
    // note when $refParser is false an invalid spec or a spec with $refs can cause unexpected errors
    request(app)
      .get(`${app.basePath}/pets`)
      .expect(400)
      .then(r => {
        expect(r.body)
          .to.have.property('message')
          .that.contains('limit');
      }));
});

describe('file path no derefernce', () => {
  let app = null;

  before(async () => {
    // note when $refParser is false an invalid spec or a spec with $refs can cause unexpected errors
    const apiSpec = path.join(__dirname, 'resources', 'openapi.json');
    app = await createApp({ apiSpec, $refParser: false });
  });

  after(() => {
    app.server.close();
  });

  it('should bypass dereference step and load spec, and still validate apis ', async () =>
    // note when $refParser is false an invalid spec or a spec with $refs can cause unexpected errors
    request(app)
      .get(`${app.basePath}/pets`)
      .expect(400)
      .then(r => {
        expect(r.body)
          .to.have.property('message')
          .that.contains('limit');
      }));
});
