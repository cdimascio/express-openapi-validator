import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import * as http from 'http';
import { OpenApiValidator } from '../src';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app = null;

  before(() => {
    try {
      // Set up the express app
      const apiSpec = path.join('test', 'resources', 'openapi.yaml');
      app = express();
      new OpenApiValidator({
        apiSpec,
      }).installSync(app);
      app.get('/v1/pets', (req, res) => res.json({ name: 'max' }));
      app.use((err, req, res, next) => {
        // format error
        // console.error(err, err.stack);
        res.status(err.status).json({
          message: err.message,
          errors: err.errors,
        });
      });

      const server = http.createServer(app);
      server.listen(3000);
      console.log('Listening on port 3000');
    } catch (e) {
      console.error(e);
    }
  });

  after(() => {
    setTimeout(() => process.exit(), 100);
  });

  it('should validate /v1/pets and return 400', async () =>
    request(app)
      .get(`/v1/pets`)
      .expect(400)
      .then(r => {
        console.log(r.body.errors[0].message);
        expect(r.body).has.property('errors');
        expect(r.body.errors[0].message).to.equal(
          "should have required property 'limit'",
        );
        // expect(r.body.name).to.be.equal(true);
      }));
});
