import * as path from 'path';
import * as express from 'express';
import * as request from 'supertest';
import * as assert from 'assert';
import { createApp } from './common/app';

describe("DateFormats", () => {
  let app = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'issue_589.yaml');
    app = await createApp({ apiSpec }, 1996, (app) =>
      app.use(
        `${app.basePath}`,
        express.Router().get(`/user`, (req, res) => res.json({id: 0, name: "Nick", date: new Date("1996-01-03T22:00:00.000Z")})),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should get the correct date', async () =>
    request(app)
      .get(`${app.basePath}/user`)
      .expect(200).then((res)=>
      {
        assert.strictEqual(res.body.id, 0);
        assert.strictEqual(res.body.name, "Nick"); 
        assert.strictEqual(res.body.date, "1996-01-04"); 
      })
    );
});
