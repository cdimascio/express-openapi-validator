import { RequestHandler } from 'express';
import * as ajv from 'ajv';
import mung from '../framework/modded.express.mung';
import { createResponseAjv } from '../framework/ajv';
import {
  augmentAjvErrors,
  ContentType,
  ajvErrorsToValidatorError,
} from './util';
import {
  OpenAPIV3,
  OpenApiRequest,
  OpenApiRequestMetadata,
  InternalServerError,
  ValidationError,
} from '../framework/types';
import * as mediaTypeParser from 'media-typer';
import * as contentTypeParser from 'content-type';

interface ValidateResult {
  validators: { [key: string]: ajv.ValidateFunction };
  body: object;
  statusCode: number;
  path: string;
  contentType?: string;
}
export class ResponseValidator {
  private ajv: ajv.Ajv;
  private spec: OpenAPIV3.Document;
  private validatorsCache: {
    [key: string]: { [key: string]: ajv.ValidateFunction };
  } = {};

  constructor(openApiSpec: OpenAPIV3.Document, options: ajv.Options = {}) {
    this.spec = openApiSpec;
    this.ajv = createResponseAjv(openApiSpec, options);
    (<any>mung).onError = (err, req, res, next) => {
      return next(err);
    };
  }

  public validate(): RequestHandler {
    return mung.json((body, req, res) => {
      if (req.openapi) {
        const openapi = <OpenApiRequestMetadata>req.openapi;
        const responses = openapi.schema?.responses;

        const contentTypeMeta = ContentType.from(req);
        const contentType =
          (contentTypeMeta.contentType?.indexOf('multipart') > -1
            ? contentTypeMeta.equivalents()[0]
            : contentTypeMeta.contentType) ?? 'not_provided';
        const validators = this._getOrBuildValidator(
          req,
          responses,
          contentType,
        );
        const statusCode = res.statusCode;
        const path = req.originalUrl;
        return this._validate({
          validators,
          body,
          statusCode,
          path,
          contentType,
        });
      }
      return body;
    });
  }

  // TODO public for test only - fix me
  // Build validators for each url/method/contenttype tuple
  public _getOrBuildValidator(
    req: OpenApiRequest,
    responses: OpenAPIV3.ResponsesObject,
    contentType: string,
  ): { [key: string]: ajv.ValidateFunction } {
    if (!req) {
      // use !req is only possible in unit tests
      return this.buildValidators(responses);
    }

    const key = `${req.method}-${req.originalUrl}-${contentType}`;

    let validators = this.validatorsCache[key];
    if (!validators) {
      validators = this.buildValidators(responses);
      this.validatorsCache[key] = validators;
    }
    return validators;
  }

  // TODO public for test only - fix me
  public _validate({
    validators,
    body,
    statusCode,
    path,
    contentType,
  }: ValidateResult): void {
    // find the validator for the 'status code' e.g 200, 2XX or 'default'
    let validator;
    const status = statusCode;
    if (status) {
      const statusXX = status.toString()[0] + 'XX';
      let svalidator;
      if (status in validators) {
        svalidator = validators[status];
      } else if (statusXX in validators) {
        svalidator = validators[statusXX];
      } else if (validators.default) {
        svalidator = validators.default;
      } else {
        throw new InternalServerError({
          path: path,
          message: `no schema defined for status code '${status}' in the openapi spec`,
        });
      }

      validator = svalidator[contentType];

      if (!validator) {
        // wildcard support
        for (const validatorContentType of Object.keys(svalidator)
          .sort()
          .reverse()) {
          if (validatorContentType === '*/*') {
            validator = svalidator[validatorContentType];
            break;
          }

          if (RegExp(/^[a-z]+\/\*$/).test(validatorContentType)) {
            // wildcard of type application/*
            const [type] = validatorContentType.split('/', 1);

            if (new RegExp(`^${type}\/.+$`).test(contentType)) {
              validator = svalidator[validatorContentType];
              break;
            }
          }
        }
      }

      if (!validator) validator = svalidator[Object.keys(svalidator)[0]]; // take first for backwards compatibility
    }

    if (!validator) {
      console.warn('no validator found');
      // assume valid
      return;
    }

    if (!body) {
      throw new InternalServerError({
        path: '.response',
        message: 'response body required.',
      });
    }

    // CHECK If Content-Type is validatable
    try {
      if (!this.canValidateContentType(contentType)) {
        console.warn('Cannot validate content type', contentType);
        // assume valid
        return;
      }
    } catch (e) {
      // Do nothing. Move on and validate response
    }

    const valid = validator({
      response: body,
    });

    if (!valid) {
      const errors = augmentAjvErrors(validator.errors);
      const message = this.ajv.errorsText(errors, {
        dataVar: '', // responses
      });
      throw new InternalServerError({
        path: path,
        errors: ajvErrorsToValidatorError(500, errors).errors,
        message: message,
      });
    }
  }

