const expect = require('chai').expect;
import * as request from 'supertest';
import app, { server } from './app.with.transform';
import { server as server2 } from './app';

describe('custom error transform', () => {
  after(done => {
    console.log('done', app);
    server.close();
    server2.close();
    done();
  });

  it('should transform the error output', async () => {
    const id = 'my_id';
    return request(app)
      .get(`/v1/pets/${id}`)
      .expect(400)
      .then(r => {
        const e = r.body;
        expect(e.code).equals(400);
        expect(e.message).equals('should be integer');
      });
  });
});
