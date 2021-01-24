import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';
import { log } from 'console';

describe.only('styles', () => {
  let app = null;
  before(async () => {
    const apiSpec = path.join('test', 'resources', 'query.serialization.yaml');
    app = await createApp({ apiSpec }, 3005, (app) =>
      app.use(
        `/`,
        express
          .Router()
          .get('/api/q_form_explode', (req, res) => res.json({ query: req.query }))
          .get('/api/q_form_nexplode', (req, res) => res.json({ query: req.query })),
      ),
    );
  });

  after(async () => {
    app.server.close();
  });

  it('should handle querey param (default) style=form, explode=true', async () =>
    request(app)
      .get('/api/q_form_explode?state=on&state=off')
      .expect(200)
      .then((r) => {
        expect(r.body.query.state).is.an('array').of.length(2);
      }));

  it.only('should handle query param with style=form, explode=false', async () =>
    request(app)
      .get('/api/q_form_nexplode')
      .query({
        state: 'on,off',
      })
      .expect(200)
      .then((r) => {
        expect(r.body.query.state).is.an('array').of.length(2);
      }));
});
