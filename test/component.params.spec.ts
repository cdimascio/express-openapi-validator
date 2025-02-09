import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';
import { AppWithServer } from './common/app.common';

describe(packageJson.name, () => {
  let app: AppWithServer;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'component.params.yaml');
    app = await createApp({ apiSpec }, 3005, (app) =>
      app.use(
        `/`,
        express.Router().get(`/api/v1/meeting/:id`, (req, res) => {
          res.json(req.params);
        }),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should handle components.parameter $refs', async () => {
    const id = `01701deb-34cb-46c2-972d-6eeea3850342`;
    request(app)
      .get(`/api/v1/meeting/${id}`)
      .expect(200)
      .then((r) => {
        expect(r.body.id).to.equal(id);
      });
  });
});
