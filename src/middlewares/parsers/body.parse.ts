import { Ajv } from 'ajv';
import { ContentType } from '../util';

import {
  OpenAPIV3,
  BodySchema,
  UnsupportedMediaType,
} from '../../framework/types';

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
      // if (requestBody.required) required.push('body');
    }
    return {};
  }

  private toSchema(
    path: string,
    contentType: ContentType,
    requestBody: OpenAPIV3.RequestBodyObject,
  ): BodySchema {
    if (requestBody.content) {
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
        if (contentType.contentType !== undefined) {
          const msg =
            contentType.contentType === 'not_provided'
              ? 'media type not specified'
              : `unsupported media type ${contentType.contentType}`;
          throw new UnsupportedMediaType({ path: path, message: msg });
        } else {
          content = {};
        }
      }

      const schema = this.cleanseContentSchema(content);

      return schema ?? content.schema ?? {};
    }
    return {};
  }

  private cleanseContentSchema(
    content: OpenAPIV3.MediaTypeObject
  ): BodySchema {
    let contentRefSchema = null;
    if (content.schema && '$ref' in content.schema) {
      const resolved = this.ajv.getSchema(content.schema.$ref);
      const schema = <OpenAPIV3.SchemaObject>resolved?.schema;
      contentRefSchema = schema?.properties ? { ...schema } : null;
    }
    // handle readonly / required request body refs
    // don't need to copy schema if validator gets its own copy of the api spec
    // currently all middleware i.e. req and res validators share the spec
    const schema = contentRefSchema || content.schema;
    if (schema && schema.properties) {
      Object.keys(schema.properties).forEach((prop) => {
        const propertyValue = schema.properties[prop];
        const required = schema.required;
        if (propertyValue.readOnly && required) {
          const index = required.indexOf(prop);
          if (index > -1) {
            schema.required = required
              .slice(0, index)
              .concat(required.slice(index + 1));
          }
        }
      });
      return schema;
    }
  }
}
