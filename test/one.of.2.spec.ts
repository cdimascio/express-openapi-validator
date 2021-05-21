import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

describe('oneOf with discriminator', () => {
  let app = null;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'one.of.2.yaml');
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

    it('should return 200 for cat and populate default color', async () =>
      request(app)
        .post(`${app.basePath}/discriminator_implied`)
        .set('content-type', 'application/json')
        .send({
          pet_type: 'CatObject',
          hunts: true,
          age: 10,
        })
        .expect(200)
        .then((r) => {
          expect(r.body.color).to.eql('gray');
        }));
    it('should return 400 for dog with cat props', async () =>
      request(app)
        .post(`${app.basePath}/discriminator_implied`)
        .set('content-type', 'application/json')
        .send({
          pet_type: 'DogObject',
          hunts: true,
          age: 3,
        })
        .expect(400)
        .then((r) => {
          expect(r.body.message).to.include("required property 'bark'");
        }));

    it('should return 400 a bad discriminator', async () =>
      request(app)
        .post(`${app.basePath}/discriminator_implied`)
        .set('content-type', 'application/json')
        .send({
          pet_type: 'dog',
          bark: true,
          breed: 'Dingo',
        })
        .expect(400)
        .then((r) => {
          expect(r.body.message).to.include(
            'one of the allowed values: CatObject, DogObject',
          );
        }));
  });

  describe('/pets', () => {
    it('should return 400 a bad discriminator', async () =>
      request(app)
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
          expect(e.message).to.include(
            'one of the allowed values: cat, kitty, dog, puppy',
          );
        }));

    it('should return 200 for dog', async () =>
      request(app)
        .post(`${app.basePath}/pets`)
        .set('content-type', 'application/json')
        .send({
          pet_type: 'dog',
          bark: true,
          breed: 'Dingo',
        })
        .expect(200));

    it('should return 200 for puppy', async () =>
      request(app)
        .post(`${app.basePath}/pets`)
        .set('content-type', 'application/json')
        .send({
          pet_type: 'puppy',
          bark: true,
          breed: 'Dingo',
        })
        .expect(200));

    it('should return 200 for cat', async () =>
      request(app)
        .post(`${app.basePath}/pets`)
        .set('content-type', 'application/json')
        .send({
          pet_type: 'cat',
          hunts: true,
          age: 1,
        })
        .expect(200));

    it('should return 200 for kitty', async () =>
      request(app)
        .post(`${app.basePath}/pets`)
        .set('content-type', 'application/json')
        .send({
          pet_type: 'kitty',
          hunts: true,
          age: 1,
        })
        .expect(200));
  });

  describe('/pets_all', () => {
    it('should return 400 a bad discriminator', async () =>
      request(app)
        .post(`${app.basePath}/pets_all`)
        .set('content-type', 'application/json')
        .send({
          pet_type: 'dog',
          bark: true,
          breed: 'Dingo',
        })
        .expect(400)
        .then((r) => {
          const e = r.body;
          expect(e.message).to.include(
            'to one of the allowed values: Cat, Dog',
          );
        }));

    it('should return 200 for Dog', async () =>
      request(app)
        .post(`${app.basePath}/pets_all`)
        .set('content-type', 'application/json')
        .send({
          pet_type: 'Dog',
          bark: true,
          breed: 'Dingo',
        })
        .expect(200));

    it('should return 200 for Cat', async () =>
      request(app)
        .post(`${app.basePath}/pets_all`)
        .set('content-type', 'application/json')
        .send({
          pet_type: 'Cat',
          hunts: true,
          age: 3,
        })
        .expect(200));
  });
});
