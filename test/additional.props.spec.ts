import * as request from 'supertest';
import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import { createApp } from './common/app';
import * as packageJson from '../package.json';
import { RequestHandler } from 'express';
import { Server } from 'http';

interface AppWithServer extends express.Application {
  server: Server;
  basePath: string;
}

describe(packageJson.name, () => {
  let app: AppWithServer;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join(
      'test',
      'resources',
      'additional.properties.yaml',
    );
    const createdApp = await createApp(
      {
        apiSpec,
        validateRequests: {
          allErrors: true,
        },
      },
      3005,
      (app) => {
        const router = express.Router();
        router
          .post('/false', (req, res) => {
            res.json(req.body);
          })
          .post('/true', (req, res) => {
            res.json(req.body);
          });
        
        app.use(`${app.basePath}/additional_props`, router);
      },
    );
    
    app = createdApp as unknown as AppWithServer;
  });

  after(() => {
    if (app && app.server) {
      app.server.close();
    }
  });

  it('should return 400 if additionalProperties=false, and type is invalid', async () =>
    request(app)
      .post(`${app.basePath}/additional_props/false`)
      .send({
        name: 'test',
        extra_prop: 'test',
        age: '11',
      })
      .expect(400)
      .then((r) => {
        expect(r.body.errors).to.be.an('array');
        expect(r.body.errors).to.have.length(2);
        const m1 = r.body.errors[0].message;
        expect(m1).to.equal('must NOT have additional properties');
        const m2 = r.body.errors[1].message;
        expect(m2).to.equal('must be number');
      }));

  it('should return 400 if additionalProperties=false, but extra props sent', async () =>
    request(app)
      .post(`${app.basePath}/additional_props/false`)
      .send({
        name: 'test',
        extra_prop: 'test',
      })
      .expect(400)
      .then((r) => {
        expect(r.body.errors).to.be.an('array');
        expect(r.body.errors).to.have.length(1);
        const message = r.body.errors[0].message;
        expect(message).to.equal('must NOT have additional properties');
      }));

  it('should return 200 if additonalProperities=true and extra props are sent', async () =>
    request(app)
      .post(`${app.basePath}/additional_props/true`)
      .send({
        name: 'test',
        extra_prop: 'test',
      })
      .expect(200));
});
