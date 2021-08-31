import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

describe('oneOf with discriminator', () => {
  let app = null;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'boba.yaml');
    app = await createApp(
      { apiSpec },
      3005,
      (app) => {
        app.post(`${app.basePath}/discriminator_implied`, (req, res) =>
          res.json(req.body),
        );
        app.post(`${app.basePath}/pets`, (req, res) => {
          res.json(req.body);
        });
        app.post(`${app.basePath}/pets_all`, (req, res) => {
          res.json(req.body);
        });
        app.use((err, req, res, next) => {
          res.status(err.status ?? 500).json({
            message: err.message,
            code: err.status ?? 500,
          });
        });
      },
      false,
    );
  });

  after(() => {
    app.server.close();
  });

  describe('/discriminator_implied', () => {
    it('should return 200 for dog', async () =>
      request(app)
        .post(`${app.basePath}/discriminator_implied`)
        .set('content-type', 'application/json')
        .send({
          pet_type: 'DogObject',
          bark: true,
          breed: 'Dingo',
        })
        .expect(200));
  });
});
