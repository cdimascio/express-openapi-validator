import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';

const apiSpecPath = path.join('test', 'resources', '576', 'index.yaml');

describe('response validation for multiple responses', () => {
  let app = null;

  before(async () => {
    // set up express app
    app = await createApp(
      {
        apiSpec: apiSpecPath,
        validateResponses: true,
        $refParser: {
          mode: 'dereference',
        },
      },
      3005,
      (app) => {
        app.get(`${app.basePath}/clusters`, (req, res) => {
          return res.status(200).json({ data: 'bad' });
        });
      },
    );
  });

  after(() => {
    app.server.close();
  });

  it('should validate bad response', async () =>
    request(app)
      .get(`${app.basePath}/clusters`)
      .expect(500)
      .then((r) => {
        expect(r.body.message).to.include('.response should be array');
      }));
});
