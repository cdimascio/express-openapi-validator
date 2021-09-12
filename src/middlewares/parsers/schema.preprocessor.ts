import { Ajv } from 'ajv';
import ajv = require('ajv');
import * as cloneDeep from 'lodash.clonedeep';
import * as _get from 'lodash.get';
import { createRequestAjv } from '../../framework/ajv';
import {
  OpenAPIV3,
  SerDesMap,
  Options,
  ValidateResponseOpts,
} from '../../framework/types';

interface TraversalStates {
  req: TraversalState;
  res: TraversalState;
}

interface TraversalState {
  discriminator: object;
  kind: 'req' | 'res';
  path: string[];
}

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
  public readonly path: string[];
  public readonly parent: P;
  public readonly schema: T;
  constructor(parent: P, schema: T, path: string[]) {
    this.path = path;
    this.parent = parent;
    this.schema = schema;
  }
}
type SchemaObjectNode = Node<SchemaObject, SchemaObject>;

class Root<T> extends Node<T, T> {
  constructor(schema: T, path: string[]) {
    super(null, schema, path);
  }
}

type SchemaObject = OpenAPIV3.SchemaObject;
type ReferenceObject = OpenAPIV3.ReferenceObject;
type Schema = ReferenceObject | SchemaObject;

if (!Array.prototype['flatMap']) {
  // polyfill flatMap
  // TODO remove me when dropping node 10 support
  Array.prototype['flatMap'] = function (lambda) {
    return Array.prototype.concat.apply([], this.map(lambda));
  };
  Object.defineProperty(Array.prototype, 'flatMap', { enumerable: false });
}
export const httpMethods = new Set([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
]);
export class SchemaPreprocessor {
  private ajv: Ajv;
  private apiDoc: OpenAPIV3.Document;
  private apiDocRes: OpenAPIV3.Document;
  private serDesMap: SerDesMap;
  private responseOpts: ValidateResponseOpts;
  constructor(
    apiDoc: OpenAPIV3.Document,
    ajvOptions: Options,
    validateResponsesOpts: ValidateResponseOpts,
  ) {
    this.ajv = createRequestAjv(apiDoc, ajvOptions);
    this.apiDoc = apiDoc;
    this.serDesMap = ajvOptions.serDesMap;
    this.responseOpts = validateResponsesOpts;
  }

