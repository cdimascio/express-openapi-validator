import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

const packageJson = require('../package.json');

describe(packageJson.name, () => {
  let app = null;
  let basePath = null;

  before(async () => {
    app = await createApp(
      { apiSpec: './test/resources/additional.properties.yaml' },
      3005,
    );
    basePath = app.basePath;
  });

  after(() => {
    app.server.close();
  });

  it('should return 400 when post has extra props', async () =>
    request(app)
      .post(`${basePath}/pets`)
      .send({
        name: 'test',
        unknown_prop: 'test',
      })
      .expect(400)
      .then(r => {
        expect(r.body.errors)
          .to.be.an('array')
          .with.length(1);
        expect(r.body.errors[0].message).to.equal(
          'should NOT have additional properties',
        );
      }));
});
