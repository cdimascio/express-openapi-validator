const expect = require('chai').expect;
import * as request from 'supertest';
import app from './app.with.transform';

describe('custom error transform', () => {
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
