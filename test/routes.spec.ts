const expect = require('chai').expect;
import * as request from 'supertest';
import app, { server } from './app';
const { OpenApiMiddleware } = require('../');
const packageJson = require('../package.json');

describe(packageJson.name, () => {
  after(done => {
    console.log('done', app);
    server.close();
    done();
  });
  it(`should test something`, () => {
    expect('a').to.equal('a');
  });

  it('should throw 400 on missing required query parameter', async () =>
    request(app)
      .get('/v1/pets')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400)
      .then(r => {
        const e = r.body;
        expect(e).to.have.length(2);
        expect(e[0].path).to.equal('limit');
        expect(e[1].path).to.equal('test');
      }));

  it('should respond with json on proper get call', async () =>
    request(app)
      .get('/v1/pets')
      .query({
        test: 'one',
        limit: 10
      })
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200));

  it('should return 200 with unknown query parameter', async () =>
    request(app)
      .get('/v1/pets')
      .query({
        test: 'one',
        limit: 10,
        bad_param: 'test'
      })
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200));

  it('should return 400 when improper range specified', async () =>
    request(app)
      .get('/v1/pets')
      .query({
        test: 'one',
        limit: 2
      })
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400)
      .then(r => {
        const e = r.body;
        expect(e).to.have.length(1);
        expect(e[0].path).to.equal('limit');
        expect(e[0].message).to.equal('should be >= 5');
      }));
});
