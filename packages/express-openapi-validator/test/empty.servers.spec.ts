import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

describe('empty servers', () => {
  let app = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'empty.servers.yaml');
    app = await createApp({ apiSpec }, 3007, app =>
      app.use(
        ``,
        express
          .Router()
          .get(`/pets`, (req, res) => res.json(req.body)),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should throw 400 if servers are empty and request is malformed', async () =>
    request(app)
      .get(`/pets`)
      .expect(400)
      .then(r => {
        expect(r.body.errors).to.be.an('array');
        expect(r.body.errors).to.have.length(2);
      }));
});
