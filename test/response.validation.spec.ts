import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';
import * as jsyaml from 'js-yaml';
import { expect } from 'chai';
import * as request from 'supertest';
import { ResponseValidator } from '../src/middlewares/openapi.response.validator';
import { createApp } from './common/app';

const packageJson = require('../package.json');
const apiSpecPath = path.join('test', 'resources', 'response.validation.yaml');
const apiSpec = jsyaml.safeLoad(fs.readFileSync(apiSpecPath, 'utf8'));

describe(packageJson.name, () => {
  let app = null;
  let basePath = null;

  before(async () => {
    // Set up the express app
    app = await createApp({ apiSpec, coerceTypes: false }, 3005, false);
    basePath = app.basePath;
    app.use(
      `${basePath}`,
      express.Router().get(`/pets/rejectadditionalProps`, (req, res) =>
        res.json([
          {
            id: 1,
            type: 'test',
            tag: 'woah',
          },
        ]),
      ),
    );
  });

  after(() => {
    app.server.close();
  });

  it('should fail if response does not match', async () =>
    request(app)
      .get(`${basePath}/rejectadditionalProps`)
      .expect(500)
      .then((r: any) => {
        expect(r.body.error).to.be.not.null;
      }));

  it.only('should if additional properties are provided when set false', async () => {
    const v = new ResponseValidator(apiSpec);
    const responses = {
      '200': {
        description: 'pet response',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Pet',
              },
            },
          },
        },
      },
      default: {
        description: 'unexpected error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
    };

    const statusCode = 200;
    const body = [
      {
        id: 10,
        name: 'test',
        tag: 'tag',
        additionalProp: 'test',
      },
    ];
    try {
      v._validate({ body, responses, statusCode });
    } catch (e) {
      // TODO include params.additionalProperty: value in error message
      // TODO maybe params should be in the response
      expect(e.message).to.contain('should NOT have additional properties');
      expect(e.status).to.equal(500);
      expect(e.errors[0].message).to.contain(
        'should NOT have additional properties',
      );
    }
  });
});

function schemaFromResponseDef(d) {}
