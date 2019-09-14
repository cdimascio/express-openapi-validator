import * as Ajv from 'ajv';
import * as mung from 'express-mung';
import * as draftSchema from 'ajv/lib/refs/json-schema-draft-04.json';
import { validationError, ajvErrorsToValidatorError } from '../errors';
import ono from 'ono';
import { createResponseAjv } from './ajv';

const TYPE_JSON = 'application/json';

export class ResponseValidator {
  private ajv;
  private spec;
  constructor(openApiSpec, options: any = {}) {
    this.spec = openApiSpec;
    this.ajv = createResponseAjv(openApiSpec, options)
    // this.ajv = new Ajv({
    //   useDefaults: true,
    //   allErrors: true,
    //   unknownFormats: 'ignore',
    //   missingRefs: 'fail',
    //   // @ts-ignore TODO get Ajv updated to account for logger
    //   logger: false,
    //   meta: draftSchema,
    // });
  }
  validate() {
    return mung.json((body, req: any, res) => {
      if (req.openapi) {
        const responses = req.openapi.schema && req.openapi.schema.responses;
        const statusCode = res.statusCode;
        return this._validate({ body, responses, statusCode });
      }
      return body;
    });
  }

  _validate({ body, responses, statusCode }) {
    // TODO build validators should be cached per endpoint
    const validators: any = this.buildValidators(responses);

    // TODO Skip non JSON content validations

    // find a response by status code or 'default'
    let validator;
    const status = statusCode;
    if (status) {
      const statusXX = status.toString()[0] + 'XX';
      if (status in validators) validator = validators[status];
      else if (statusXX in validators) validator = validators[statusXX];
      else if (validators.default) validator = validator.default;
      else {
        // TODO
        throw new Error('unknown status code - TODO fix me ');
      }
    }

    const valid = validator({
      response: body,
    });

    if (!valid) {
      const errors = validator.errors;
      console.log(errors);
      const message = this.ajv.errorsText(errors, {
        dataVar: 'request',
      });
      throw ono(ajvErrorsToValidatorError(500, errors), message);
    }
  }

  /**
   * Build a map of response name to response validator, for the set of responses
   * defined on the current endpoint endpoint
   * @param responses
   * @returns a map of validators
   */
  private buildValidators(responses) {
    const canValidate = r =>
      typeof r.content === 'object' &&
      r.content[TYPE_JSON] &&
      r.content[TYPE_JSON].schema;

    const schemas = {};
    for (const entry of <any[]>Object.entries(responses)) {
      const [name, response] = entry;
      if (!canValidate(response)) {
        // TODO support content other than JSON
        // don't validate
        // assume is valid
        continue;
      }
      const schema = response.content[TYPE_JSON].schema;
      schemas[name] = {
        // $schema: 'http://json-schema.org/schema#',
        // $schema: "http://json-schema.org/draft-04/schema#",
        type: 'object',
        properties: {
          response: schema,
        },
        components: this.spec.components || {},
      };
    }

    const validators = {};
    for (const [name, schema] of Object.entries(schemas)) {
      validators[name] = this.ajv.compile(schema);
    }
    return validators;
  }

  private validateBody(body) {}

  private toOpenapiValidationError(error: Ajv.ErrorObject) {
    const validationError = {
      path: `instance${error.dataPath}`,
      errorCode: `${error.keyword}.openapi.responseValidation`,
      message: error.message,
    };

    validationError.path = validationError.path.replace(
      /^instance\.(?:response\.)?/,
      '',
    );

    validationError.message =
      validationError.path + ' ' + validationError.message;

    if (validationError.path === 'response') {
      delete validationError.path;
    }

    return validationError;
  }
}
