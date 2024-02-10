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

    const ver = opts.version && parseFloat(String(opts.version));
    if (!ver) throw Error('version missing from OpenAPI specification');
    if (parseInt(ver.toString()) != 3) throw Error('OpenAPI v3 specification version is required');

    let ajvInstance;
    let schema;

    if (ver === 3) {
      schema = openapi3Schema;
      ajvInstance = new AjvDraft4(options);
    } else if (ver === 3.1) {
      schema = openapi31Schema;
      ajvInstance = new Ajv2020(options);
      ajvInstance.addFormat('media-range', true); // TODO: Validate media-range format as defined in https://www.rfc-editor.org/rfc/rfc9110.html#name-collected-abnf
    } else {
      throw new Error('OpenAPI v3 specification 3.0 and 3.1 supported');
    }

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
