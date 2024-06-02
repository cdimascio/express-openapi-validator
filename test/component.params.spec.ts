import path from 'path';
import express from 'express';
import { expect } from 'chai';
import request from 'supertest';
import { ExpressWithServer, createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app: ExpressWithServer;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'component.params.yaml');
    app = await createApp({ apiSpec }, 3005, (app) =>
      app.use(
        `/`,
        express
          .Router()
          .get(`/api/v1/meeting/:id`, (req, res) => res.json(req.params)),
      ),
    );
  });

  after(async () => {
    await app.closeServer();
  });

  it('should handle components.parameter $refs', async () => {
    const id = `01701deb-34cb-46c2-972d-6eeea3850342`;
    return request(app)
      .get(`/api/v1/meeting/${id}`)
      .expect(200)
      .then((r) => {
        expect(r.body.id).to.equal(id);
      });
  });
});
