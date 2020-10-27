import { Ajv } from 'ajv';
import { ContentType } from '../util';

import {
  OpenAPIV3,
  BodySchema,
  UnsupportedMediaType,
} from '../../framework/types';

type SchemaObject = OpenAPIV3.SchemaObject;
type ReferenceObject = OpenAPIV3.ReferenceObject;
type Schema = ReferenceObject | SchemaObject;

export class BodySchemaParser {
  private _apiDoc: OpenAPIV3.Document;
  private ajv: Ajv;
  constructor(ajv: Ajv, apiDoc: OpenAPIV3.Document) {
    this.ajv = ajv;
    this._apiDoc = apiDoc;
  }
  public parse(
    path: string,
    pathSchema: OpenAPIV3.OperationObject,
    contentType: ContentType,
  ): BodySchema {
    // TODO should return OpenAPIV3.SchemaObject instead
    let schemaRequestBody = pathSchema.requestBody;
    if (schemaRequestBody?.hasOwnProperty('$ref')) {
      // TODO use ajv.getSchema instead
      const ref = (<OpenAPIV3.ReferenceObject>schemaRequestBody).$ref;
      const id = ref.replace(/^.+\//i, '');
      schemaRequestBody = this._apiDoc.components.requestBodies[id];
    }
    const requestBody = <OpenAPIV3.RequestBodyObject>schemaRequestBody;
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
      const msg =
        contentType.contentType === 'not_provided'
          ? 'media type not specified'
          : `unsupported media type ${contentType.contentType}`;
      throw new UnsupportedMediaType({ path: path, message: msg });
    }
    return content.schema ?? {};
  }
}
