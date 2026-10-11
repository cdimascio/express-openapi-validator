import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import AjvDraft4 from 'ajv-draft-04';
import { createApp } from './common/app';
import { AppWithServer } from './common/app.common';

describe('ajvFactory', () => {
  let app: AppWithServer;
  const calls: { version: string; options: any }[] = [];

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'datetime.validation.yaml');
    app = await createApp(
      {
        apiSpec,
        validateResponses: true,
        ajvFactory: (version, options) => {
          calls.push({ version, options });
          return new AjvDraft4(options);
        },
      },
      3005,
      (app) => {
        app.post(`${app.basePath}/date-time-validation`, (req, res) => {
          res.json(req.body);
        });
        app.use((err, req, res, next) => {
          res.status(err.status ?? 500).json({ message: err.message });
        });
      },
      false,
    );
  });

  after(() => {
    app.server.close();
  });

  it('should validate the request with the instance from ajvFactory', async () =>
    request(app)
      .post(`${app.basePath}/date-time-validation`)
      .send({ testDateTimeProperty: 'not a date' })
      .expect(400));

  it('should accept a valid request with the instance from ajvFactory', async () =>
    request(app)
      .post(`${app.basePath}/date-time-validation`)
      .send({ testDateTimeProperty: '2020-12-20T07:28:19.213Z' })
      .expect(200));

  it('should call ajvFactory with the spec version and the options', async () => {
    expect(calls.length).to.be.greaterThan(0);
    for (const call of calls) {
      expect(call.version).to.equal('3.0.2');
      expect(call.options).to.be.an('object');
    }
  });
});
