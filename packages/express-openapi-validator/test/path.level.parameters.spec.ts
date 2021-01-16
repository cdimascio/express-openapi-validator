import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join(
      'test',
      'resources',
      'path.level.parameters.yaml',
    );
    app = await createApp({ apiSpec }, 3005, app =>
      app.use(
        `${app.basePath}`,
        express
          .Router()
          .get(`/path_level_parameters`, (_req, res) => res.send()),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should return 400 if pathLevel query parameter is not provided', async () =>
    request(app)
      .get(`${app.basePath}/path_level_parameters?operationLevel=123`)
      .send()
      .expect(400)
      .then(r => {
        expect(r.body.errors).to.be.an('array');
        expect(r.body.errors).to.have.length(1);
        const message = r.body.errors[0].message;
        expect(message).to.equal("should have required property 'pathLevel'");
      }));

  it('should return 400 if operationLevel query parameter is not provided', async () =>
    request(app)
      .get(`${app.basePath}/path_level_parameters?pathLevel=123`)
      .send()
      .expect(400)
      .then(r => {
        expect(r.body.errors).to.be.an('array');
        expect(r.body.errors).to.have.length(1);
        const message = r.body.errors[0].message;
        expect(message).to.equal(
          "should have required property 'operationLevel'",
        );
      }));

  it('should return 400 if neither operationLevel, nor pathLevel query parameters are provided', async () =>
    request(app)
      .get(`${app.basePath}/path_level_parameters`)
      .send()
      .expect(400)
      .then(r => {
        expect(r.body.errors).to.be.an('array');
        expect(r.body.errors).to.have.length(2);
        const messages = r.body.errors.map(err => err.message);
        expect(messages).to.have.members([
          "should have required property 'pathLevel'",
          "should have required property 'operationLevel'",
        ]);
      }));

  it('should return 200 if both pathLevel and operationLevel query parameter are provided', async () =>
    request(app)
      .get(`${app.basePath}/path_level_parameters?operationLevel=123&pathLevel=123`)
      .send()
      .expect(200));
});
