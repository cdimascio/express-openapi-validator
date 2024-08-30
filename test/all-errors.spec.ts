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
  };

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'multiple-validations.yaml');

    allErrorsApp = await createApp(
      {
        apiSpec,
        formats: { 'starts-with-b': (v) => /^b/i.test(v) },
        // allErrors is set to true when undefined
      },
      3005,
      defineRoutes,
      true,
    );

    notAllErrorsApp = await createApp(
      {
        apiSpec,
        formats: { 'starts-with-b': (v) => /^b/i.test(v) },
        allErrors: false,
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

  it('should return 200 if short b-name is provided', async () =>
    request(allErrorsApp)
      .post(`${allErrorsApp.basePath}/persons`)
      .set('content-type', 'application/json')
      .send({ bname: 'Bob' })
      .expect(200));

  it('should include all validation errors when allErrors=true', async () =>
    request(allErrorsApp)
      .post(`${allErrorsApp.basePath}/persons`)
      .set('content-type', 'application/json')
      .send({ bname: 'Maximillian' })
      .expect(400)
      .then((res) => {
        expect(res.body.errors.length).to.equal(2);
      }));

  it('should include only first validation error when allErrors=false', async () =>
    request(notAllErrorsApp)
      .post(`${notAllErrorsApp.basePath}/persons`)
      .set('content-type', 'application/json')
      .send({ bname: 'Maximillian' })
      .expect(400)
      .then((res) => {
        expect(res.body.errors.length).to.equal(1);
      }));
});
