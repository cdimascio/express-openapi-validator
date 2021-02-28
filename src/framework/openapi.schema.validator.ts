import * as Ajv from 'ajv';
import * as draftSchema from 'ajv/lib/refs/json-schema-draft-04.json';
// https://github.com/OAI/OpenAPI-Specification/blob/master/schemas/v3.0/schema.json
import * as openapi3Schema from './openapi.v3.schema.json';
import { OpenAPIV3 } from './types.js';

export interface OpenAPISchemaValidatorOpts {
  version: string;
  validateApiSpec: boolean;
  extensions?: object;
}
export class OpenAPISchemaValidator {
  private validator: Ajv.ValidateFunction;
  constructor(opts: OpenAPISchemaValidatorOpts) {
    const options: any = {
      schemaId: 'auto',
      allErrors: true,
    };

    if (!opts.validateApiSpec) {
      options.validateSchema = false;
    }

    const v = new Ajv(options);
    v.addMetaSchema(draftSchema);

    const ver = opts.version && parseInt(String(opts.version), 10);
    if (!ver) throw Error('version missing from OpenAPI specification');
    if (ver != 3) throw Error('OpenAPI v3 specification version is required');

    v.addSchema(openapi3Schema);
    this.validator = v.compile(openapi3Schema);
  }

  public validate(
    openapiDoc: OpenAPIV3.Document,
  ): { errors: Array<Ajv.ErrorObject> | null } {
    const valid = this.validator(openapiDoc);
    if (!valid) {
      return { errors: this.validator.errors };
    } else {
      return { errors: [] };
    }
  }
}
