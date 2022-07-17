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
    const { coerceTypes, removeAdditional, passContext } = <ValidateResponseOpts>(
      this.options.validateResponses
    );
    return {
      ...this.baseOptions(),
      useDefaults: false,
      coerceTypes,
      removeAdditional,
      passContext
    };
  }

  get request(): RequestValidatorOptions {
    const { allowUnknownQueryParameters, coerceTypes, removeAdditional, passContext } = <
      ValidateRequestOpts
    >this.options.validateRequests;
    return {
      ...this.baseOptions(),
      allowUnknownQueryParameters,
      coerceTypes,
      removeAdditional,
      passContext
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
        if (serDesObject.async) {
          serDesMap[serDesObject.format].async = serDesObject.async;
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
      validateFormats: validateFormats,
      formats,
      serDesMap,
      ajvFormats,
    };

    return options;
  }
}
