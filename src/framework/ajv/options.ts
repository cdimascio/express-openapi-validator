import { Options as AjvLibOptions } from 'ajv';
import {
  OpenApiValidatorOpts,
  Options,
  RequestValidatorOptions,
  ValidateRequestOpts,
  ValidateResponseOpts,
} from '../types';

export class AjvOptions {
  private options: OpenApiValidatorOpts;
  constructor(options: OpenApiValidatorOpts) {
    this.options = options;
  }
  get preprocessor(): AjvLibOptions {
    return this.baseOptions();
  }

  get response(): AjvLibOptions {
    const { coerceTypes, removeAdditional } = <ValidateResponseOpts>(
      this.options.validateResponses
    );
    return {
      ...this.baseOptions(),
      useDefaults: false,
      coerceTypes,
      removeAdditional,
    };
  }

  get request(): RequestValidatorOptions {
    const { allowUnknownQueryParameters, coerceTypes, removeAdditional } = <
      ValidateRequestOpts
    >this.options.validateRequests;
    return {
      ...this.baseOptions(),
      allowUnknownQueryParameters,
      coerceTypes,
      removeAdditional,
    };
  }

  get multipart(): Options {
    return this.baseOptions();
  }

  private baseOptions(): Options {
    const { coerceTypes, unknownFormats, validateFormats, serDes } =
      this.options;
    const serDesMap = {};
    for (const serDesObject of serDes) {
      if (!serDesMap[serDesObject.format]) {
        serDesMap[serDesObject.format] = serDesObject;
      } else {
        if (serDesObject.serialize) {
          serDesMap[serDesObject.format].serialize = serDesObject.serialize;
        }
        if (serDesObject.deserialize) {
          serDesMap[serDesObject.format].deserialize = serDesObject.deserialize;
        }
      }
    }

    return {
      validateSchema: false, // this is true for statup validation, thus it can be bypassed here
      // nullable: true,
      coerceTypes,
      useDefaults: true,
      removeAdditional: false,
      validateFormats: false,
      formats: [
        ...this.options.formats,
        ...(Array.isArray(unknownFormats) ? unknownFormats : []),
      ].reduce((acc, f) => {
        if (typeof f === 'string') {
          acc[f] = {
            type: f,
            validate: () => true,
          };
          return acc;
        }
        acc[f.name] = {
          type: f.type,
          validate: f.validate,
        };
        return acc;
      }, {}),
      serDesMap: serDesMap,
    };
  }
}
