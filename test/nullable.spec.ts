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
    const apiSpec = path.join('test', 'resources', 'nullable.yaml');
    app = await createApp({ apiSpec, coerceTypes: false }, 3005, (app) =>
      app.use(
        `${app.basePath}`,
        express
          .Router()
          .post(`/pets/nullable`, (req, res) => res.json(req.body))
          .post(`/test/object`, (req, res) => res.json(req.body))
          .post(`/test/object/nullable_int`, (req, res) => res.json(req.body)),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should allow null to be set (name: nullable true)', async () =>
    request(app)
      .post(`${app.basePath}/pets/nullable`)
      .send({
        name: null,
      })
      .expect(200)
      .then((r) => {
        expect(r.body.name).to.be.null;
      }));

  it('should not fill an explicity null with default when coerceTypes is false', async () =>
    request(app)
      .post(`${app.basePath}/pets`)
      .send({
        name: null,
      })
      .expect(400));

  it('should fill unspecified field with default when coerceTypes is false', async () =>
    request(app)
      .post(`${app.basePath}/pets`)
      .send({
        name: 'name',
      })
      .expect(200)
      .then((r) => {
        expect(r.body.body.tag).to.equal('my default value');
      }));

  it('should fail if required and not provided (nullable true)', async () =>
    request(app)
      .post(`${app.basePath}/pets/nullable`)
      .send({})
      .expect(400)
      .then((r) => {
        expect(r.body.errors[0].path).to.equal('.body.name');
      }));

  it('should fail if required and not provided (nullable false', async () =>
    request(app)
      .post(`${app.basePath}/pets`)
      .send({})
      .expect(400)
      .then((r) => {
        expect(r.body.errors[0].path).to.equal('.body.name');
      }));

  it('should fail if required and provided as null when nullable is false', async () =>
    request(app)
      .post(`${app.basePath}/pets`)
      .send({
        name: null,
      })
      .expect(400)
      .then((r) => {
        expect(r.body.errors[0].path).to.equal('.body.name');
      }));

  it('should allow nullable object', async () =>
    request(app)
      .post(`${app.basePath}/test/object`)
      .send({ nullableObject: null })
      .expect(200));

  it('should not coerce a nullable int', async () =>
    request(app)
      .post(`${app.basePath}/test/object/nullable_int`)
      .send({ number: null })
      .expect(200)
      .then((r) => {
        expect(r.body).to.have.property('number').that.is.null;
      }));
});
