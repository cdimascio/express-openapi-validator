import * as path from 'path';
import * as request from 'supertest';
import { expect } from 'chai';
import { createApp } from './common/app';

describe('request body validation with and without allErrors', () => {
  let allErrorsApp;
  let notAllErrorsApp;

  const defineRoutes = (app) => {
    app.post(`${app.basePath}/persons`, (req, res) => {
      res.send({ success: true });
    });
    app.get(`${app.basePath}/persons`, (req, res) => {
      res.send({ bname: req.query.bname });
    });
  };

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'multiple-validations.yaml');

    allErrorsApp = await createApp(
      {
        apiSpec,
        formats: {
          'starts-with-b': (v) => /^b/i.test(v),
        },
        validateRequests: {
          allErrors: true,
        },
        validateResponses: {
          allErrors: true,
        },
      },
      3005,
      defineRoutes,
      true,
    );

    notAllErrorsApp = await createApp(
      {
        apiSpec,
        formats: {
          'starts-with-b': (v) => /^b/i.test(v),
        },
        validateResponses: true,
      },
      3006,
      defineRoutes,
      true,
    );
  });

  after(() => {
    allErrorsApp.server.close();
    notAllErrorsApp.server.close();
  });

  it('should return 200 if short b-name is posted', async () =>
    request(allErrorsApp)
      .post(`${allErrorsApp.basePath}/persons`)
      .set('content-type', 'application/json')
      .send({ bname: 'Bob' })
      .expect(200));

  it('should return 200 if short b-name is fetched', async () =>
    request(allErrorsApp)
      .get(`${allErrorsApp.basePath}/persons?bname=Bob`)
      .expect(200));

  it('should include all request validation errors when allErrors=true', async () =>
    request(allErrorsApp)
      .post(`${allErrorsApp.basePath}/persons`)
      .set('content-type', 'application/json')
      .send({ bname: 'Maximillian' })
      .expect(400)
      .then((res) => {
        expect(res.body.errors).to.have.lengthOf(2);
      }));

  it('should include only first request validation error when allErrors=false', async () =>
    request(notAllErrorsApp)
      .post(`${notAllErrorsApp.basePath}/persons`)
      .set('content-type', 'application/json')
      .send({ bname: 'Maximillian' })
      .expect(400)
      .then((res) => {
        expect(res.body.errors).to.have.lengthOf(1);
      }));

  it('should include all response validation errors when allErrors=true', async () =>
    request(allErrorsApp)
      .get(`${allErrorsApp.basePath}/persons?bname=Maximillian`)
      .expect(500)
      .then((res) => {
        expect(res.body.errors).to.have.lengthOf(2);
      }));

  it('should include only first response validation error when allErrors=false', async () =>
    request(notAllErrorsApp)
      .get(`${notAllErrorsApp.basePath}/persons?bname=Maximillian`)
      .expect(500)
      .then((res) => {
        expect(res.body.errors).to.have.lengthOf(1);
      }));
});
