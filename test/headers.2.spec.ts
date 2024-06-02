import path from 'path';
import { expect } from 'chai';
import request from 'supertest';
import { ExpressWithServer, createApp } from './common/app';
import { EovErrorHandler } from './common/app.common';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app: ExpressWithServer;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'headers.yaml');
    app = await createApp(
      { apiSpec },
      3005,
      (app) => {
        app.use(`${app.basePath}/headers_1`, (req, res) => {
          res.send('headers_1');
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
  });

  after(async () => {
    await app.closeServer();
  });

  it('should return 400 missing required header', async () => {
    return request(app)
      .get(`${app.basePath}/headers_1`)
      .expect(400)
      .then((r) => {
        const e = r.body;
        expect(e.message).to.contain(
          'request/headers must have required property ',
        );
      });
  });

  it('should return 400 invalid required header', async () => {
    let longString = '';
    for (let i = 0; i < 300; i++) {
      longString += 'a';
    }
    return request(app)
      .get(`${app.basePath}/headers_1`)
      .set('x-userid', longString)
      .expect(400)
      .then((r) => {
        const e = r.body;
        expect(e.message).to.contain('must NOT have more than 255 characters');
      });
  });

  it('should return 200 for valid headers', async () => {
    return request(app)
      .get(`${app.basePath}/headers_1`)
      .set('x-userid', 'some-id')
      .expect(200);
  });
});
