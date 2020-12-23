import { Ajv } from 'ajv';
import ajv = require('ajv');
import * as _get from 'lodash.get';
import { createRequestAjv } from '../../framework/ajv';
import { OpenAPIV3, BodySchema } from '../../framework/types';

const dateTime = {
  deserialize: (s) => new Date(s),
  serialize: (d) => d.toISOString(),
};

type SchemaObject = OpenAPIV3.SchemaObject;
type ReferenceObject = OpenAPIV3.ReferenceObject;
type Schema = ReferenceObject | SchemaObject;

if (!Array.prototype['flatMap']) {
  // polyfill flatMap
  // TODO remove me when dropping node 10 support
  Array.prototype['flatMap'] = function (lambda) {
    return Array.prototype.concat.apply([], this.map(lambda));
  };
}
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
    // collect all component schemas
    const componentSchemas = this.apiDoc?.components?.schemas ?? [];
    const schemas = Object.values(componentSchemas);
    // process paths, and collect all path schemas
    // e.g. requestBodies, responses, parameters -- TODO response and parameters
    const r = this.processPaths();
    schemas.push(...r.requestBodySchemas);
    this.traverseComponentSchemas(schemas, (parent, schema, opts) =>
      this.schemaVisitor(parent, schema, opts),
    );
  }

  private processPaths() {
    const paths = Object.entries(this.apiDoc.paths);
    const requestBodySchemas = [];
    const responseSchemas = [];
    for (const [_, pi] of paths) {
      const pathItem = this.resolveSchema<OpenAPIV3.PathItemObject>(pi);
      for (const method of Object.keys(pathItem)) {
        if (httpMethods.has(method)) {
          const operation = <OpenAPIV3.OperationObject>pathItem[method];
          // Adds path declared parameters to the schema's parameters list
          this.preprocessPathLevelParameters(method, pathItem);
          requestBodySchemas.push(...this.extractRequestBodySchemas(operation));
          responseSchemas.push(...this.extractResponseSchemas(operation));
        }
      }
    }
    return {
      requestBodySchemas,
      responseSchemas,
    };
  }

  private traverseComponentSchemas(schemas, visit) {
    const recurse = (parent, dschema, opts?) => {
      const schema = this.resolveSchema<SchemaObject>(dschema);
      // TODO check if we revisit nodes, if so mark them
      // Save the original schema so we can check if it was a $ref
      opts.originalSchema = dschema;

      visit(parent, schema, opts);

      if (schema.allOf) {
        schema.allOf.forEach((s) => recurse(schema, s, opts));
      } else if (schema.oneOf) {
        schema.oneOf.forEach((s) => recurse(schema, s, opts));
      } else if (schema.anyOf) {
        schema.anyOf.forEach((s) => recurse(schema, s, opts));
      } else if (schema.properties) {
        this.processDiscriminator(parent, schema, opts); // TODO visit schema?
        Object.entries(schema.properties).forEach(([id, dschema]) => {
          recurse(schema, dschema, { ...opts, id });
        });
      }
    };
    for (const schema of schemas) {
      recurse(null, schema, { discriminator: {} });
    }
  }

  private schemaVisitor(parent, schema, opts) {
    this.registerFormatSerDes(parent, schema);
    this.handleReadonly(parent, schema, opts);
    this.processDiscriminator(parent, schema, opts);
  }

  private processDiscriminator(parent: Schema, schema: Schema, opts: any = {}) {
    const o = opts.discriminator;
    const schemaObj = <SchemaObject>schema;
    const xOf = schemaObj.oneOf ? 'oneOf' : schemaObj.anyOf ? 'anyOf' : null;
    // if (xOf && schemaObj?.discriminator?.propertyName && !o.discriminator) {
    //   const options = schemaObj[xOf].map((refObject) => {
    //     const option = this.findKey(
    // const xOf = schemaObj.oneOf ? 'oneOf' : 'anyOf';
    if (xOf && schemaObj?.discriminator?.propertyName && !o.discriminator) {
      const options = schemaObj[xOf].flatMap((refObject) => {
        const keys = this.findKeys(
          schemaObj.discriminator.mapping,
          (value) => value === refObject['$ref'],
        );
        const ref = this.getKeyFromRef(refObject['$ref']);
        return keys.length > 0
          ? keys.map((option) => ({ option, ref }))
          : [{ option: ref, ref }];
      });
      o.options = options;
      o.discriminator = schemaObj.discriminator?.propertyName;
      o.properties = {
        ...(o.properties ?? {}),
        ...(schemaObj.properties ?? {}),
      };
      o.required = Array.from(
        new Set((o.required ?? []).concat(schemaObj.required ?? [])),
      );
    }

    if (xOf) return;

    if (o.discriminator) {
      o.properties = {
        ...(o.properties ?? {}),
        ...(schemaObj.properties ?? {}),
      };
      o.required = Array.from(
        new Set((o.required ?? []).concat(schemaObj.required ?? [])),
      );

      const ancestor: any = parent;
      const ref = opts.originalSchema.$ref;

      if (!ref) return;

      const options = this.findKeys(
        ancestor.discriminator?.mapping,
        (value) => value === ref,
      );
      const refName = this.getKeyFromRef(ref);
      if (options.length === 0 && ref) {
        options.push(refName);
      }

      if (options.length > 0) {
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

        for (const option of options) {
          ancestor._discriminator.validators[option] = this.ajv.compile(
            newSchema,
          );
        }
      }
      //reset data
      o.properties = {};
      delete o.required;
    }
  }

  private registerFormatSerDes(_: string, schema: OpenAPIV3.SchemaObject) {
    if (schema.type === 'string' && !!schema.format) {
      switch (schema.format) {
        case 'date-time':
        case 'full-date':
          schema.schemaObjectFunctions = dateTime;
          console.log(schema);
      }
    }
  }

  private handleReadonly(
    parent: OpenAPIV3.SchemaObject,
    schema: OpenAPIV3.SchemaObject,
    opts,
  ) {
    const required = parent?.required ?? [];
    const index = required.indexOf(opts?.id);
    if (schema.readOnly && index > -1) {
      // remove required if readOnly
      parent.required = required
        .slice(0, index)
        .concat(required.slice(index + 1));
      if (parent.required.length === 0) {
        delete parent.required;
      }
    }
  }

  /**
   * extract all requestBodies' schemas from an operation
   * @param op
   */
  private extractRequestBodySchemas(op: OpenAPIV3.OperationObject): Schema[] {
    const ref = (<OpenAPIV3.ReferenceObject>op.requestBody)?.['$ref'];
    let bodySchema: OpenAPIV3.RequestBodyObject;
    if (ref) {
      const requestBodies = this.apiDoc.components?.requestBodies;
      const id = ref.split('/').pop();
      bodySchema = <OpenAPIV3.RequestBodyObject>requestBodies?.[id];
      op.requestBody = bodySchema;
    } else {
      bodySchema = <OpenAPIV3.RequestBodyObject>op.requestBody;
    }

    if (!bodySchema?.content) return [];

    const result: Schema[] = [];
    const contentEntries = Object.entries(bodySchema.content);
    for (const [_, mediaTypeObject] of contentEntries) {
      result.push(mediaTypeObject.schema);
    }
    return result;
  }

  private extractResponseSchemas(op: OpenAPIV3.OperationObject): Schema[] {
    const responses = op.responses;
    if (!responses) return;

    const responseEntries = Object.entries(responses);
    const schemas: OpenAPIV3.SchemaObject[] = [];
    for (const [statusCode, response] of responseEntries) {
      const ref = (<OpenAPIV3.ReferenceObject>response)?.['$ref'];
      let responseSchema: OpenAPIV3.ResponseObject;
      if (ref) {
        const componentResponses = this.apiDoc.components?.responses;
        const refName = ref.split('/').pop();
        responseSchema = <OpenAPIV3.ResponseObject>(
          componentResponses?.[refName]
        );
        responses[statusCode] = responseSchema;
      } else {
        responseSchema = <OpenAPIV3.ResponseObject>response;
      }
      if (responseSchema.content) {
        for (const [_, mediaType] of Object.entries(responseSchema.content)) {
          const schema = this.resolveSchema<SchemaObject>(mediaType?.schema);
          if (schema) schemas.push(schema);
        }
      }
    }
    return schemas;
  }

  private resolveSchema<T>(schema): T {
    if (!schema) return null;
    const ref = schema?.['$ref'];
    let res = (ref ? this.ajv.getSchema(ref)?.schema : schema) as T;
    if (ref && !res) {
      const path = ref.split('/').join('.');
      const p = path.substring(path.indexOf('.') + 1);
      res = _get(this.apiDoc, p);
    }
    return res;
  }
  /**
   * add path level parameters to the schema's parameters list
   * @param pathItemKey
   * @param pathItem
   */
  private preprocessPathLevelParameters(
    pathItemKey: string,
    pathItem: OpenAPIV3.PathItemObject,
  ) {
    const parameters = pathItem.parameters ?? [];

    if (parameters.length === 0) return;

    const v = this.resolveSchema<OpenAPIV3.OperationObject>(pathItem[pathItemKey]);
    if (v === parameters) return
    v.parameters = v.parameters || [];

    for (const param of parameters) {
      v.parameters.push(param);
    }
  }

  private traverse(schema: Schema, f: (p, s) => void) {
    const schemaObj = this.resolveSchema<SchemaObject>(schema);
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

  private findKeys(object, searchFunc): string[] {
    const matches = [];
    if (!object) {
      return matches;
    }
    const keys = Object.keys(object);
    for (let i = 0; i < keys.length; i++) {
      if (searchFunc(object[keys[i]])) {
        matches.push(keys[i]);
      }
    }
    return matches;
  }

  getKeyFromRef(ref) {
    return ref.split('/components/schemas/')[1];
  }
}
