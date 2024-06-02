import path from 'path';
import express from 'express';
import request from 'supertest';
import { ExpressWithServer, createApp } from './common/app';
import * as packageJson from '../package.json';
import { expect } from 'chai';

describe(packageJson.name, () => {
  let app: ExpressWithServer;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join(
      'test',
      'resources',
      'additional.props.query.params.yaml',
    );
    app = await createApp({ apiSpec }, 3005, (app) =>
      app.use(
        express
          .Router()
          .get(`/params_with_additional_props`, (req, res) =>
            res.status(200).json(req.body),
          ),
      ),
    );
  });

  after(async () => {
    await app.closeServer();
  });

  it('should allow additional / unknown properties properties', async () =>
    request(app)
      .get(`/params_with_additional_props`)
      .query({ required: 1, test: 'test' })
      .expect(200));

  it('should return 400 on missing required prop (when using additional props explode object)', async () =>
    request(app)
      .get(`/params_with_additional_props`)
      .query({ test: 'test' })
      .expect(400)
      .then((r) => {
        expect(r.body.message).to.contain('required');
      }));
});
