import path from 'path';
import request from 'supertest';
import { ExpressWithServer, createApp } from './common/app';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  let app: ExpressWithServer;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'unknown.formats.yaml');
    app = await createApp(
      {
        apiSpec,
        unknownFormats: ['hypertext'],
      },
      3005,
      (app) => {
        app.post(`${app.basePath}/persons`, (req, res) =>
          res.json({
            ...req.body,
          }),
        );
      },
      true,
    );
  });

  after(async () => {
    await app.closeServer();
  });

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
