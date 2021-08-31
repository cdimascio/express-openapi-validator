import Ajv2020, { Options } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import Ajv from 'ajv-draft-04';
import type { ErrorObject, ValidateFunction } from 'ajv';
// https://github.com/OAI/OpenAPI-Specification/blob/master/schemas/v3.0/schema.json
import * as openapi3Schema from './openapi.v3.1.schema.json';
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
      schemaId: '$id',
      allErrors: true,
      strictTypes: false,
      validateFormats: false,
      strictSchema: false,
      coerceTypes: false,
      useDefaults: true,
      strict: false,
    };
    if (!opts.validateApiSpec) {
      options.validateSchema = false;
    }

    const v = new Ajv2020(options);
    addFormats(v);

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
