import * as path from 'path';
import * as express from 'express';
import * as request from 'supertest';
import * as packageJson from '../package.json';
import { expect } from 'chai';
import { createApp } from './common/app';

describe(packageJson.name, () => {
  let app = null;

  before(async () => {
    // Set up the express app
    const apiSpec = path.join('test', 'resources', 'serialized.objects.yaml');
    app = await createApp({ apiSpec }, 3005, app =>
      app.use(
        `${app.basePath}`,
        express
          .Router()
          .get(`/serialisable`, (req, res) => res.json(req.query))
          .get(`/tags`, (req, res) => res.json(req.query))
          .get(`/deep_object`, (req, res) => res.json(req.query)),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should deserialize object', async () =>
    request(app)
      .get(`${app.basePath}/serialisable`)
      .query({
        onlyValidated: true,
        timestamp: '2019-06-24T12:34:56.789Z',
        onlySelected: [1, 2, 3],
        fooBar: '{"foo":"bar"}',
      })
      .expect(200)
      .then(response => {
        expect(response.body).to.deep.equal({
          settings: {
            onlyValidated: true,
            onlySelected: [1, 2, 3],
          },
          timestamp: '2019-06-24T12:34:56.789Z',
          fooBar: {
            foo: 'bar',
          },
        });
      }));

  it('should not deserialize when non-object', async () =>
    request(app)
      .get(`${app.basePath}/serialisable`)
      .query({
        timestamp: 1234567890123,
        fooBar: 'fooBar',
      })
      .expect(200)
      .then(response => {
        expect(response.body).to.deep.equal({
          timestamp: 1234567890123,
          fooBar: 'fooBar',
        });
      }));

  it('should fail on validation, not parsing', async () =>
    request(app)
      .get(`${app.basePath}/serialisable`)
      .query({
        settings: 'this is not valid json',
      })
      .expect(400)
      .then(response => {
        expect(response.body.message).to.equal(
          'request.query.settings should be object',
        );
      }));

  // the following should probably throw an error but coerces to array (to resolve )
  it.skip('should explode query param object and return 400 if number not number[] is passed', async () =>
    request(app)
      .get(`${app.basePath}/tags`)
      .query({
        tag_ids: 1,
      })
      .expect(400)
      .then(r => {
        expect(r.body)
          .to.have.property('message')
          .that.equals('request.query.settings.tag_ids should be array');
      }));

  it('should explode query param object e.g. tag_ids, state as query params', async () =>
    request(app)
      .get(`${app.basePath}/tags`)
      .query({
        tag_ids: [1],
      })
      .expect(200)
      .then(r => {
        expect(r.body).to.have.property('settings');
        expect(r.body.settings)
          .to.have.property('tag_ids')
          .that.deep.equals([1]);
      }));

  it('should explode deepObject query params', async () =>
    request(app)
      .get(`${app.basePath}/deep_object?settings[state]=validated`)
      .expect(200)
      .then(r => {
        const expected = {
          settings: {
            state: 'validated',
          },
        };
        expect(r.body).to.deep.equals(expected);
      }));
});
