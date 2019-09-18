import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

const packageJson = require('../package.json');
const apiSpecPath = path.join('test', 'resources', 'response.validation.yaml');

describe(packageJson.name, () => {
  let app = null;
  let basePath = null;

  before(async () => {
    // Set up the express app
    app = await createApp(
      { apiSpec: apiSpecPath, validateResponses: true },
      3005,
      false,
    );
    basePath = app.basePath;
    app.get(`${basePath}/pets`, (req, res) => {
      let json = {};
      if ((req.query.mode = 'bad_type')) {
        json = [{ id: 'bad_id', name: 'name', tag: 'tag' }];
      }
      return res.json(json);
    });
    // Register error handler
    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({
        message: err.message,
        code: err.status,
      });
    });
  });

  after(() => {
    app.server.close();
  });

  it('should fail if response field has a value of incorrect type', async () =>
    request(app)
      .get(`${basePath}/pets?mode=bad_type`)
      .expect(500)
      .then((r: any) => {
        expect(r.body.message).to.contain('should be integer');
        expect(r.body)
          .to.have.property('code')
          .that.equals(500);
      }));
});
