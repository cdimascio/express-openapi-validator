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

  it('should validate server path with version variable, v2 and petstore', async () =>
    request(app).get('/api/v1/petstore/ping').query({}).expect(400));

  it('should validate server path with version variable, v2 and storeofpets', async () =>
    request(app).get('/api/v2/storeofpets/ping').send({}).expect(400));

  it('should skip validation of api path with invalid enum value v3, and valid value petstore', async () =>
      // the validator should not validate routes that do note match one declare in the opeanpi apec
      // in this case, 'v3' is not a valid value for api
      // TODO throw an error instead of ignoring it
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
  
    it('should validate server path with version variables, v2 and petstore', async () =>
      request(app).get('/api/v1:petstore/ping').query({}).expect(400));
  
    it('should validate server path with version variables, v2 and storeofpets', async () =>
      request(app).get('/api/v2:storeofpets/ping').send({}).expect(400));
  
    it('should skip validation of api path with invalid variable value, v2, and valid variable petstore', async () =>
      // the validator should not validate routes that do note match one declare in the opeanpi apec
      // in this case, 'v3' is not a valid value for api
      // TODO throw an error instead of ignoring it
      request(app).get('/api/v3:petstore/ping').send({}).expect(200));
  });
  