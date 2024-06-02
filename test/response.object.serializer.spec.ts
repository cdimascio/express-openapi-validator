import path from 'path';
import { expect } from 'chai';
import request from 'supertest';
import { ExpressWithServer, createApp } from './common/app';
import { EovErrorHandler } from './common/app.common';

const apiSpecPath = path.join(
  'test',
  'resources',
  'response.object.serializer.yaml',
);

describe('response serializer', () => {
  let app: ExpressWithServer;

  before(async () => {
    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpecPath,
        validateResponses: true,
      },
      3005,
      (app) => {
        app.get([`${app.basePath}/date-time`], (req, res) => {
          const date = new Date('2020-12-20T07:28:19.213Z');
          res.json({
            id: req.params.id,
            created_at: date,
          });
        });
        app.get([`${app.basePath}/array-of-date-times`], (req, res) => {
          let date = new Date('2020-12-20T07:28:19.213Z');
          res.json({
            users: [
              {
                id: req.params.id,
                created_at: date,
              },
            ],
          });
        });
        app.get([`${app.basePath}/date`], (req, res) => {
          const date = new Date('2020-12-20T07:28:19.213Z');
          res.json({
            id: req.params.id,
            created_at: date,
          });
        });
        app.use(<EovErrorHandler>((err, req, res, next) => {
          res.status(err.status ?? 500).json({
            message: err.message,
            code: err.status ?? 500,
          });
        }));
      },
      false,
    );
    return app;
  });

  after(async () => {
    await app.closeServer();
  });

  describe('that receive a Date object', () => {
    it('should validate and serialize date-time', async () =>
      request(app)
        .get(`${app.basePath}/date-time`)
        .expect(200)
        .then((r) => {
          expect(r.body.created_at).to.equal('2020-12-20T07:28:19.213Z');
        }));
    it('should validate and serialize date', async () =>
      request(app)
        .get(`${app.basePath}/date`)
        .expect(200)
        .then((r) => {
          expect(r.body.created_at).to.equal('2020-12-20');
        }));
    it('should validate and serialize date-time in object from array', async () =>
      request(app)
        .get(`${app.basePath}/array-of-date-times`)
        .expect(200)
        .then((r) => {
          expect(r.body.users[0].created_at).to.equal(
            '2020-12-20T07:28:19.213Z',
          );
        }));
  });
});