  public preProcess() {
    const componentSchemas = this.gatherComponentSchemaNodes();
    const r = this.gatherSchemaNodesFromPaths();

    // Now that we've processed paths, clone a response spec if we are validating responses
    this.apiDocRes = !!this.responseOpts ? cloneDeep(this.apiDoc) : null;

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
      const path = ['components', 'schemas', id];
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
          const path = ['paths', p, method];
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

  /**
   * Traverse the schema starting at each node in nodes
   * @param nodes the nodes to traverse
   * @param visit a function to invoke per node
   */
  private traverseSchemas(nodes: TopLevelSchemaNodes, visit) {
    const seen = new Set();
    const recurse = (parent, node, opts: TraversalStates) => {
      const schema = node.schema;

      if (!schema || seen.has(schema)) return;

      seen.add(schema);

      if (schema.$ref) {
        const resolvedSchema = this.resolveSchema<SchemaObject>(schema);
        const path = schema.$ref.split('/').slice(1);

        (<any>opts).req.originalSchema = schema;
        (<any>opts).res.originalSchema = schema;

        visit(parent, node, opts);
        recurse(node, new Node(schema, resolvedSchema, path), opts);
        return;
      }

      // Save the original schema so we can check if it was a $ref
      (<any>opts).req.originalSchema = schema;
      (<any>opts).res.originalSchema = schema;

      visit(parent, node, opts);

      if (schema.allOf) {
        schema.allOf.forEach((s, i) => {
          const child = new Node(node, s, [...node.path, 'allOf', i + '']);
          recurse(node, child, opts);
        });
      } else if (schema.oneOf) {
        schema.oneOf.forEach((s, i) => {
          const child = new Node(node, s, [...node.path, 'oneOf', i + '']);
          recurse(node, child, opts);
        });
      } else if (schema.anyOf) {
        schema.anyOf.forEach((s, i) => {
          const child = new Node(node, s, [...node.path, 'anyOf', i + '']);
          recurse(node, child, opts);
        });
      } else if (schema.properties) {
        Object.entries(schema.properties).forEach(([id, cschema]) => {
          const path = [...node.path, 'properties', id];
          const child = new Node(node, cschema, path);
          recurse(node, child, opts);
        });
      }
    };

    const initOpts = (): TraversalStates => ({
      req: { discriminator: {}, kind: 'req', path: [] },
      res: { discriminator: {}, kind: 'res', path: [] },
    });

    for (const node of nodes.schemas) {
      recurse(null, node, initOpts());
    }

    for (const node of nodes.requestBodies) {
      recurse(null, node, initOpts());
    }

    for (const node of nodes.responses) {
      recurse(null, node, initOpts());
    }
  }

  private schemaVisitor(
    parent: SchemaObjectNode,
    node: SchemaObjectNode,
    opts: TraversalStates,
  ) {
    const pschemas = [parent?.schema];
    const nschemas = [node.schema];

    if (this.apiDocRes) {
      const p = _get(this.apiDocRes, parent?.path);
      const n = _get(this.apiDocRes, node?.path);
      pschemas.push(p);
      nschemas.push(n);
    }

    // visit the node in both the request and response schema
    for (let i = 0; i < nschemas.length; i++) {
      const kind = i === 0 ? 'req' : 'res';
      const pschema = pschemas[i];
      const nschema = nschemas[i];
      const options = opts[kind];
      options.path = node.path;

      if (nschema) {
        // This null check should no longer be necessary
        this.handleSerDes(pschema, nschema, options);
        this.handleReadonly(pschema, nschema, options);
        this.processDiscriminator(pschema, nschema, options);
      }
    }
  }

  private processDiscriminator(parent: Schema, schema: Schema, opts: any = {}) {
    const o = opts.discriminator;
    const schemaObj = <SchemaObject>schema;
    const xOf = schemaObj.oneOf ? 'oneOf' : schemaObj.anyOf ? 'anyOf' : null;

    if (xOf && schemaObj?.discriminator?.propertyName && !o.discriminator) {
      const options = schemaObj[xOf].flatMap((refObject) => {
        if (refObject['$ref'] === undefined) {
          return [];
        }
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

        const newProperties = {
          ...(o.properties ?? {}),
          ...(newSchema.properties ?? {}),
        };
        if(Object.keys(newProperties).length > 0) {
          newSchema.properties = newProperties;
        }

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
          ancestor._discriminator.validators[option] =
            this.ajv.compile(newSchema);
        }
      }
      //reset data
      o.properties = {};
      delete o.required;
    }
  }

  private handleSerDes(
    parent: SchemaObject,
    schema: SchemaObject,
    state: TraversalState,
  ) {
    if (
      schema.type === 'string' &&
      !!schema.format &&
      this.serDesMap[schema.format]
    ) {
      (<any>schema).type = [this.serDesMap[schema.format].jsonType || 'object', 'string'];
      schema['x-eov-serdes'] = this.serDesMap[schema.format];
    }
  }

  private handleReadonly(
    parent: OpenAPIV3.SchemaObject,
    schema: OpenAPIV3.SchemaObject,
    opts,
  ) {
    if (opts.kind === 'res') return;

    const required = parent?.required ?? [];
    const prop = opts?.path?.[opts?.path?.length - 1];
    const index = required.indexOf(prop);
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
      const mediaTypeSchema = this.resolveSchema<SchemaObject>(
        mediaTypeObject.schema,
      );
      op.requestBody.content[type].schema = mediaTypeSchema;
      const path = [...node.path, 'requestBody', 'content', type, 'schema'];
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
      if (!rschema) {
        // issue #553
        // TODO the schema failed to resolve.
        // This can occur with multi-file specs
        // improve resolution, so that rschema resolves (use json ref parser?)
        continue;
      }
      responses[statusCode] = rschema;

      if (rschema.content) {
        for (const [type, mediaType] of Object.entries(rschema.content)) {
          const schema = this.resolveSchema<SchemaObject>(mediaType?.schema);
          if (schema) {
            rschema.content[type].schema = schema;
            const path = [
              ...node.path,
              'responses',
              statusCode,
              'content',
              type,
              'schema',
            ];
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

    const match = (
      pathParam: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject,
      opParam: OpenAPIV3.ReferenceObject | OpenAPIV3.OperationObject,
    ) =>
      // if name or ref exists and are equal
      (opParam['name'] && opParam['name'] === pathParam['name']) ||
      (opParam['$ref'] && opParam['$ref'] === pathParam['$ref']);

    // Add Path level query param to list ONLY if there is not already an operation-level query param by the same name.
    for (const param of parameters) {
      if (!v.parameters.some((vparam) => match(param, vparam))) {
        v.parameters.push(param);
      }
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
