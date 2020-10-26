import * as path from 'path';
import * as fs from 'fs';
import * as cloneDeep from 'lodash.clonedeep';
import * as jsyaml from 'js-yaml';
import { expect } from 'chai';
import { ResponseValidator } from '../src/middlewares/openapi.response.validator';
import * as packageJson from '../package.json';
import { OpenAPIV3, OpenApiRequest } from '../src/framework/types';

const apiSpecPath = path.join('test', 'resources', 'response.validation.yaml');
const apiSpec = jsyaml.safeLoad(fs.readFileSync(apiSpecPath, 'utf8'));
const fakeReq: OpenApiRequest = <any>{
  method: 'GET',
  headers: { 'content-type': 'application/json' },
  openapi: { expressRoute: '/api/test' },
};
describe(packageJson.name, () => {
  it('should validate the using default (in this case the error object)', async () => {
    const v = new ResponseValidator(cloneDeep(apiSpec));
    const responses = petsResponseSchema();
    const validators = v._getOrBuildValidator(fakeReq, responses);

    try {
      expect(
        v._validate({
          validators,
          body: { message: 'some error message', code: 400 },
          statusCode: 400,
          path: '/some-path',
          accepts: [],
        }),
      ).to.not.exist;
    } catch (e) {
      expect(e).to.not.exist;
    }
  });

  it('should throw error when default response is invalid', async () => {
    const v = new ResponseValidator(apiSpec);
    const responses = petsResponseSchema();
    const validators = v._getOrBuildValidator(fakeReq, responses);

    try {
      const message = { note: 'bad message type' };
      const code = 400;
      expect(
        v._validate({
          validators,
          body: { message, code },
          statusCode: code,
          path: '/some-path',
          accepts: [],
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
    const validators = v._getOrBuildValidator(fakeReq, responses);

    try {
      v._validate({
        validators,
        body: [{ id: 'bad-id', name: 'test', tag: 'tag' }],
        statusCode: 200,
        path: '/some-path',
        accepts: [],
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
        path: '/some-path',
        accepts: [],
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
        path: '/some-path',
        accepts: [],
      });
    } catch (e) {
      expect(e).to.be.not.null;
      expect(e.message).to.contain('should be string');
    }
  });
});
function petsResponseSchema(): OpenAPIV3.ResponsesObject {
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
