import path from 'path';
import request from 'supertest';
import { ExpressWithServer, createApp } from './common/app';

describe('Unknown x- keywords', () => {
  let app: ExpressWithServer;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'unknown.keywords.yaml');
    app = await createApp(
      {
        apiSpec,
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

  it('should return 200 for valid request with unknown x- keywords', async () =>
    request(app)
      .post(`${app.basePath}/persons`)
      .send({
        id: 10,
        name: 'jacob',
      })
      .expect(200));
});
