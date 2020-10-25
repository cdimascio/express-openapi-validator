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
        const msg =
          contentType.contentType === 'not_provided'
            ? 'media type not specified'
            : `unsupported media type ${contentType.contentType}`;
        throw new UnsupportedMediaType({ path: path, message: msg });
      }
      const schema = this.cleanseContentSchema(content);

      return schema ?? content.schema ?? {};
    }
    return {};
  }

  // TODO cache this traversal - better yet do it on startup
  private cleanseContentSchema(content: OpenAPIV3.MediaTypeObject): BodySchema {
    // remove required if readonly
    const removeRequiredForReadOnly = (prop, schema) => {
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
    }
    // traverse schema
    this.traverse(content.schema, removeRequiredForReadOnly)
    return content.schema;
  }

  private traverse(schema: Schema, f: (p, s) => void) {
    const schemaObj = schema.hasOwnProperty('$ref')
      ? <SchemaObject>this.ajv.getSchema(schema['$ref'])?.schema
      : <SchemaObject>schema

    if (schemaObj.allOf) {
      schemaObj.allOf.forEach(s => this.traverse(s, f));
    } else if (schemaObj.oneOf) {
      schemaObj.oneOf.forEach(s => this.traverse(s, f));
    } else if (schemaObj.anyOf) {
      schemaObj.anyOf.forEach(s => this.traverse(s, f));
    } else if (schemaObj.properties) {
      // other types of properties to handle?
      Object.keys(schemaObj.properties).forEach((prop) => {
        f(prop, schemaObj)
      })
    } else {
      console.log('Yikes, nothing to do?', schema)
    }

  }
}
