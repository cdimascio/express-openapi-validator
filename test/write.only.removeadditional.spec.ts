import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';
import { AppWithServer } from './common/app.common';

describe(packageJson.name, () => {
  let app: AppWithServer;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'write.only.yaml');
    app = await createApp(
      { apiSpec, validateResponses: { removeAdditional: true } },
      3005,
      (app) =>
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
            body.reviews = body.reviews.map((r) => ({
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

  it('should remove write only inlined properties in responses thanks to removeAdditional', async () =>
    request(app)
      .post(`${app.basePath}/products/inlined`)
      .set('content-type', 'application/json')
      .send({
        name: 'some name',
        role: 'admin',
        price: 10.99,
      })
      .expect(200)
      .then((r) => {
        const body = r.body;
        expect(body.message).to.be.undefined;
        expect(body.role).to.be.undefined;
        expect(body.price).to.be.equal(10.99);
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

  it('should remove write only properties in responses (nested schema $refs) thanks to removeAdditional', async () =>
    request(app)
      .post(`${app.basePath}/products/nested`)
      .set('content-type', 'application/json')
      .send({
        name: 'some name',
        price: 10.99,
        password: 'password_value',
        reviews: [
          {
            rating: 5,
            review_password: 'review_password_value',
          },
        ],
      })
      .expect(200)
      .then((r) => {
        const body = r.body;
        expect(body.reviews[0].role_x).to.be.undefined;
        expect(body.reviews[0].rating).to.be.equal(5);
      }));
});
