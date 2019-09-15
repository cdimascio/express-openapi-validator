import * as path from 'path';
import * as fs from 'fs';
import * as jsyaml from 'js-yaml';
import { expect } from 'chai';
import { ResponseValidator } from '../src/middlewares/openapi.response.validator';

const packageJson = require('../package.json');
const apiSpecPath = path.join('test', 'resources', 'response.validation.yaml');
const apiSpec = jsyaml.safeLoad(fs.readFileSync(apiSpecPath, 'utf8'));

describe(packageJson.name, () => {
  // TODO
  it.skip('should always return valid for non-JSON responses', async () => {});

  it('should validate the using default (in this case the error object)', async () => {
    const v = new ResponseValidator(apiSpec);
    const responses = petsResponseSchema();
    const validators = v._getOrBuildValidator(null, responses);

    try {
      expect(
        v._validate({
          validators,
          body: { message: 'some error message', code: 400 },
          statusCode: 400,
        }),
      ).to.not.exist;
    } catch (e) {
      expect(e).to.not.exist;
    }
  });

  it('should throw error when default response is invalid', async () => {
    const v = new ResponseValidator(apiSpec);
    const responses = petsResponseSchema();
    const validators = v._getOrBuildValidator(null, responses);

    try {
      const message = { note: 'bad message type' };
      const code = 400;
      expect(
        v._validate({
          validators,
          body: { message, code },
          statusCode: code,
        }),
      ).to.not.exist;
    } catch (e) {
      expect(e.status).to.equal(500);
      expect(e.errors).to.be.an('array');
      expect(e.errors[0].message).to.equal('should be string');
    }
  });

  it('should return an error if field type is invalid', async () => {
    const v = new ResponseValidator(apiSpec);
    const responses = petsResponseSchema();
    const validators = v._getOrBuildValidator(null, responses);

    try {
      v._validate({
        validators,
        body: [{ id: 'bad-id', name: 'test', tag: 'tag' }],
        statusCode: 200,
      });
    } catch (e) {
      expect(e).to.be.not.null;
      expect(e.message).to.contain('should be integer');
      expect(e.message).to.not.contain('additional properties');
    }

    try {
      v._validate({
        validators,
        body: { id: 1, name: 'test', tag: 'tag' },
        statusCode: 200,
      });
    } catch (e) {
      expect(e).to.be.not.null;
      expect(e.message).to.contain('should be array');
    }

    try {
      v._validate({
        validators,
        body: [{ id: 1, name: [], tag: 'tag' }],
        statusCode: 200,
      });
    } catch (e) {
      expect(e).to.be.not.null;
      expect(e.message).to.contain('should be string');
    }
  });

  // TODO may not be possible to fix
  // https://github.com/epoberezkin/ajv/issues/837
  it.skip('should if additional properties are provided when set false', async () => {
    const v = new ResponseValidator(apiSpec);
    const responses = petsResponseSchema();
    const validators = v._getOrBuildValidator(null, responses);
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
      expect(v._validate({ validators, body, statusCode })).to.not.exist;
      expect('here').to.be.null;
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

function petsResponseSchema() {
  return {
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
    '400': {
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
}
