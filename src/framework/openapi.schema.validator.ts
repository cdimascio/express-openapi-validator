import AjvDraft4, {
  ErrorObject,
  Options,
  ValidateFunction,
} from 'ajv-draft-04';
import addFormats from 'ajv-formats';
// https://github.com/OAI/OpenAPI-Specification/blob/master/schemas/v3.0/schema.json
import * as openapi3Schema from './openapi.v3.schema.json';
import { OpenAPIV3 } from './types.js';

export interface OpenAPISchemaValidatorOpts {
  version: string;
  validateApiSpec: boolean;
  extensions?: object;
}
export class OpenAPISchemaValidator {
  private validator: ValidateFunction;
  constructor(opts: OpenAPISchemaValidatorOpts) {
    const options: Options = {
      schemaId: 'id',
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

    const v = new AjvDraft4(options);
    addFormats(v, ['email', 'regex', 'uri', 'uri-reference']);

    const ver = opts.version && parseInt(String(opts.version), 10);
    if (!ver) throw Error('version missing from OpenAPI specification');
    if (ver != 3) throw Error('OpenAPI v3 specification version is required');

    v.addSchema(openapi3Schema);
    this.validator = v.compile(openapi3Schema);
  }

  public validate(openapiDoc: OpenAPIV3.Document): {
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
