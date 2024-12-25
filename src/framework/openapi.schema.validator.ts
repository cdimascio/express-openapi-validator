import {
  ErrorObject,
  Options,
  ValidateFunction,
} from 'ajv-draft-04';
import addFormats from 'ajv-formats';
import { OpenAPIV3 } from './types.js';
import { factoryAjv } from './ajv/factory';
import { factorySchema } from './openapi/factory.schema';

export interface OpenAPISchemaValidatorOpts {
  version: string;
  validateApiSpec: boolean;
  extensions?: object;
}
export class OpenAPISchemaValidator {
  private validator: ValidateFunction;
  constructor(opts: OpenAPISchemaValidatorOpts) {
    const options: Options = {
      allErrors: true,
      validateFormats: true,
      coerceTypes: false,
      useDefaults: false,
      // Strict enforcement is nice, but schema is controlled by this library and known to be valid
      strict: false,
    };
    if (!opts.validateApiSpec) {
      options.validateSchema = false;
    }

    const ajvInstance = factoryAjv(opts.version, options)
    const schema = factorySchema(opts.version)

    addFormats(ajvInstance, ['email', 'regex', 'uri', 'uri-reference']);

    ajvInstance.addSchema(schema);
    this.validator = ajvInstance.compile(schema);
  }

  public validate(openapiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1): {
    errors: Array<ErrorObject> | null;
  } {
    const valid = this.validator(openapiDoc);
    if (!valid) {
      return { errors: this.validator.errors };
    } else {
      return { errors: [] };
    }
  }
}
