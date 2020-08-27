import * as path from 'path';
import * as express from 'express';
import * as request from 'supertest';
import { createApp } from '../common/app';
import * as packageJson from '../../package.json';

describe(packageJson.name, () => {
  let app = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join(__dirname, '356.campaign.yaml');
    app = await createApp({ apiSpec }, 3005, (app) =>
      app.use(
        express.Router().post(`/campaign`, (req, res) =>
          res.status(201).json({
            id: 123,
            name: req.body.name,
            description: req.body.description,
            startDate: req.body.startDate,
            createdAt: req.body.startDate,
            updatedAt: req.body.updatedAt,
          }),
        ),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('create campaign should return 201', async () => request(app)
      .post(`/campaign`)
      .send({
        name: 'test',
        description: 'description',
        startDate: '2020-08-25T20:37:33.117Z',
        endDate: '2020-08-25T20:37:33.117Z',
      })
      .expect(201)
  );
});
