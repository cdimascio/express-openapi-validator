import 'mocha';
import path from 'path';
import { expect } from 'chai';
import request from 'supertest';
import { createApp } from '../common/app';

describe('query params', () => {
  let server = null;
  before(async () => {
    const apiSpec = path.join('test', 'query.params', 'query.params.yaml');
    server = await createApp(
      {
        apiSpec,
      },
      3003,
      (r) =>
        r.get('/v1/qp1', (ctx, next) => {
          ctx.body = {
            succes: true,
          };
        }),
    );
  });
  after(() => {
    server.close();
  });

  it('should return 400 when missing required param', async () =>
    request(server)
      .get(`/v1/qp1`)
      .expect(400)
      .then((r) => {
        expect(r.body.errors[0].message).to.include(
          'should have required property',
        );
      }));

  it('should retrn 200 when required param present', async () =>
    request(server)
      .get(`/v1/qp1`)
      .query({
        q: 'test',
      })
      .expect(200));

  it('should retrn 404 route not defined', async () =>
    request(server)
      .get(`/v1/not_found`)
      .query({
        q: 'test',
      })
      .expect(404));
});
