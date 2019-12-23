import ono from 'ono';
import * as ajv from 'ajv';
import mung from '../framework/modded.express.mung';
import { createResponseAjv } from '../framework/ajv';
import {
  augmentAjvErrors,
  ContentType,
  ajvErrorsToValidatorError,
  validationError,
} from './util';
import { OpenAPIV3 } from '../framework/types';
import * as mediaTypeParser from 'media-typer';
import * as contentTypeParser from 'content-type';

export class ResponseValidator {
  private ajv: ajv.Ajv;
  private spec: OpenAPIV3.Document;
  private validatorsCache = {};

  constructor(openApiSpec: OpenAPIV3.Document, options: ajv.Options = {}) {
    this.spec = openApiSpec;
    this.ajv = createResponseAjv(openApiSpec, options);
    (<any>mung).onError = (err, req, res, next) => {
      return next(err);
    };
  }

  public validate() {
    return mung.json((body, req: any, res) => {
      if (req.openapi) {
        const responses = req.openapi.schema?.responses;
        const validators = this._getOrBuildValidator(req, responses);
        const statusCode = res.statusCode;
        const path = req.originalUrl;
        return this._validate({ validators, body, statusCode, path });
      }
      return body;
    });
  }

  // TODO public for test only - fix me
  public _getOrBuildValidator(req, responses) {
    if (!req) {
      // use !req is only possible in unit tests
      return this.buildValidators(responses);
    }

    const contentTypeKey =
      ContentType.from(req).equivalents()[0] || 'not_provided';
    const key = `${req.method}-${req.originalUrl}-${contentTypeKey}`;

    let validators = this.validatorsCache[key];
    if (!validators) {
      validators = this.buildValidators(responses);
      this.validatorsCache[key] = validators;
    }
    return validators;
  }

  // TODO public for test only - fix me
  _validate({ validators, body, statusCode, path }) {
    // find the validator for the 'status code' e.g 200, 2XX or 'default'
    let validator;
    const status = statusCode;
    if (status) {
      const statusXX = status.toString()[0] + 'XX';
      if (status in validators) validator = validators[status];
      else if (statusXX in validators) validator = validators[statusXX];
      else if (validators.default) validator = validator.default;
      else {
        throw validationError(
          500,
          path,
          `no schema defined for status code '${status}' in the openapi spec`,
        );
      }
    }

    if (!validator) {
      console.warn('no validator found');
      // assume valid
      return;
    }
    const valid = validator({
      response: body,
    });

    if (!valid) {
      const errors = augmentAjvErrors(validator.errors);
      const message = this.ajv.errorsText(errors, {
        dataVar: '', // responses
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
    const canValidate = response => {
      if (typeof response.content !== 'object') {
        return false;
      }
      for (let contentType of Object.keys(response.content)) {
        const contentTypeParsed = contentTypeParser.parse(contentType);
        const mediaTypeParsed = mediaTypeParser.parse(contentTypeParsed.type);

        if (
          mediaTypeParsed.subtype === 'json' ||
          mediaTypeParsed.suffix === 'json'
        ) {
          return response.content[contentType] &&
            response.content[contentType].schema
            ? contentType
            : false;
        }
      }

      return false;
    };

    const schemas = {};
    for (const [name, response] of <any[]>Object.entries(responses)) {
      const mediaTypeToValidate = canValidate(response);

      if (!mediaTypeToValidate) {
        // TODO support content other than JSON
        // don't validate
        // assume is valid
        continue;
      }
      const schema = response.content[mediaTypeToValidate].schema;

      schemas[name] = {
        // $schema: 'http://json-schema.org/schema#',
        // $schema: "http://json-schema.org/draft-04/schema#",
        type: 'object',
        properties: {
          response: schema,
        },
        components: this.spec.components ?? {},
      };
    }

    const validators = {};
    for (const [name, schema] of Object.entries(schemas)) {
      validators[name] = this.ajv.compile(<object>schema);
    }
    return validators;
  }
}
