import Ajv from 'ajv';
import * as cloneDeep from 'lodash.clonedeep';
import * as _get from 'lodash.get';
import { createRequestAjv, createResponseAjv } from '../../framework/ajv';
import { buildAsyncFormats } from '../../framework/ajv/async-util';
import { buildSchemasWithAsync } from '../../framework/ajv/async-util';
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
  private responseAjv: Ajv;
  private apiDoc: OpenAPIV3.Document;
  private apiDocRes: OpenAPIV3.Document;
  private serDesMap: SerDesMap;
  private responseOpts: ValidateResponseOpts;
  private ajvOptions: Options;
  constructor(
    apiDoc: OpenAPIV3.Document,
    ajvOptions: Options,
    validateResponsesOpts: false | ValidateResponseOpts,
  ) {
    // Start out with a pure copy of the api doc
    this.apiDoc = cloneDeep(apiDoc);
    this.ajv = createRequestAjv(this.apiDoc, ajvOptions);

    if (validateResponsesOpts) {
      this.apiDocRes = cloneDeep(apiDoc);
      this.responseAjv = createResponseAjv(this.apiDocRes, ajvOptions);
      this.responseOpts = validateResponsesOpts;
    }

    this.serDesMap = ajvOptions.serDesMap;
    this.ajvOptions = ajvOptions;
  }

  public preProcess() {
    this.mutateApiDocWithAjv(this.ajv, this.apiDoc, 'req');
    if (this.apiDoc?.components?.schemas) {
      // Only mutate components to contain $async in the request apiDoc.
      this.apiDoc.components.schemas = buildSchemasWithAsync(
        buildAsyncFormats(this.ajvOptions),
        this.apiDoc?.components.schemas
      );
    }
    if (this.apiDocRes) {
      this.mutateApiDocWithAjv(this.responseAjv, this.apiDocRes, 'res');
    }
    return {
      apiDoc: this.apiDoc,
      apiDocRes: this.apiDocRes,
    };
  }

  private mutateApiDocWithAjv(ajv: Ajv, apiDoc: OpenAPIV3.Document, kind: string) {
    const componentSchemas = this.gatherComponentSchemaNodes(ajv, apiDoc);
    const r = this.gatherSchemaNodesFromPaths(ajv, apiDoc);

    const schemaNodes = {
      schemas: componentSchemas,
      requestBodies: r.requestBodies,
      responses: r.responses,
    };

    // Traverse the schemas
    this.traverseSchemas(
      schemaNodes,
      (parent, schema, opts) => this.schemaVisitor(parent, schema, opts, kind, ajv),
      ajv,
      apiDoc
    );
  }

  /**
   * Sets ajv instance's component schema refs to the apiDoc's.
   * Gets a list of component schema nodes.
   */
  private gatherComponentSchemaNodes(ajv: Ajv, apiDoc: OpenAPIV3.Document): Root<SchemaObject>[] {
    const nodes = [];
    const componentSchemaMap = apiDoc?.components?.schemas ?? [];
    for (const [id, s] of Object.entries(componentSchemaMap)) {
      const schema = this.resolveSchema<SchemaObject>(s, ajv, apiDoc);
      apiDoc.components.schemas[id] =  schema;
      const path = ['components', 'schemas', id];
      const node = new Root(schema, path);
      nodes.push(node);
    }
    return nodes;
  }

  /**
   * Gets all request bodies and response schemas
   */
  private gatherSchemaNodesFromPaths(ajv: Ajv, apiDoc: OpenAPIV3.Document): TopLevelPathNodes {
    const requestBodySchemas = [];
    const responseSchemas = [];

    for (const [p, pi] of Object.entries(apiDoc.paths)) {
      const pathItem = this.resolveSchema<OpenAPIV3.PathItemObject>(pi, ajv, apiDoc);
      for (const method of Object.keys(pathItem)) {
        if (httpMethods.has(method)) {
          const operation = <OpenAPIV3.OperationObject>pathItem[method];
          // Adds path declared parameters to the schema's parameters list
          this.preprocessPathLevelParameters(method, pathItem, ajv, apiDoc);
          const path = ['paths', p, method];
          const node = new Root<OpenAPIV3.OperationObject>(operation, path);
          const requestBodies = this.extractRequestBodySchemaNodes(node, ajv, apiDoc);
          const responseBodies = this.extractResponseSchemaNodes(node, ajv, apiDoc);

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
  private traverseSchemas(nodes: TopLevelSchemaNodes, visit, ajv: Ajv, apiDoc: OpenAPIV3.Document) {
    const seen = new Set();
    const recurse = (parent, node, opts: TraversalStates) => {
      const schema = node.schema;

      if (!schema || seen.has(schema)) return;

      seen.add(schema);

      if (schema.$ref) {
        const resolvedSchema = this.resolveSchema<SchemaObject>(schema, ajv, apiDoc);
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
    kind: string,
    ajv: Ajv
  ) {
    const pschema = parent?.schema;
    const nschema = node.schema;

    const options = opts[kind];
    options.path = node.path;

    if (nschema) {
      this.handleSerDes(pschema, nschema, options);
      this.handleReadonly(pschema, nschema, options);
      this.updateAjvAfterTampering(node, ajv);

      this.processDiscriminator(pschema, nschema, options, ajv);
    }
  }

  /**
   * Updates ajv with latest node schema so calls to this.resolveSchema
   * will return schema's that reflect latest tampering for serdes/readOnly.
   */
  private updateAjvAfterTampering(node: SchemaObjectNode, ajv: Ajv) {
    if (node.path && node.path[0] === 'components' && node.path.length === 3) {
      const key = `#/${node.path.join('/')}`;
      const ajvSchema =  ajv.getSchema(key)?.schema;
      // Be sure not to lose the $async values if they were set for the schemas already.
      const $async = (ajvSchema && ajvSchema['$async']) ?? undefined;
      node.schema['$async'] = $async;
      ajv.removeSchema(key);
      /**
       * If this uses a new object, i.e.  {...node.schema, $async}
       * then a very subtle assumption in processDiscriminator is violated
       * such that one of the discriminator validator schemas gets a bad reference
       * Causes failures in some of the oneOf tests.
       *
       * If this class does ever become entirely functional w/ no side effects,
       * this will be one thing to fix.
       */
      ajv.addSchema(node.schema, key);
    }
  }

  /**
   * Custom processing on discriminators.
   * Looks at the discriminator to handle "properties", "required" and configure
   * ajv for proper validation. May not be needed anymore with v7 discriminator support in ajv.
   */
  private processDiscriminator(parent: Schema, schema: Schema, opts: any = {}, ajv: Ajv) {
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

        // Expose `_discriminator` to consumers without exposing to AJV
        Object.defineProperty(ancestor, '_discriminator', {
          enumerable: false,
          value: ancestor._discriminator ?? {
            validators: {},
            options: o.options,
            property: o.discriminator,
          },
        });

        for (const option of options) {
          ancestor._discriminator.validators[option] =
            ajv.compile(newSchema);
        }
      }
      //reset data
      o.properties = {};
      delete o.required;
    }
  }

  /**
   * Attach custom `x-eov-*-serdes` vendor extension for performing
   * serialization (response) and deserialization (request) of data.
   *
   * This only applies to `type=string` schemas with a `format` that was flagged for serdes.
   *
   * The goal of this function is to define a JSON schema that:
   * 1) Only performs the method for matching req/res (e.g. never deserialize a response)
   * 2) Validates initial data THEN performs serdes THEN validates output. In that order.
   * 3) Hide internal schema keywords (and its validation errors) from user.
   *
   * The solution is in three parts:
   * 1) Remove the `type` keywords and replace it with a custom clone `x-eov-type`.
   *    This ensures that we control the order of type validations,
   *    and allows the response serialization to occur before AJV enforces the type.
   * 2) Add an `x-eov-req-serdes` keyword.
   *    This keyword will deserialize the request string AFTER all other validations occur,
   *    ensuring that the string is valid before modifications.
   *    This keyword is only attached when deserialization is enabled.
   * 3) Add an `x-eov-res-serdes` keyword.
   *    This keyword will serialize the response object BEFORE any other validations occur,
   *    ensuring the output is validated as a string.
   *    This keyword is only attached when serialization is enabled.
   * 4) If `nullable` is set, set the type as every possible type.
   *    Then initial type checking will _always_ pass and the `x-eov-type` will narrow it down later.
   *
   * See [`createAjv`](../../framework/ajv/index.ts) for custom keyword definitions.
   *
   * @param {object} parent - parent schema
   * @param {object} schema - schema
   * @param {object} state - traversal state
   */
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
      const serDes = this.serDesMap[schema.format];
      (<any>schema)['x-eov-type'] = schema.type;
      if ('nullable' in schema) {
        // Ajv requires `type` keyword with `nullable` (regardless of value).
        (<any>schema).type = ['string', 'number', 'boolean', 'object', 'array'];
      } else {
        delete schema.type;
      }
      if (serDes.deserialize) {
        if (serDes.async) {
          schema['x-eov-req-serdes-async'] = serDes;
          if (schema['x-eov-req-serdes']) {
            throw new Error('Cannot have async and sync req serdes.');
          }
        } else {
          schema['x-eov-req-serdes'] = serDes;
        }
      }
      if (serDes.serialize) {
        schema['x-eov-res-serdes'] = serDes;
      }
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
   */
  private extractRequestBodySchemaNodes(
    node: Root<OpenAPIV3.OperationObject>,
    ajv: Ajv,
    apiDoc: OpenAPIV3.Document
  ): Root<SchemaObject>[] {
    const op = node.schema;
    const bodySchema = this.resolveSchema<OpenAPIV3.RequestBodyObject>(
      op.requestBody,
      ajv,
      apiDoc
    );
    op.requestBody = bodySchema;

    if (!bodySchema?.content) return [];

    const result: Root<SchemaObject>[] = [];
    const contentEntries = Object.entries(bodySchema.content);
    for (const [type, mediaTypeObject] of contentEntries) {
      const mediaTypeSchema = this.resolveSchema<SchemaObject>(
        mediaTypeObject.schema,
        ajv,
        apiDoc
      );
      op.requestBody.content[type].schema = mediaTypeSchema;
      const path = [...node.path, 'requestBody', 'content', type, 'schema'];
      result.push(new Root(mediaTypeSchema, path));
    }
    return result;
  }

  private extractResponseSchemaNodes(
    node: Root<OpenAPIV3.OperationObject>,
    ajv: Ajv,
    apiDoc: OpenAPIV3.Document
  ): Root<SchemaObject>[] {
    const op = node.schema;
    const responses = op.responses;

    if (!responses) return;

    const schemas: Root<SchemaObject>[] = [];
    for (const [statusCode, response] of Object.entries(responses)) {
      const rschema = this.resolveSchema<OpenAPIV3.ResponseObject>(response, ajv, apiDoc);
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
          const schema = this.resolveSchema<SchemaObject>(mediaType?.schema, ajv, apiDoc);
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

  private resolveSchema<T>(schema, ajv, apiDoc): T {
    if (!schema) return null;
    const ref = schema?.['$ref'];
    try {
      let res = (ref ? ajv.getSchema(ref)?.schema : schema) as T;
      if (ref && !res) {
        const path = ref.split('/').join('.');
        const p = path.substring(path.indexOf('.') + 1);
        res = _get(apiDoc, p);
      }
      return res;
    } catch (ex) {
      throw ex;
    }
  }
  /**
   * add path level parameters to the schema's parameters list
   * @param pathItemKey
   * @param pathItem
   */
  private preprocessPathLevelParameters(
    pathItemKey: string,
    pathItem: OpenAPIV3.PathItemObject,
    ajv: Ajv,
    apiDoc: OpenAPIV3.Document
  ) {
    const parameters = pathItem.parameters ?? [];

    if (parameters.length === 0) return;

    const v = this.resolveSchema<OpenAPIV3.OperationObject>(
      pathItem[pathItemKey],
      ajv,
      apiDoc
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
