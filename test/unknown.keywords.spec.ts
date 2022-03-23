import * as path from 'path';
import * as request from 'supertest';
import { createApp } from './common/app';

describe('Unknown x- keywords', () => {
  let app = null;

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

  after(() => app.server.close());

  it('should return 200 for valid request with unknown x- keywords', async () =>
    request(app)
      .post(`${app.basePath}/persons`)
      .send({
        id: 10,
        name: 'jacob',
      })
      .expect(200));
});
