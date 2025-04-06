import { expect } from 'chai';
import * as express from 'express';
import { Server } from 'http';
import * as path from 'path';
import * as request from 'supertest';
import * as packageJson from '../package.json';
import { createApp } from './common/app';

interface AppWithServer extends express.Application {
  server: Server;
  basePath: string;
}

describe(packageJson.name, () => {
  let app: AppWithServer;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'all.of.yaml');
    const createdApp = await createApp(
      {
        apiSpec,
        validateRequests: {
          allErrors: true,
        },
      },
      3005,
      (app) => {
        const router = express.Router().post('/all_of', (req, res) => {
          res.json(req.body);
        });
        
        app.use(`${app.basePath}`, router);
      },
    );
    
    app = createdApp as unknown as AppWithServer;
  });

  after(() => {
    if (app && app.server) {
      app.server.close();
    }
  });

  it('should validate allOf', async () =>
    request(app)
      .post(`${app.basePath}/all_of`)
      .send({
        id: 1,
        name: 'jim',
      })
      .expect(200));

  it('should fail validation due to missing required id field', async () =>
    request(app)
      .post(`${app.basePath}/all_of`)
      .send({
        name: 1,
      })
      .expect(400)
      .then((r) => {
        const e = r.body;
        expect(e.message).to.contain("required property 'id'");
      }));

  it('should fail validation due to missing required name field', async () =>
    request(app)
      .post(`${app.basePath}/all_of`)
      .send({
        id: 1,
      })
      .expect(400)
      .then((r) => {
        const e = r.body;
        expect(e.message).to.contain("required property 'name'");
      }));

  // it('should fail if array is sent when object expected', async () =>
  //   request(app)
  //     .post(`${app.basePath}/all_of`)
  //     .send([{ id: 1, name: 'jim' }])
  //     .expect(400)
  //     .then((r: any) => expect(r.body.message).to.contain('must be object')));
});
