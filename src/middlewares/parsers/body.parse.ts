import { ContentType } from '../util';

import {
  OpenAPIV3,
  BodySchema,
  UnsupportedMediaType,
} from '../../framework/types';

export class BodySchemaParser {
  constructor() {
  }
  public parse(
    path: string,
    pathSchema: OpenAPIV3.OperationObject,
    contentType: ContentType,
  ): BodySchema {
    // The schema.preprocessor will have dereferenced the RequestBodyObject
    // thus we can assume a RequestBodyObject, not a ReferenceObject
    const requestBody = <OpenAPIV3.RequestBodyObject>pathSchema.requestBody;
    if (requestBody?.hasOwnProperty('content')) {
      return this.toSchema(path, contentType, requestBody);
    }
    return {};
  }

  private toSchema(
    path: string,
    contentType: ContentType,
    requestBody: OpenAPIV3.RequestBodyObject,
  ): BodySchema {
    if (!requestBody?.content) return {};

    let content = null;
    for (const type of contentType.equivalents()) {
      content = requestBody.content[type];
      if (content) break;
    }

    if (!content) {
      for (const requestContentType of Object.keys(requestBody.content)
        .sort()
        .reverse()) {
        if (requestContentType === '*/*') {
          content = requestBody.content[requestContentType];
          break;
        }

        if (!new RegExp(/^[a-z]+\/\*$/).test(requestContentType)) continue; // not a wildcard of type application/*

        const [type] = requestContentType.split('/', 1);

        if (new RegExp(`^${type}\/.+$`).test(contentType.contentType)) {
          content = requestBody.content[requestContentType];
          break;
        }
      }
    }

    if (!content) {
      // check if required is false, if so allow request when no content type is supplied
      const contentNotProvided = contentType.contentType === 'not_provided';
      if ((contentType.contentType === undefined || contentNotProvided) && requestBody.required === false) {
        return {};
      }
      const msg =
        contentNotProvided
          ? 'media type not specified'
          : `unsupported media type ${contentType.contentType}`;
      throw new UnsupportedMediaType({ path: path, message: msg });
    }
    return content.schema ?? {};
  }
}
