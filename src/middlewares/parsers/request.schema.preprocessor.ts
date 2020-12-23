import { Ajv } from 'ajv';
import ajv = require('ajv');
import * as cloneDeep from 'lodash.clonedeep';
import * as _get from 'lodash.get';
import { createRequestAjv } from '../../framework/ajv';
import { OpenAPIV3, BodySchema } from '../../framework/types';

interface TopLevelPathNodes {
  requestBodies: Root<SchemaObject>[];
  responses: Root<SchemaObject>[];
}
interface TopLevelSchemaNodes extends TopLevelPathNodes {
  schemas: Root<SchemaObject>[];
  requestBodies: Root<SchemaObject>[];
  responses: Root<SchemaObject>[];
}

class Node<T, P> {
  public readonly path: string;
  public readonly parent: P;
  public readonly schema: T;
  constructor(parent, schema, path) {
    this.path = path;
    this.parent = parent;
    this.schema = schema;
  }
}

class Root<T> extends Node<T, T> {
  constructor(schema, path) {
    super(null, schema, path);
  }
}

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
  private apiDocRes: OpenAPIV3.Document;
  private responseCopy: boolean;
  constructor(
    apiDoc: OpenAPIV3.Document,
    options: ajv.Options,
    responseCopy: boolean,
  ) {
    this.ajv = createRequestAjv(apiDoc, options);
    this.apiDoc = apiDoc;
    this.responseCopy = responseCopy;
  }

  public preProcess() {
    const componentSchemas = this.gatherComponentSchemaNodes();
    const r = this.gatherSchemaNodesFromPaths();

    // Now that we've processed paths, clonse the spec
    this.apiDocRes = this.responseCopy ? cloneDeep(this.apiDoc) : null;

    const schemaNodes = {
      schemas: componentSchemas,
      requestBodies: r.requestBodies,
      responses: r.responses,
    };
  
    // Traverse the schemas
    this.traverseSchemas(schemaNodes, (parent, schema, opts) =>
      this.schemaVisitor(parent, schema, opts),
    );

    return {
      apiDoc: this.apiDoc,
      apiDocRes: this.apiDocRes,
    };
  }

  private gatherComponentSchemaNodes(): Root<SchemaObject>[] {
    const nodes = [];
    const componentSchemaMap = this.apiDoc?.components?.schemas ?? [];
    for (const [id, s] of Object.entries(componentSchemaMap)) {
      const schema = this.resolveSchema<SchemaObject>(s);
      this.apiDoc.components.schemas[id] = schema;
      const path = `components.schemas.${id}`;
      const node = new Root(schema, path);
      nodes.push(node);
    }
    return nodes;
  }

  private gatherSchemaNodesFromPaths(): TopLevelPathNodes {
    const requestBodySchemas = [];
    const responseSchemas = [];

    for (const [p, pi] of Object.entries(this.apiDoc.paths)) {
      const pathItem = this.resolveSchema<OpenAPIV3.PathItemObject>(pi);
      for (const method of Object.keys(pathItem)) {
        if (httpMethods.has(method)) {
          const operation = <OpenAPIV3.OperationObject>pathItem[method];
          // Adds path declared parameters to the schema's parameters list
          this.preprocessPathLevelParameters(method, pathItem);
          const path = `paths.${p}.${method}`;
          const node = new Root<OpenAPIV3.OperationObject>(operation, path);
          const requestBodies = this.extractRequestBodySchemaNodes(node);
          const responseBodies = this.extractResponseSchemaNodes(node);

          requestBodySchemas.push(...requestBodies);
          responseSchemas.push(...responseBodies);
        }
      }
    }
    return {
      requestBodies: requestBodySchemas,
      responses: responseSchemas,
    };
  }

  private traverseSchemas(nodes: TopLevelSchemaNodes, visit) {
    const recurse = (parent, node, opts?) => {
      const schema = this.resolveSchema<SchemaObject>(node.schema);
      // Save the original schema so we can check if it was a $ref
      opts.originalSchema = node.schema;

      // TODO mark visited, and skip visited
      // TODO Visit api docs
      visit(parent, node, opts);

      if (schema.allOf) {
        schema.allOf.forEach((s) => {
          const child = new Node(node, s, `${node.path}.allOf`);
          recurse(node, child, opts);
        });
      } else if (schema.oneOf) {
        schema.oneOf.forEach((s) => {
          const child = new Node(node, s, `${node.path}.oneOf`);
          recurse(node, child, opts);
        });
      } else if (schema.anyOf) {
        schema.anyOf.forEach((s) => {
          const child = new Node(node, s, `${node.path}.anyOf`);
          recurse(node, child, opts);
        });
      } else if (node.schema.properties) {
        this.processDiscriminator(parent?.schema, node.schema, opts); // TODO visit schema? -- need to update both
        Object.entries(node.schema.properties).forEach(([id, cschema]) => {
          const child = new Node(node, cschema, `${node.path}.properties.${id}`);
          recurse(node, child, { ...opts, id });
        });
      }
    };

    for (const node of nodes.schemas) {
      recurse(null, node, { discriminator: {} });
    }

    for (const node of nodes.requestBodies) {
      recurse(null, node, { discriminator: {} });
    }

    for (const node of nodes.responses) {
      recurse(null, node, { discriminator: {} });
    }
  }

  private schemaVisitor(parent, node, opts) {
    const pschema = parent?.schema
    const schema = node.schema;
    this.registerFormatSerDes(pschema, schema);
    this.handleReadonly(pschema, schema, opts);
    this.processDiscriminator(pschema, schema, opts);
  }

  private processDiscriminator(parent: Schema, schema: Schema, opts: any = {}) {
    const o = opts.discriminator;
    const schemaObj = <SchemaObject>schema;
    const xOf = schemaObj.oneOf ? 'oneOf' : schemaObj.anyOf ? 'anyOf' : null;

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
  private extractRequestBodySchemaNodes(
    node: Root<OpenAPIV3.OperationObject>,
  ): Root<SchemaObject>[] {
    const op = node.schema;
    const bodySchema = this.resolveSchema<OpenAPIV3.RequestBodyObject>(
      op.requestBody,
    );
    op.requestBody = bodySchema;

    if (!bodySchema?.content) return [];

    const result: Root<SchemaObject>[] = [];
    const contentEntries = Object.entries(bodySchema.content);
    for (const [type, mediaTypeObject] of contentEntries) {
      const mediaTypeSchema = this.resolveSchema<SchemaObject>(mediaTypeObject.schema);
      op.requestBody.content[type].schema = mediaTypeSchema;
      const path = `${node.path}.requestBody.content.${type}`;
      result.push(new Root(mediaTypeSchema, path));
    }
    return result;
  }

  private extractResponseSchemaNodes(
    node: Root<OpenAPIV3.OperationObject>,
  ): Root<SchemaObject>[] {
    const op = node.schema;
    const responses = op.responses;

    if (!responses) return;

    const schemas: Root<SchemaObject>[] = [];
    for (const [statusCode, response] of Object.entries(responses)) {
      const rschema = this.resolveSchema<OpenAPIV3.ResponseObject>(response);
      responses[statusCode] = rschema;

      if (rschema.content) {
        for (const [type, mediaType] of Object.entries(rschema.content)) {
          const schema = this.resolveSchema<SchemaObject>(mediaType?.schema);
          if (schema) {
            rschema.content[type].schema = schema;
            const path = `${node.path}.responses.${statusCode}.content.${type}`;
            schemas.push(new Root(schema, path));
          }
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

    const v = this.resolveSchema<OpenAPIV3.OperationObject>(
      pathItem[pathItemKey],
    );
    if (v === parameters) return;
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
