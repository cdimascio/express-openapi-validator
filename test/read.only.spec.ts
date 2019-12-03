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
    const apiSpec = path.join('test', 'resources', 'read.only.yaml');
    app = await createApp({ apiSpec, validateResponses: true }, 3005, app =>
      app
        .post(`${app.basePath}/products`, (req, res) => res.json(req.body))
        .get(`${app.basePath}/products`, (req, res) =>
          res.json([
            {
              id: 'id_1',
              name: 'name_1',
              price: 9.99,
              created_at: new Date().toISOString(),
            },
          ]),
        )
        .post(`${app.basePath}/products/inlined`, (req, res) =>
          res.json(req.body),
        )
        .post(`${app.basePath}/user`, (req, res) =>
          res.json({
            ...req.body,
            ...(req.query.include_id ? { id: 'test_id' } : {}),
          }),
        )
        .post(`${app.basePath}/user_inlined`, (req, res) =>
          res.json({
            ...req.body,
            ...(req.query.include_id ? { id: 'test_id' } : {}),
          }),
        )
        .post(`${app.basePath}/products/nested`, (req, res) => {
          const body = req.body;
          body.id = 'test';
          body.created_at = new Date().toISOString();
          body.reviews = body.reviews.map(r => ({
            id: 99,
            rating: r.rating ?? 2,
          }));
          res.json(body);
        }),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should not allow read only properties in requests', async () =>
    request(app)
      .post(`${app.basePath}/products`)
      .set('content-type', 'application/json')
      .send({
        id: 'id_1',
        name: 'some name',
        price: 10.99,
        created_at: new Date().toISOString(),
      })
      .expect(400)
      .then(r => {
        const body = r.body;
        // id is a readonly property and should not be allowed in the request
        expect(body.message).to.contain('id');
      }));

  it('should allow read only properties in responses', async () =>
    request(app)
      .get(`${app.basePath}/products`)
      .expect(200)
      .then(r => {
        expect(r.body)
          .to.be.an('array')
          .with.length(1);
      }));

  it('should not allow read only inlined properties in requests', async () =>
    request(app)
      .post(`${app.basePath}/products/inlined`)
      .set('content-type', 'application/json')
      .send({
        id: 'id_1',
        name: 'some name',
        price: 10.99,
        created_at: new Date().toUTCString(),
      })
      .expect(400)
      .then(r => {
        const body = r.body;
        // id is a readonly property and should not be allowed in the request
        expect(body.message).to.contain('id');
      }));

  it('should not allow read only properties in requests (nested schema $refs)', async () =>
    request(app)
      .post(`${app.basePath}/products/nested`)
      .set('content-type', 'application/json')
      .send({
        id: 'id_1',
        name: 'some name',
        price: 10.99,
        created_at: new Date().toISOString(),
        reviews: {
          id: 'review_id',
          rating: 5,
        },
      })
      .expect(400)
      .then(r => {
        const body = r.body;
        // id is a readonly property and should not be allowed in the request
        expect(body.message).to.contain('id');
      }));

  it('should not allow read only properties in requests (deep nested schema $refs)', async () =>
    request(app)
      .post(`${app.basePath}/products/nested`)
      .set('content-type', 'application/json')
      .send({
        name: 'some name',
        price: 10.99,
        reviews: [
          {
            id: 10,
            rating: 5,
          },
        ],
      })
      .expect(400)
      .then(r => {
        const body = r.body;
        // id is a readonly property and should not be allowed in the request
        expect(body.message).to.contain('request.body.reviews[0].id');
      }));

  it('should pass validation if required read only properties to be missing from request ($ref)', async () =>
    request(app)
      .post(`${app.basePath}/user`)
      .set('content-type', 'application/json')
      .query({
        include_id: true,
      })
      .send({
        username: 'test',
      })
      .expect(200)
      .then(r => {
        expect(r.body)
          .to.be.an('object')
          .with.property('id');
        expect(r.body).to.have.property('username');
      }));

  it('should pass validation if required read only properties to be missing from request (inlined)', async () =>
    request(app)
      .post(`${app.basePath}/user_inlined`)
      .set('content-type', 'application/json')
      .query({
        include_id: true,
      })
      .send({
        username: 'test',
      })
      .expect(200)
      .then(r => {
        expect(r.body)
          .to.be.an('object')
          .with.property('id');
        expect(r.body).to.have.property('username');
      }));

  it('should fail validation if required read only properties is missing from the response', async () =>
    request(app)
      .post(`${app.basePath}/user`)
      .set('content-type', 'application/json')
      .send({
        username: 'test',
      })
      .expect(500)
      .then(r => {
        expect(r.body.errors[0])
          .to.have.property('message')
          .equals("should have required property 'id'");
      }));
});
