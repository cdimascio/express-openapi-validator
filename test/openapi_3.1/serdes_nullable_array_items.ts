import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from '../common/app';

import { date, dateTime } from '../../src/framework/base.serdes';
import { AppWithServer } from '../common/app.common';


describe('Serdes with OpenAPI 3.1 array type specifier', () => {
  let app: AppWithServer;
  const isoDate = '2026-04-06T23:07:24.515Z';
  const apiSpecPath = path.join(
    'test',
    'openapi_3.1',
    'resources',
    'serdes_nullable_array_items.yaml'
  );

  before(async () => {
    app = await createApp(
      {
        apiSpec: apiSpecPath,
        validateRequests: true,
        validateResponses: true,
        serDes: [date, dateTime],
      },
      3005,
      (app) => {
        app.get([`${app.basePath}/nullable_dates`], (req, res) => {
          res.json([{ createdAt: null }, { createdAt: new Date(isoDate) }]);
        });
      },
      false,
    );
    return app;
  });

  after(() => {
    app.server.close();
  });
  it('should serialize an unserialized Date and allow null for a nullable date-time item', async () =>
    request(app)
      .get(`${app.basePath}/nullable_dates`)
      .expect(200)
      .then((r) => {
        expect(r.body[1].createdAt).to.equal(isoDate);
        expect(r.body[0].createdAt).to.equal(null);
      }));
});
