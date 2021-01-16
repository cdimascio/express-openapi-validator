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
    const apiSpec = path.join('test', 'resources', 'all.of.yaml');
    app = await createApp({ apiSpec }, 3005, (app) =>
      app.use(
        `${app.basePath}`,
        express.Router().post(`/all_of`, (req, res) => res.json(req.body)),
      ),
    );
  });

  after(() => {
    app.server.close();
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
  //     .then((r: any) => expect(r.body.message).to.contain('should be object')));
});
