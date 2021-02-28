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
      removeAdditional: true,
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

  it('should set serdes deserialize', () => {
    const ajv = new AjvOptions({
      ...baseOptions,
      serDes: [
        {
          format: 'custom-1',
          deserialize: () => 'test',
        },
      ],
    });
    const options = ajv.multipart;
    expect(options.serDesMap['custom-1']).has.property('deserialize');
    expect(options.serDesMap['custom-1']).does.not.have.property('serialize');
  });

  it('should set serdes serialize', () => {
    const ajv = new AjvOptions({
      ...baseOptions,
      serDes: [
        {
          format: 'custom-1',
          serialize: () => 'test',
        },
      ],
    });
    const options = ajv.multipart;
    expect(options.serDesMap).has.property('custom-1');
    expect(options.serDesMap['custom-1']).has.property('serialize');
    expect(options.serDesMap['custom-1']).does.not.have.property('deserialize');
  });

  it('should set serdes serialize and deserialize', () => {
    const ajv = new AjvOptions({
      ...baseOptions,
      serDes: [
        {
          format: 'custom-1',
          serialize: () => 'test',
          deserialize: (s) => {},
        },
      ],
    });
    const options = ajv.multipart;
    expect(options.serDesMap).has.property('custom-1');
    expect(options.serDesMap['custom-1']).has.property('serialize');
    expect(options.serDesMap['custom-1']).has.property('deserialize');
  });

  it('should set serdes serialize and deserialize separately', () => {
    const ajv = new AjvOptions({
      ...baseOptions,
      serDes: [
        {
          format: 'custom-1',
          serialize: () => 'test',
        },
        {
          format: 'custom-1',
          deserialize: () => 'test',
        },
        {
          format: 'custom-1',
          serialize: () => 'test',
        },
      ],
    });
    const options = ajv.multipart;
    expect(options.serDesMap).has.property('custom-1');
    expect(options.serDesMap['custom-1']).has.property('serialize');
    expect(options.serDesMap['custom-1']).has.property('deserialize');
  });
});
