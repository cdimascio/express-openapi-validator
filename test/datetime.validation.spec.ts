import path from 'path';
import { expect } from 'chai';
import request from 'supertest';
import { ExpressWithServer, createApp } from './common/app';

describe('datetime.validation', () => {
  let app: ExpressWithServer;

  function setupServer(
    validateFormats?: false | 'full' | 'fast',
  ): Promise<ExpressWithServer> {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'datetime.validation.yaml');
    return createApp(
      {
        apiSpec,
        validateResponses: true,
        validateFormats,
      },
      3005,
      (app) => {
        // Define new coercion routes
        app.post(`${app.basePath}/date-time-validation`, (req, res) => {
          res.json(req.body);
        });
      },
      true,
    );
  }

  afterEach(async () => {
    await app.closeServer();
  });

  it('should return 200 if testDateTimeProperty is provided with invalid, but correctly formatted date time and default validation is enabled (past compatibility)', async () => {
    app = await setupServer();
    await request(app)
      .post(`${app.basePath}/date-time-validation`)
      .send({
        testDateTimeProperty: '2000-13-03T12:13:14Z',
      })
      .expect(200)
      .then((r) => {
        const { body } = r;
        expect(body).to.have.property('testDateTimeProperty');
      });
  });

  it('should return 400 if testDateTimeProperty is provided with incorrectly formatted date time and default validation enabled (past compatibility)', async () => {
    app = await setupServer();
    await request(app)
      .post(`${app.basePath}/date-time-validation`)
      .send({
        testDateTimeProperty: 'wrong',
      })
      .expect(400);
  });

  it('should return 200 if testDateTimeProperty is provided with incorrectly formatted date time and format validation disabled', async () => {
    app = await setupServer(false);
    await request(app)
      .post(`${app.basePath}/date-time-validation`)
      .send({
        testDateTimeProperty: 'blah-blah',
      })
      .expect(200)
      .then((r) => {
        const { body } = r;
        expect(body).to.have.property('testDateTimeProperty');
      });
  });

  it('should return 200 if testDateTimeProperty is provided with valid date time and full validation enabled', async () => {
    app = await setupServer('full');
    await request(app)
      .post(`${app.basePath}/date-time-validation`)
      .send({
        testDateTimeProperty: '2000-02-03T12:13:14Z',
      })
      .expect(200)
      .then((r) => {
        const { body } = r;
        expect(body).to.have.property('testDateTimeProperty');
      });
  });

  it('should return 400 if testDateTimeProperty is provided with invalid date time and full validation enabled', async () => {
    app = await setupServer('full');
    await request(app)
      .post(`${app.basePath}/date-time-validation`)
      .send({
        testDateTimeProperty: '2000-13-03T12:13:14Z',
      })
      .expect(400);
  });
});
