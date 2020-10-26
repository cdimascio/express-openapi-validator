import { Ajv } from 'ajv';
import ajv = require('ajv');
import { createRequestAjv } from '../../framework/ajv';
import { OpenAPIV3, BodySchema } from '../../framework/types';

type SchemaObject = OpenAPIV3.SchemaObject;
type ReferenceObject = OpenAPIV3.ReferenceObject;
type Schema = ReferenceObject | SchemaObject;

export class RequestSchemaPreprocessor {
  private ajv: Ajv;
  private apiDoc: OpenAPIV3.Document;

  constructor(apiDoc: OpenAPIV3.Document, options: ajv.Options) {
    this.ajv = createRequestAjv(apiDoc, options);
    this.apiDoc = apiDoc;
  }

  public preProcess() {
    const paths = Object.keys(this.apiDoc.paths);
    paths.forEach((p) => {
      const piOrRef = this.apiDoc.paths[p];
      const pathItem = piOrRef.$ref
        ? <OpenAPIV3.PathItemObject>this.ajv.getSchema(piOrRef.$ref).schema
        : piOrRef;
      for (const pathItemKey of Object.keys(pathItem)) {
        this.preprocessRequestBody(pathItemKey, pathItem);
        this.preprocessPathLevelParameters(pathItemKey, pathItem);
      }
    });
  }

  private preprocessRequestBody(
    pathItemKey: string,
    pathItem: OpenAPIV3.PathItemObject,
  ) {
    const v = pathItem[pathItemKey];
    const ref = v?.requestBody?.$ref;

    const requestBody = <OpenAPIV3.RequestBodyObject>(
      (ref ? this.ajv.getSchema(ref)?.schema : v.requestBody)
    );

    if (!requestBody?.content) return;

    const contentEntries = Object.entries(requestBody.content);
    for (const [_, mediaTypeObject] of contentEntries) {
      this.cleanseContentSchema(mediaTypeObject);
    }
  }

  private preprocessPathLevelParameters(
    pathItemKey: string,
    pathItem: OpenAPIV3.PathItemObject,
  ) {
    const parameters = pathItem.parameters ?? [];

    if (parameters.length === 0) return;

    const v = pathItem[pathItemKey];
    if (v === parameters) return;
    const ref = v?.parameters?.$ref;

    const operationParameters = <
      Array<OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject>
    >(ref ? this.ajv.getSchema(ref)?.schema : v.parameters);

    for (const param of parameters) {
      operationParameters.push(param);
    }
  }

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
          if (schema.required.length === 0) {
            delete schema.required;
          }
        }
      }
    };
    // traverse schema
    this.traverse(content.schema, removeRequiredForReadOnly);
    return content.schema;
  }

  private traverse(schema: Schema, f: (p, s) => void) {
    const schemaObj = schema.hasOwnProperty('$ref')
      ? <SchemaObject>this.ajv.getSchema(schema['$ref'])?.schema
      : <SchemaObject>schema;

    if (schemaObj.allOf) {
      schemaObj.allOf.forEach((s) => this.traverse(s, f));
    } else if (schemaObj.oneOf) {
      schemaObj.oneOf.forEach((s) => this.traverse(s, f));
    } else if (schemaObj.anyOf) {
      schemaObj.anyOf.forEach((s) => this.traverse(s, f));
    } else if (schemaObj.properties) {
      Object.keys(schemaObj.properties).forEach((prop) => {
        f(prop, schemaObj);
      });
    } else {
      console.warn('unhandled schema property: skipping', schema);
    }
  }
}
