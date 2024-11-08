import AjvDraft4, {
  ErrorObject,
  Options,
  ValidateFunction,
} from 'ajv-draft-04';
import addFormats from 'ajv-formats';
// https://github.com/OAI/OpenAPI-Specification/blob/master/schemas/v3.0/schema.json
import * as openapi3Schema from './openapi.v3.schema.json';
// https://github.com/OAI/OpenAPI-Specification/blob/master/schemas/v3.1/schema.json with dynamic refs replaced due to AJV bug - https://github.com/ajv-validator/ajv/issues/1745
import * as openapi31Schema from './openapi.v3_1.modified.schema.json';
import { OpenAPIV3 } from './types.js';

import Ajv2020 from 'ajv/dist/2020';
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
