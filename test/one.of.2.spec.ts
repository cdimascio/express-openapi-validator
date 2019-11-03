import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

const packageJson = require('../package.json');

describe(packageJson.name, () => {
  let app = null;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'one.of.2.yaml');
    app = await createApp(
      { apiSpec },
      3005,
      app => {
        app.post(`${app.basePath}/typethrees`, (req, res) => {
          res.status(201).json(req.body);
        });
        app.use((err, req, res, next) => {
          res.status(err.status || 500).json({
            message: err.message,
            code: err.status || 500,
          });
        });
      },
      false,
    );
  });

  after(() => {
    app.server.close();
  });
  it('should POST TypeOne', async () => {
    return request(app)
      .post(`${app.basePath}/typethrees`)
      .send({
        whatever: 'Whatever One',
        somethings: [
          {
            type: 'TypeOne',
            uniqueOne: 'Unique One',
          },
        ],
      })
      .expect(201)
      .expect('Content-Type', /json/)
      .then(data => {
        expect(data).to.not.be.an('undefined');
        expect(data.body).to.not.be.an('undefined');
        expect(data.body.whatever).to.not.be.an('undefined');
        expect(data.body.whatever).to.equal('Whatever One');
        expect(data.body.somethings).to.not.be.an('undefined');
        expect(data.body.somethings[0].type).to.equal('TypeOne');
        expect(data.body.somethings[0].uniqueOne).to.equal('Unique One');
      });
  });

  it('should POST TypeTwo', async () => {
    return request(app)
      .post(`${app.basePath}/typethrees`)
      .send({
        whatever: 'Whatever Two',
        somethings: [
          {
            type: 'TypeTwo',
            uniqueTwo: 'Unique Two',
          },
        ],
      })
      .expect(201)
      .expect('Content-Type', /json/)
      .then(data => {
        expect(data).to.not.be.an('undefined');
        expect(data.body).to.not.be.an('undefined');
        expect(data.body.whatever).to.not.be.an('undefined');
        expect(data.body.whatever).to.equal('Whatever Two');
        expect(data.body.somethings).to.not.be.an('undefined');
        expect(data.body.somethings[0].type).to.equal('TypeTwo');
        expect(data.body.somethings[0].uniqueTwo).to.equal('Unique Two');
      });
  });
});
