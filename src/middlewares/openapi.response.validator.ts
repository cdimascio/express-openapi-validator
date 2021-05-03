import { RequestHandler } from 'express';
import * as ajv from 'ajv';
import mung from '../framework/modded.express.mung';
import { createResponseAjv } from '../framework/ajv';
import {
  augmentAjvErrors,
  ContentType,
  ajvErrorsToValidatorError,
  findResponseContent,
} from './util';
import {
  OpenAPIV3,
  OpenApiRequest,
  OpenApiRequestMetadata,
  InternalServerError,
  ValidateResponseOpts,
} from '../framework/types';
import * as mediaTypeParser from 'media-typer';
import * as contentTypeParser from 'content-type';

interface ValidateResult {
  validators: { [key: string]: ajv.ValidateFunction };
  body: object;
  statusCode: number;
  path: string;
  accepts: string[];
}
export class ResponseValidator {
  private ajvBody: ajv.Ajv;
  private spec: OpenAPIV3.Document;
  private validatorsCache: {
    [key: string]: { [key: string]: ajv.ValidateFunction };
  } = {};
  private eovOptions: ValidateResponseOpts

  constructor(
      openApiSpec: OpenAPIV3.Document,
      options: ajv.Options = {},
      eovOptions: ValidateResponseOpts = {}
  ) {
    this.spec = openApiSpec;
    this.ajvBody = createResponseAjv(openApiSpec, options);
    this.eovOptions = eovOptions;

    // This is a pseudo-middleware function. It doesn't get registered with
    // express via `use`
    (<any>mung).onError = (err, req, res, next) => {
      return next(err);
    };
  }

  public validate(): RequestHandler {
    return mung.json((body, req, res) => {
      if (req.openapi) {
        const openapi = <OpenApiRequestMetadata>req.openapi;
        // instead of openapi.schema, use openapi._responseSchema to get the response copy
        const responses: OpenAPIV3.ResponsesObject = (<any>openapi)
          ._responseSchema?.responses;

        const validators = this._getOrBuildValidator(req, responses);
        const path = req.originalUrl;
        const statusCode = res.statusCode;
        const contentType = res.getHeaders()['content-type'];
        const accept = req.headers['accept'];
        // ir response has a content type use it, else use accept headers
        const accepts: [string] = contentType
          ? [contentType]
          : accept
          ? accept.split(',').map((h) => h.trim())
          : [];

        try {
          return this._validate({
            validators,
            body,
            statusCode,
            path,
            accepts, // return 406 if not acceptable
          });
        } catch (err) {
          // If a custom error handler was provided, we call that
          if (err instanceof InternalServerError && this.eovOptions.onError) {
            this.eovOptions.onError(err, body, req)
          } else {
            // No custom error handler, or something unexpected happen.
            throw err;
          }
        }
      }
      return body;
    });
  }

  // TODO public for test only - fix me
  // Build validators for each url/method/contenttype tuple
  public _getOrBuildValidator(
    req: OpenApiRequest,
    responses: OpenAPIV3.ResponsesObject,
  ): { [key: string]: ajv.ValidateFunction } {
    // get the request content type - used only to build the cache key
    const contentTypeMeta = ContentType.from(req);
    const contentType =
      (contentTypeMeta.contentType?.indexOf('multipart') > -1
        ? contentTypeMeta.equivalents()[0]
        : contentTypeMeta.contentType) ?? 'not_provided';

    const openapi = <OpenApiRequestMetadata>req.openapi;
    const key = `${req.method}-${openapi.expressRoute}-${contentType}`;

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
    accepts, // optional
  }: ValidateResult): void {
    const status = statusCode ?? 'default';
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

    const validatorContentTypes = Object.keys(svalidator);
    const contentType =
      findResponseContent(accepts, validatorContentTypes) ||
      validatorContentTypes[0]; // take first contentType, if none found

    if (validatorContentTypes.length === 0) {
      // spec specifies no content for this response
      if (body !== undefined) {
        // response contains content/body
        throw new InternalServerError({
          path: '.response',
          message: 'response should NOT have a body',
        });
      }
      // response contains no content/body so OK
      return;
    }

    if (!contentType) {
      // not contentType inferred, assume valid
      console.warn('no contentType found');
      return;
    }

    const validator = svalidator[contentType];

    if (!validator) {
      // no validator found, assume valid
      console.warn('no validator found');
      return;
    }

    if (body === undefined || body === null) {
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
      const message = this.ajvBody.errorsText(errors, {
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
        // resolve top level response $ref
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
      if (Object.keys(contentTypeSchemas).length === 0) {
          validators[code] = {};
      }
      for (const contentType of Object.keys(contentTypeSchemas)) {
        const schema = contentTypeSchemas[contentType];
        schema.paths = this.spec.paths; // add paths for resolution with multi-file
        schema.components = this.spec.components; // add components for resolution w/ multi-file
        validators[code] = {
          ...validators[code],
          [contentType]: this.ajvBody.compile(<object>schema),
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
