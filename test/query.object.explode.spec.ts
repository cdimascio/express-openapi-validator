import { expect } from 'chai';
import * as path from 'path';
import * as request from 'supertest';
import { createApp } from './common/app';
import { AppWithServer } from './common/app.common';

describe('query object with explode:false', () => {
  let app: AppWithServer;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'query.object.explode.yaml');
    app = await createApp(
      {
        apiSpec,
        validateRequests: true,
        validateResponses: false,
      },
      3005,
      (app) => {
        app.get(`${app.basePath}/users`, (req, res) => {
          res.json(req.query);
        });
      },
    );
  });

  after(() => {
    app.server.close();
  });

  it('should correctly parse query parameter with style:form and explode:false', async () => {
    return request(app)
      .get(`${app.basePath}/users`)
      .query('id=role,admin,firstName,Alex')
      .expect(200)
      .then((r) => {
        console.log(r.body);
        expect(r.body.id).to.deep.equal({
          role: 'admin',
          firstName: 'Alex',
        });
      });
  });

  it('should correctly parse query parameter with style:form and explode:false using url encoded values', async () => {
    return request(app)
      .get(
        `${app.basePath}/users?id=%7B%22role%22%3A%22admin%22%2C%22firstName%22%3A%22Alex%22%7D`,
      )
      .expect(200)
      .then((r) => {
        console.log(r.body);
        expect(r.body.id).to.deep.equal({
          role: 'admin',
          firstName: 'Alex',
        });
      });
  });
});
