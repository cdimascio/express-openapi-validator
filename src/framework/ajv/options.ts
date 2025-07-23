import {
  NormalizedOpenApiValidatorOpts,
  Options,
  RequestValidatorOptions,
  ValidateRequestOpts,
  ValidateResponseOpts,
} from '../types';

export class AjvOptions {
  private options: NormalizedOpenApiValidatorOpts;
  constructor(options: NormalizedOpenApiValidatorOpts) {
    this.options = options;
  }

  get preprocessor(): Options {
    return this.baseOptions();
  }

  get response(): Options {
    const { allErrors, coerceTypes, removeAdditional } = <ValidateResponseOpts>(
      this.options.validateResponses
    );
    return {
      ...this.baseOptions(),
      allErrors,
      useDefaults: false,
      coerceTypes,
      removeAdditional,
    };
  }

  get request(): RequestValidatorOptions {
    const {
      allErrors,
      allowUnknownQueryParameters,
      coerceTypes,
      removeAdditional,
      onError,
    } = <ValidateRequestOpts>this.options.validateRequests;
    return {
      ...this.baseOptions(),
      allErrors,
      allowUnknownQueryParameters,
      coerceTypes,
      onError,
      removeAdditional,
    };
  }

  get multipart(): Options {
    return this.baseOptions();
  }

  private baseOptions(): Options {
    const { coerceTypes, formats, validateFormats, serDes, ajvFormats } =
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

    const options: Options = {
      strict: false,
      strictNumbers: true,
      strictTuples: true,
      allowUnionTypes: false,
      validateSchema: false, // this is true for startup validation, thus it can be bypassed here
      coerceTypes,
      useDefaults: true,
      removeAdditional: false,
      validateFormats,
      formats,
      serDesMap,
      ajvFormats,
    };

    return options;
  }
}
