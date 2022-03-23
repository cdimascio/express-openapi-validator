import { expect } from 'chai';
import * as path from 'path';
import * as request from 'supertest';
import { createApp } from './common/app';

describe('Reserved x-eov- keywords', () => {
  let app = null;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'reserved.keywords.yaml');
    app = await createApp(
      { apiSpec },
      3005,
      () => (router) =>
        router.use((err, req, res, next) => {
          res.status(500).json({ message: err.message });
        }),
    );
  });

  after(() => app.server.close());

  it('Should throw error when schema includes reserved keywords', async () =>
    request(app)
      .post(`${app.basePath}/persons`)
      .send({
        id: 10,
        name: 'jacob',
      })
      .expect(500)
      .then((r) => {
        expect(r.body)
          .to.have.property('message')
          .that.equals(
            'Use of keyword(s) "x-eov-not-supported", "x-eov-keyword", "x-eov-custom-keyword" are forbidden (reserved prefix x-eov-)',
          );
      }));
});
