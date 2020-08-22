import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'write.only.yaml');
    app = await createApp({ apiSpec, validateResponses: true }, 3005, app =>
      app
        .post(`${app.basePath}/products/inlined`, (req, res) => {
          const body = req.body;
          const excludeWriteOnly = req.query.exclude_write_only;
          if (excludeWriteOnly) {
            delete body.role;
          }
          res.json(body);
        })
        .post(`${app.basePath}/products/nested`, (req, res) => {
          const body = req.body;
          const excludeWriteOnly = req.query.exclude_write_only;
          body.id = 'test';
          body.created_at = new Date().toISOString();
          body.reviews = body.reviews.map(r => ({
            ...(excludeWriteOnly ? {} : { role_x: 'admin' }),
            rating: r.rating ?? 2,
          }));

          if (excludeWriteOnly) {
            delete body.role;
          }
          res.json(body);
        }),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should not allow ready only inlined properties in requests', async () =>
    request(app)
      .post(`${app.basePath}/products/inlined`)
      .set('content-type', 'application/json')
      .send({
        name: 'some name',
        price: 10.99,
        created_at: new Date().toUTCString(),
      })
      .expect(400)
      .then(r => {
        const body = r.body;
        // id is a readonly property and should not be allowed in the request
        expect(body.message).to.contain('created_at');
      }));

  it('should not allow write only inlined properties in responses', async () =>
    request(app)
      .post(`${app.basePath}/products/inlined`)
      .set('content-type', 'application/json')
      .send({
        name: 'some name',
        role: 'admin',
        price: 10.99,
      })
      .expect(500)
      .then(r => {
        const body = r.body;
        expect(body.message).to.contain('role');
        expect(body.errors[0].path).to.contain('.response.role');
        expect(body.errors[0].message).to.contain('write-only');
      }));

  it('should return 200 if no write-only properties are in the responses', async () =>
    request(app)
      .post(`${app.basePath}/products/inlined`)
      .query({
        exclude_write_only: true,
      })
      .set('content-type', 'application/json')
      .send({
        name: 'some name',
        role: 'admin',
        price: 10.99,
      })
      .expect(200));

  it('should not allow write only properties in responses (nested schema $refs)', async () =>
    request(app)
      .post(`${app.basePath}/products/nested`)
      .set('content-type', 'application/json')
      .send({
        name: 'some name',
        price: 10.99,
        reviews: [
          {
            rating: 5,
          },
        ],
      })
      .expect(500)
      .then(r => {
        const body = r.body;
        expect(body.message).to.contain('role_x');
        expect(body.errors[0].path).to.contain('.response.reviews[0].role_x');
        expect(body.errors[0].message).to.contain('write-only');
      }));

  it('should not allow read only properties in requests (deep nested schema $refs)', async () =>
    request(app)
      .post(`${app.basePath}/products/nested`)
      .query({
        exclude_write_only: true,
      })
      .set('content-type', 'application/json')
      .send({
        name: 'some name',
        price: 10.99,
        reviews: [
          {
            id: 99,
            role_x: 'admin',
            rating: 5,
          },
        ],
      })
      .expect(400)
      .then(r => {
        const body = r.body;
        expect(body.message).to.contain('request.body.reviews[0].id');
      }));
});