  /**
   * Build a map of response name to response validator, for the set of responses
   * defined on the current endpoint
   * @param responses
   * @returns a map of validators
   */
  private buildValidators(
    responses: OpenAPIV3.ResponsesObject,
  ): { [key: string]: ajv.ValidateFunction } {
    const validationTypes = (response) => {
      if (!response.content) {
        return ['no_content'];
      }
      if (typeof response.content !== 'object') {
        return [];
      }
      const types: string[] = [];
      for (let contentType of Object.keys(response.content)) {
        try {
          if (this.canValidateContentType(contentType)) {
            if (
              response.content[contentType] &&
              response.content[contentType].schema
            ) {
              types.push(contentType);
            }
          }
        } catch (e) {
          // Handle wildcards
          if (
            response.content[contentType].schema &&
            (contentType === '*/*' ||
              new RegExp(/^[a-z]+\/\*$/).test(contentType))
          ) {
            types.push(contentType);
          }
        }
      }

      return types;
    };

    const responseSchemas = {};
    for (const [name, resp] of <any[]>Object.entries(responses)) {
      let tmpResponse = resp;
      if (tmpResponse.$ref) {
        // resolve response
        const id = tmpResponse.$ref.replace(/^.+\//i, '');
        tmpResponse = this.spec.components?.responses?.[id];
      }
      const response = tmpResponse;
      const types = validationTypes(response);

      for (const mediaTypeToValidate of types) {
        if (!mediaTypeToValidate) {
          // TODO support content other than JSON
          // don't validate
          // assume is valid
          continue;
        } else if (mediaTypeToValidate === 'no_content') {
          responseSchemas[name] = {};
          continue;
        }
        const schema = response.content[mediaTypeToValidate].schema;

        responseSchemas[name] = {
          ...responseSchemas[name],
          [mediaTypeToValidate]: {
            // $schema: 'http://json-schema.org/schema#',
            // $schema: "http://json-schema.org/draft-04/schema#",
            type: 'object',
            properties: {
              response: schema,
            },
            components: this.spec.components ?? {},
          },
        };
      }
    }

    const validators = {};
    for (const [code, contentTypeSchemas] of Object.entries(responseSchemas)) {
      for (const contentType of Object.keys(contentTypeSchemas)) {
        const schema = contentTypeSchemas[contentType];

        validators[code] = {
          ...validators[code],
          [contentType]: this.ajv.compile(<object>schema),
        };
      }
    }
    return validators;
  }

  /**
   * Checks if specific Content-Type is validatable
   * @param contentType
   * @returns boolean
   * @throws error on invalid content type format
   */
  private canValidateContentType(contentType: string): boolean {
    const contentTypeParsed = contentTypeParser.parse(contentType);
    const mediaTypeParsed = mediaTypeParser.parse(contentTypeParsed.type);

    return (
      mediaTypeParsed.subtype === 'json' || mediaTypeParsed.suffix === 'json'
    );
  }
}
