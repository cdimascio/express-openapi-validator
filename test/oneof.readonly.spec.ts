import * as path from 'path';
import * as express from 'express';
import * as request from 'supertest';
import { createApp } from './common/app';
import { expect } from 'chai';

describe('one.of readonly', () => {
  let app = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join(__dirname, 'oneof.readonly.yaml');
    app = await createApp({ apiSpec }, 3005, (app) =>
      app.use(
        express
          .Router()
          .post(`${app.basePath}/any_of_one_required`, (req, res) =>
            res.status(200).json({ success: true }),
          )
          .post(`${app.basePath}/any_of`, (req, res) =>
            res.status(200).json({ success: true }),
          )
          .post(`${app.basePath}/one_of`, (req, res) =>
            res.status(200).json({ success: true }),
          ),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('post type anyOf (without readonly id) should pass', async () =>
    request(app)
      .post(`${app.basePath}/any_of`)
      .send({ type: 'A' })
      .set('Content-Type', 'application/json')
      .expect(200));

  it('post type oneOf (without readonly id) should pass', async () =>
    request(app)
      .post(`${app.basePath}/one_of`)
      .send({ type: 'A' })
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        const error = r.body;
        expect(error.message).to.include('to one of the allowed values: C, D');
      }));

  it('post type oneOf (without readonly id) should pass', async () =>
    request(app)
      .post(`${app.basePath}/one_of`)
      .send({ type: 'C' })
      .set('Content-Type', 'application/json')
      .expect(200));

  it('post type anyof without providing the single required readonly property should pass', async () =>
    request(app)
      .post(`${app.basePath}/one_of`)
      .send({ type: 'C' }) // do not provide id
      .set('Content-Type', 'application/json')
      .expect(200));

  it('should fail if posting anyof with bad discriminator', async () =>
    request(app)
      .post(`${app.basePath}/one_of`)
      .send({ type: 'A' }) // do not provide id
      .set('Content-Type', 'application/json')
      .expect(400)
      .then((r) => {
        expect(r.body.message).includes('to one of the allowed values: C, D');
      }));
});
