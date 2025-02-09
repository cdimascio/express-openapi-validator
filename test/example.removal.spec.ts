import { expect } from 'chai';
import * as cloneDeep from 'lodash.clonedeep';
import * as path from 'path';
import { AjvOptions } from '../src/framework/ajv/options';
import { OpenApiSpecLoader } from '../src/framework/openapi.spec.loader';
import { NormalizedOpenApiValidatorOpts, OpenAPIV3 } from '../src/framework/types';
import { SchemaPreprocessor } from '../src/middlewares/parsers/schema.preprocessor';

describe('SchemaPreprocessor example removal', () => {
  let originalApiDoc: any;
  let ajvOptions: AjvOptions;


  before(async () => {
    const apiSpecPath = path.join('test', 'resources', 'openapi.yaml');
    const options: NormalizedOpenApiValidatorOpts = {
      apiSpec: apiSpecPath,
      validateApiSpec: true,
      validateResponses: false,
      validateRequests: {},
      validateSecurity: false,
      fileUploader: true,
      $refParser: {
        mode: 'bundle',
      },
      operationHandlers: false,
      formats: {},
      validateFormats: true,
      // unknownFormats?: never;
      serDes: [],
    };
    // const oav = new OpenApiValidator(options);
    const spec = await new OpenApiSpecLoader({
      apiDoc: cloneDeep(options.apiSpec),
      validateApiSpec: options.validateApiSpec,
      $refParser: options.$refParser,
    }).load();

    ajvOptions = new AjvOptions(options);
    originalApiDoc = spec.apiDoc
  });

  it('should remove example properties from the GET /pets API request document', () => {
    // Create preprocessor instance
    const preprocessor = new SchemaPreprocessor(
      originalApiDoc,
      ajvOptions.preprocessor,
      ajvOptions.response,
    );

    // Run the preProcess method
    const result = preprocessor.preProcess();

    // Check that examples were removed from parameters
    const paths = result.apiDoc.paths;
    const petsParams = paths?.['/pets']?.get
      ?.parameters as OpenAPIV3.ParameterObject[];
    const limitParam = petsParams.find(
      (p) => (p as OpenAPIV3.ParameterObject).name === 'limit',
    )!;
    expect(limitParam.schema).to.not.have.property('example');
    expect(limitParam).to.not.have.property('example');

    // TODO: Check that examples were removed from request body content
    // TODO: Fails because JSON query parameter example removal is not yet supported
    // const testJsonParam = petsParams.find((p) => p.name === 'testJson');
    // expect(testJsonParam?.content!['application/json']).to.not.have.property(
    //   'example',
    // );

    // Check that examples were removed from response content
    const petsResponse = paths?.['/pets']?.get?.responses?.[
      '200'
    ]! as OpenAPIV3.ResponseObject;
    expect(petsResponse.content!['application/json']).to.not.have.property(
      'example',
    );
    expect(
      petsResponse.content!['application/json'].schema,
    ).to.not.have.property('example');
  });


  it('should remove example properties from the GET /pets API response document', () => {
    // Create preprocessor instance
    const preprocessor = new SchemaPreprocessor(
      originalApiDoc,
      ajvOptions.preprocessor,
      ajvOptions.response,
    );

    // Run the preProcess method
    const result = preprocessor.preProcess();

    const petsGet = result.apiDoc.paths!['/pets'].get!;
    const petsGetRes = petsGet?.responses!
    const entries = Object.entries(petsGetRes);
    entries.forEach(([key, value]) => {
      const contentMediaTypes = (value! as OpenAPIV3.ResponseObject).content!;
      const content = contentMediaTypes['application/json'];
      expect(content).to.not.have.property('example');
      expect(content.schema).to.not.have.property('example');
    });
  });

  it('should remove example properties components:', () => {
    const preprocessor = new SchemaPreprocessor(
      originalApiDoc,
      ajvOptions.preprocessor,
      ajvOptions.response,
    );

    const result = preprocessor.preProcess();

    const components = result.apiDoc.components
    expect(components).to.not.have.property('examples');
  });
});
