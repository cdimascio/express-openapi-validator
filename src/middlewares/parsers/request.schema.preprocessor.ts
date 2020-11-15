import { Ajv } from 'ajv';
import ajv = require('ajv');
import { createRequestAjv } from '../../framework/ajv';
import { OpenAPIV3, BodySchema } from '../../framework/types';

type SchemaObject = OpenAPIV3.SchemaObject;
type ReferenceObject = OpenAPIV3.ReferenceObject;
type Schema = ReferenceObject | SchemaObject;

const httpMethods = new Set([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
]);
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
        if (httpMethods.has(pathItemKey)) {
          this.preprocessRequestBody(pathItemKey, pathItem);
          this.preprocessPathLevelParameters(pathItemKey, pathItem);
        }
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
      this.handleDiscriminator(mediaTypeObject);
    }
  }

  private preprocessPathLevelParameters(
    pathItemKey: string,
    pathItem: OpenAPIV3.PathItemObject,
  ) {
    const parameters = pathItem.parameters ?? [];

    if (parameters.length === 0) return;

    let v = pathItem[pathItemKey];
    if (v === parameters) return;
    const ref = v?.parameters?.$ref;

    const op = ref && this.ajv.getSchema(ref)?.schema;
    if (op) v = op;
    v.parameters = v.parameters || [];

    for (const param of parameters) {
      v.parameters.push(param);
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

  private handleDiscriminator(content: OpenAPIV3.MediaTypeObject) {
    const schemaObj = content.schema.hasOwnProperty('$ref')
      ? <SchemaObject>this.ajv.getSchema(content.schema['$ref'])?.schema
      : <SchemaObject>content.schema;

    if (schemaObj.discriminator) {
      this.discriminatorTraverse(null, schemaObj, {});
    }
  }

  private discriminatorTraverse(parent: Schema, schema: Schema, o: any = {}) {
    const schemaObj = schema.hasOwnProperty('$ref')
      ? <SchemaObject>this.ajv.getSchema(schema['$ref'])?.schema
      : <SchemaObject>schema;

    const xOf = schemaObj.oneOf ? 'oneOf' : 'anyOf';
    if (schemaObj?.discriminator?.propertyName && !o.discriminator) {
      // TODO discriminator can be used for anyOf too!
      const options = schemaObj[xOf].map((refObject) => {
        const option = this.findKey(
          schemaObj.discriminator.mapping,
          (value) => value === refObject['$ref'],
        );
        const ref = this.getKeyFromRef(refObject['$ref']);
        return { option: option || ref, ref };
      });
      o.options = options;
      o.discriminator = schemaObj.discriminator?.propertyName;
    }
    o.properties = { ...(o.properties ?? {}), ...(schemaObj.properties ?? {}) };
    o.required = Array.from(
      new Set((o.required ?? []).concat(schemaObj.required ?? [])),
    );

    if (schemaObj[xOf]) {
      schemaObj[xOf].forEach((s) =>
        this.discriminatorTraverse(schemaObj, s, o),
      );
    } else if (schemaObj) {
      const ancestor: any = parent;
      const option =
        this.findKey(
          ancestor.discriminator?.mapping,
          (value) => value === schema['$ref'],
        ) || this.getKeyFromRef(schema['$ref']);

      if (option) {
        const newSchema = JSON.parse(JSON.stringify(schemaObj));
        newSchema.properties = {
          ...(o.properties ?? {}),
          ...(newSchema.properties ?? {}),
        };
        newSchema.required = o.required;
        if (newSchema.required.length === 0) {
          delete newSchema.required;
        }
        ancestor._discriminator ??= {
          validators: {},
          options: o.options,
          property: o.discriminator,
        };
        ancestor._discriminator.validators[option] = this.ajv.compile(
          newSchema,
        );
      }
      //reset data
      o.properties = {};
      delete o.required;
    }
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
    }
  }

  private findKey(object, searchFunc) {
    if (!object) {
      return;
    }
    const keys = Object.keys(object);
    for (let i = 0; i < keys.length; i++) {
      if (searchFunc(object[keys[i]])) {
        return keys[i];
      }
    }
  }
  getKeyFromRef(ref) {
    return ref.split('/components/schemas/')[1];
  }
}
