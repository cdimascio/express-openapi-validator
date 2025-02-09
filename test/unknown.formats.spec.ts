import * as path from 'path';
import * as request from 'supertest';
import { createApp } from './common/app';
import * as packageJson from '../package.json';
import { AppWithServer } from './common/app.common';

describe(packageJson.name, () => {
  let app: AppWithServer;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'unknown.formats.yaml');
    app = await createApp(
      {
        apiSpec,
        unknownFormats: ['hypertext'],
      },
      3005,
      (app) => {
        app.post(`${app.basePath}/persons`, (req, res) => {
          res.json({
            ...req.body,
          });
        });
      },
      true,
    );
  });

  after(() => app.server.close());

  it('should return 200 for valid request with unknown format', async () =>
    request(app)
      .post(`${app.basePath}/persons`)
      .send({
        id: 10,
        name: 'henry',
        hypertext: '<p>hello</p>',
      })
      .expect(200));
});
