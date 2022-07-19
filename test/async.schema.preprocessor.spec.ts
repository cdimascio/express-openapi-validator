import * as path from 'path';
import * as fs from 'fs';

import { expect } from 'chai';
import {safeLoad} from 'js-yaml';

import {
  OpenAPIV3,
} from '../src/framework/types';
import {
  SchemaPreprocessor
} from '../src/middlewares/parsers/schema.preprocessor';
import {
  OpenApiValidator
} from '../src/openapi.validator';

describe('async.utils', () => {
  const apiSpecPath = path.join('test', 'resources', 'async-serdes.yaml');
  const specContent = fs.readFileSync(apiSpecPath);
  const initalApiDocument = safeLoad(specContent);

  class ObjectID {
    id: string;

    constructor(id: string = "5fdefd13a6640bb5fb5fa925") {
      this.id = id;
    }

    toString() {
      return this.id;
    }
  }

  it('should mark appropriate schemas as $async, even in hidden discriminator validators', async () => {
    const openApiValidator = new OpenApiValidator({
      apiSpec: apiSpecPath,
      validateRequests: {
        coerceTypes: true,
        passContext: true
      },
      validateResponses: {
        coerceTypes: true,
        passContext: true
      },
      validateFormats: "full",
      unknownFormats: ['string-list'],
      serDes: [
        {
          format: "user-id",
          async: true,
          deserialize: async () => { return 'foo'; }, // no-op for this test
          serialize: function (o) { return 'bar'; } // no-op for this test
        }
      ]
    });

    const preprocessor = new SchemaPreprocessor(
      initalApiDocument,
      openApiValidator.ajvOpts.request,
      false
    );

    const { apiDoc, apiDocRes } = preprocessor.preProcess();
    if (apiDoc.components === undefined ||
        apiDoc.paths === undefined ||
        apiDoc.paths['/users'] === undefined) {
      throw new Error('Definitely should have components');
    }

    const usersPath = apiDoc.paths['/users'] as OpenAPIV3.PathItemObject;
    const userPath = apiDoc.paths['/users/{id}'] as OpenAPIV3.PathItemObject;

    // Make sure all the root schemas in apiDoc have $async
    expect(apiDoc?.components?.schemas?.UserId).to.have.property('$async');
    expect(apiDoc?.components?.schemas?.User).to.have.property('$async');
    expect(apiDoc?.components?.schemas?.UserPlus).to.have.property('$async');
    expect(apiDoc?.components?.schemas?.UserPlusPlus).to.have.property('$async');
    expect(apiDoc?.components?.schemas?.UserOneOf).to.have.property('$async');


    type ExpectedSchema = {
      $async: true;
      _discriminator: {
        validators: {
          PLUS: {
            $async
          },
          PLUSPLUS: {
            $async
          }
        }
      }
    }

    // Make sure the uber secret discriminator validators have $async
    const postBody = usersPath?.post?.requestBody as OpenAPIV3.RequestBodyObject;
    const postBodyContentSchema = postBody.content['application/json'].schema as unknown as ExpectedSchema;
    expect(postBodyContentSchema).to.have.property('$async');
    expect(postBodyContentSchema._discriminator.validators.PLUS).to.have.property('$async');
    expect(postBodyContentSchema._discriminator.validators.PLUSPLUS).to.have.property('$async');

    const postResponseMediaType = usersPath?.post?.responses && usersPath?.post?.responses['200'] as OpenAPIV3.ResponseObject;
    const postResponseSchema = postResponseMediaType?.content && postResponseMediaType?.content['application/json'].schema as unknown as ExpectedSchema;
    expect(postResponseSchema).to.have.property('$async');
    expect(postResponseSchema && postResponseSchema._discriminator.validators.PLUS).to.have.property('$async');
    expect(postResponseSchema && postResponseSchema._discriminator.validators.PLUSPLUS).to.have.property('$async');

    const getResponseMediaType = userPath?.get?.responses && userPath?.get?.responses['200'] as unknown as OpenAPIV3.ResponseObject;
    const getResponseSchema = getResponseMediaType?.content && getResponseMediaType?.content['application/json'].schema as unknown as ExpectedSchema;
    expect(getResponseSchema).to.have.property('$async');
    expect(getResponseSchema && getResponseSchema._discriminator.validators.PLUS).to.have.property('$async');
    expect(getResponseSchema && getResponseSchema._discriminator.validators.PLUSPLUS).to.have.property('$async');
  });
});