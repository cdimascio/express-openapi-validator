import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app = null;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'one.of.2.yaml');
    app = await createApp(
      { apiSpec },
      3005,
      (app) => {
        app.post(`${app.basePath}/pets`, (req, res) => {
          res.json(req.body);
        });
        app.post(`${app.basePath}/pets_all`, (req, res) => {
          res.json(req.body);
        });
        app.use((err, req, res, next) => {
          console.error(err);
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

  describe('/pets', () => {
    it('should return 400 a bad discriminator', async () => {
      return request(app)
        .post(`${app.basePath}/pets`)
        .set('content-type', 'application/json')
        .send({
          pet_type: 'DogObject',
          bark: true,
          breed: 'Dingo',
        })
        .expect(400)
        .then((r) => {
          const e = r.body;
          expect(e.message).to.include('one of the allowed values: dog, cat');
        });
    });

    it('should return 200 for dog', async () => {
      return request(app)
        .post(`${app.basePath}/pets`)
        .set('content-type', 'application/json')
        .send({
          pet_type: 'dog',
          bark: true,
          breed: 'Dingo',
        })
        .expect(200);
    });

    it('should return 200 for cat', async () => {
      return request(app)
        .post(`${app.basePath}/pets`)
        .set('content-type', 'application/json')
        .send({
          pet_type: 'cat',
          hunts: true,
          age: 3,
        })
        .expect(200);
    });
  });

  describe('/pets_all', () => {
    it('should return 400 a bad discriminator', async () => {
      return request(app)
        .post(`${app.basePath}/pets_all`)
        .set('content-type', 'application/json')
        .send({
          pet_type: 'DogObject',
          bark: true,
          breed: 'Dingo',
        })
        .expect(400)
        .then((r) => {
          const e = r.body;
          expect(e.message).to.include('to one of the allowed values: dog, cat');
        });
    });

    it('should return 200 for dog', async () => {
      return request(app)
        .post(`${app.basePath}/pets_all`)
        .set('content-type', 'application/json')
        .send({
          pet_type: 'dog',
          bark: true,
          breed: 'Dingo',
        })
        .expect(200);
    });

    it('should return 200 for cat', async () => {
      return request(app)
        .post(`${app.basePath}/pets_all`)
        .set('content-type', 'application/json')
        .send({
          pet_type: 'cat',
          hunts: true,
          age: 3,
        })
        .expect(200);
    });
  });
});
