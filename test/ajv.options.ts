import { expect } from 'chai';
import { AjvOptions } from '../src/openapi.validator';

describe('AjvOptions', () => {
  const baseOptions = {
    apiSpec: './spec',
    validateApiSpec: false,
    validateRequests: {},
    serDes: [],
    formats: [],
  };

  it('defaults to validateSchema:true', async () => {
    const ajv = new AjvOptions(baseOptions);
    const options = ajv.request;
    expect(options.validateSchema).to.be.true;
  });

  it('returns to validateSchema:true with validateApiSpec: false', async () => {
    const ajv = new AjvOptions(
      {
        ...baseOptions,
        ...{ validateApiSpec: false }
      }
    );
    const options = ajv.request;
    expect(options.validateSchema).to.be.true;
  });

  it('returns to validateSchema:true with validateApiSpec: {}', async () => {
    const ajv = new AjvOptions(
      {
        ...baseOptions,
        ...{ validateApiSpec: {} }
      }
    );
    const options = ajv.request;
    expect(options.validateSchema).to.be.true;
  });

  it('returns to validateSchema:true with suppressValidation: true', async () => {
    const ajv = new AjvOptions(
      {
        ...baseOptions,
        ...{
          validateApiSpec: {
            suppressValidation: true
          }
        }
      }
    );
    const options = ajv.request;
    expect(options.validateSchema).to.be.true;
  });

  it('returns to validateSchema:false with deeplySuppress: true', async () => {
    const ajv = new AjvOptions(
      {
        ...baseOptions,
        ...{
          validateApiSpec: {
            deeplySuppress: true
          }
        }
      }
    );
    const options = ajv.request;
    expect(options.validateSchema).to.be.false;
  });
});
