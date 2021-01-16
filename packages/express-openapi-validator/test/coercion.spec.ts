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
    const apiSpec = path.join('test', 'resources', 'coercion.yaml');
    app = await createApp({ apiSpec }, 3005, (app) =>
      app.use(
        `${app.basePath}/coercion`,
        express
          .Router()
          .post(`/pets`, (req, res) => res.json(req.body))
          .post(`/pets_string_boolean`, (req, res) => res.json(req.body)),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should return 400 since is_cat is passed as string not boolean', async () =>
    request(app)
      .post(`${app.basePath}/coercion/pets`)
      .send({
        name: 'test',
        is_cat: 'true',
      })
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.contain('is_cat should be boolean');
      }));

  it('should return 400 when age is passed as string, but number is expected', async () =>
    request(app)
      .post(`${app.basePath}/coercion/pets`)
      .send({
        name: 'test',
        is_cat: true,
        age: '13.5',
      })
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.contain('age should be number');
      }));

  it('should return 400 when age (number) is null', async () =>
    request(app)
      .post(`${app.basePath}/coercion/pets`)
      .send({
        name: 'test',
        is_cat: true,
        age: null,
      })
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.contain('age should be number');
      }));

  it('should return 200 when all are typed correctly', async () =>
    request(app)
      .post(`${app.basePath}/coercion/pets`)
      .send({
        name: 'test',
        is_cat: true,
        age: 13.5,
      })
      .expect(200)
      .then((r) => {
        expect(r.body.age).to.equal(13.5);
        expect(r.body.is_cat).to.equal(true);
      }));

  it('should keep is_cat as boolean', async () =>
    request(app)
      .post(`${app.basePath}/coercion/pets`)
      .send({
        name: 'test',
        is_cat: true,
      })
      .expect(200)
      .then((r) => {
        expect(r.body.is_cat).to.be.a('boolean');
        expect(r.body.is_cat).to.be.equal(true);
      }));

  it('should return 400 when is_cat requires string type "true", but boolean specified', async () =>
    request(app)
      .post(`${app.basePath}/coercion/pets_string_boolean`)
      .send({
        name: 'test',
        is_cat: true,
      })
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.contain('is_cat should be string');
      }));
});
