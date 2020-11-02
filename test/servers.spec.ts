import * as path from 'path';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app = null;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'servers.1.yaml');
    app = await createApp(
      {
        apiSpec,
      },
      3005,
      (app) => {
        app.get(`/api/v1/petstore/ping`, (req, res) => res.json({ ...req.body }));
        app.get(`/api/v2/storeofpets/ping`, (req, res) => res.json({ ...req.body }));
        app.get(`/api/v3/petstore/ping`, (req, res) => res.json({ ...req.body }));
      },
      true,
    );
  });

  after(() => app.server.close());

  it('should validate server path with version variable, v2', async () =>
    request(app).get('/api/v1/petstore/ping').query({}).expect(400));

  it('should validate server path with version variable, v2', async () =>
    request(app).get('/api/v2/storeofpets/ping').send({}).expect(400));

  it('should skip validation of api path with undeclared variable value', async () =>
    request(app).get('/api/v3/petstore/ping').send({}).expect(200));
});

describe(packageJson.name, () => {
    let app = null;
  
    before(async () => {
      const apiSpec = path.join('test', 'resources', 'servers.2.yaml');
      app = await createApp(
        {
          apiSpec,
        },
        3005,
        (app) => {
          app.get(`/api/v1:petstore/ping`, (req, res) => res.json({ ...req.body }));
          app.get(`/api/v2:storeofpets/ping`, (req, res) => res.json({ ...req.body }));
          app.get(`/api/v3:petstore/ping`, (req, res) => res.json({ ...req.body }));
        },
        true,
      );
    });
  
    after(() => app.server.close());
  
    it('should validate server path with version variable, v2', async () =>
      request(app).get('/api/v1:petstore/ping').query({}).expect(400));
  
    it('should validate server path with version variable, v2', async () =>
      request(app).get('/api/v2:storeofpets/ping').send({}).expect(400));
  
    it('should skip validation of api path with undeclared variable value', async () =>
      request(app).get('/api/v3:petstore/ping').send({}).expect(200));
  });
  