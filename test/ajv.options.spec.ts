import { expect } from 'chai';
import { AjvOptions } from '../src/framework/ajv/options';

describe('AjvOptions', () => {
  // hard code base options
  // These are normalized when express-openapi-validator parses options, however
  // this test bypasses that, thus we manually set them to expected values
  const baseOptions = {
    apiSpec: './spec',
    validateApiSpec: false,
    validateRequests: true,
    validateResponses: {
      coerceTypes: false,
    },
    serDes: [],
    formats: [],
  };

  it('should not validate schema for requests since schema is validated on startup', async () => {
    const ajv = new AjvOptions(baseOptions);
    const options = ajv.request;
    expect(options.validateSchema).to.be.false;
  });

  it('should not validate schema for response since schema is validated on startup', async () => {
    const ajv = new AjvOptions(baseOptions);
    const options = ajv.response;
    expect(options.validateSchema).to.be.false;
  });

  it('should not validate schema for preprocessor since schema is validated on startup', async () => {
    const ajv = new AjvOptions(baseOptions);
    const options = ajv.preprocessor;
    expect(options.validateSchema).to.be.false;
  });

  it('should not validate schema for multipar since schema is validated on startup', async () => {
    const ajv = new AjvOptions(baseOptions);
    const options = ajv.multipart;
    expect(options.validateSchema).to.be.false;
  });
});
