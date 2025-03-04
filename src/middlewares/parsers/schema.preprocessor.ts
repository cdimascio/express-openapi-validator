import {
  OpenAPIV3,
  Options,
  SerDesMap,
  ValidateResponseOpts,
} from '../../framework/types';
import { createRequestAjv } from '../../framework/ajv';
import Ajv from 'ajv';
import * as _get from 'lodash.get';
import * as cloneDeep from 'lodash.clonedeep';

const HttpMethods = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
] as const;

export const httpMethods = new Set<string>(HttpMethods);

type VisitorObjects = {
  document: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1;
  components: OpenAPIV3.ComponentsObject;
  componentsV3_1: OpenAPIV3.ComponentsV3_1;
  pathItem: OpenAPIV3.PathItemObject | OpenAPIV3.ReferenceObject;
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
  operation: OpenAPIV3.OperationObject;
  requestBody: OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject;
  response: OpenAPIV3.ResponseObject | OpenAPIV3.ReferenceObject;
  encoding: OpenAPIV3.EncodingObject;
  header: OpenAPIV3.HeaderObject | OpenAPIV3.ReferenceObject;
  mediaType: OpenAPIV3.MediaTypeObject;
  parameter: OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject;
  callback: OpenAPIV3.CallbackObject | OpenAPIV3.ReferenceObject;
};

type VisitorTypes = keyof VisitorObjects;
type OpenAPIObject = VisitorObjects[VisitorTypes];

/** A union of all property keys of `Object` that have type `DesiredType`. */
type KeysWithMatchingValue<Object, DesiredKey> = {
  [Key in keyof Object]: Object[Key] extends DesiredKey
    ? DesiredKey extends Object[Key]
      ? Key
      : never
    : never;
}[keyof Object];

/** A wrapper type for `KeysWithMatchingValue` that fixes usage when `Object` is an optional type union. */
type KeysWithExactType<Object, DesiredType> = Object extends unknown
  ? KeysWithMatchingValue<Object, DesiredType>
  : never;

/** All `VisitorTypes` that also support `OpenAPIV3.ReferenceObject`s. */
type VisitorTypesWithReference = {
  [Key in keyof VisitorObjects]: VisitorObjects[Key] extends OpenAPIV3.ReferenceObject
    ? OpenAPIV3.ReferenceObject extends VisitorObjects[Key]
      ? Key
      : never
    : VisitorObjects[Key] extends OpenAPIV3.ReferenceObject | infer _Other
    ? OpenAPIV3.ReferenceObject extends VisitorObjects[Key]
      ? Key
      : never
    : never;
}[keyof VisitorObjects];

type DiscriminatorState = {
  discriminator?: string;
  options?: { option: any; ref: any }[];
  properties?: {
    [p: string]: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
  };
  required?: string[];
};

class VisitorNode<NodeType extends VisitorTypes> {
  public discriminator: DiscriminatorState = {};
  public originalRef?: string;

  constructor(
    public type: NodeType,
    public object: VisitorObjects[NodeType] | undefined,
    public path: string[],
  ) {}

  static fromParent<
    ParentType extends VisitorTypes,
    NodeType extends VisitorTypes,
    PropertyKey extends KeysWithExactType<
      VisitorObjects[ParentType],
      VisitorObjects[NodeType]
    >,
  >(
    parent: VisitorNode<ParentType>,
    type: NodeType,
    propertyPath?: PropertyKey,
  ): VisitorNode<NodeType> {
    propertyPath = propertyPath ?? (type as unknown as PropertyKey);

    return new VisitorNode(
      type,
      parent.object[propertyPath] as unknown as VisitorObjects[NodeType],
      [...parent.path, propertyPath],
    );
  }

  static fromParentDict<
    ParentType extends VisitorTypes,
    NodeType extends VisitorTypes,
    DictKey extends KeysWithExactType<
      VisitorObjects[ParentType],
      { [key: string]: VisitorObjects[NodeType] }
    >,
  >(
    parent: VisitorNode<ParentType>,
    type: NodeType,
    dictPath: DictKey,
  ): VisitorNode<NodeType>[] {
    if (parent.object[dictPath] === undefined) {
      return [];
    }

    const nodes: VisitorNode<NodeType>[] = [];
    const dict = parent.object[dictPath] as unknown as {
      [key: string]: VisitorObjects[NodeType];
    };

    forEachValue(dict, (value, key) => {
      nodes.push(new VisitorNode(type, value, [...parent.path, dictPath, key]));
    });

    return nodes;
  }

  static fromParentArray<
    ParentType extends VisitorTypes,
    NodeType extends VisitorTypes,
    ArrayKey extends KeysWithExactType<
      VisitorObjects[ParentType],
      Array<VisitorObjects[NodeType]>
    >,
  >(
    parent: VisitorNode<ParentType>,
    type: NodeType,
    arrayPath: ArrayKey,
  ): VisitorNode<NodeType>[] {
    if (parent.object[arrayPath] === undefined) {
      return [];
    }

    const nodes: VisitorNode<NodeType>[] = [];
    const array = parent.object[arrayPath] as unknown as Array<
      VisitorObjects[NodeType]
    >;

    array.forEach((value, index) => {
      nodes.push(
        new VisitorNode(type, value, [...parent.path, arrayPath, `${index}`]),
      );
    });

    return nodes;
  }
}

type VisitorState = {
  request: State<'request'>;
  response: State<'response'>;
};

type State<Type extends 'request' | 'response'> = {
  type: Type;
  path: string[];
};

export class SchemaPreprocessor<
  OpenAPISchema extends OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1,
> {
  private ajv: Ajv;
  //private apiDocRes: OpenAPISchema | undefined;
  private readonly serDesMap: SerDesMap;
  private resolvedSchemaCache = new Map<string, OpenAPIObject>();

  constructor(
    private apiDoc: OpenAPISchema,
    ajvOptions: Options,
    private responseOptions: ValidateResponseOpts | undefined,
  ) {
    this.ajv = createRequestAjv(this.apiDoc, ajvOptions);
    this.serDesMap = ajvOptions.serDesMap;
  }

  public preProcess(): { apiDoc: OpenAPISchema; apiDocRes: OpenAPISchema } {
    const root = new VisitorNode('document', this.apiDoc, []);

    this.traverseSchema(root);

    return {
      apiDoc: this.apiDoc,
      apiDocRes: cloneDeep(this.apiDoc), // TODO: Should be response doc
    };
  }

  private traverseSchema(root: VisitorNode<'document'>): void {
    const seenObjects = new Set<OpenAPIObject>();

    const traverse = <
      ParentType extends VisitorTypes,
      NodeType extends VisitorTypes,
    >(
      parent: VisitorNode<ParentType>,
      node: VisitorNode<NodeType>,
      state: VisitorState,
    ) => {
      try {
        if (node.object === undefined) {
          return;
        }

        if (isReferenceNode(node) && isReferenceObject(node.object)) {
          node.originalRef = node.object.$ref;

          const resolvedObject = this.resolveObject<typeof node.type>(
            node.object,
          );

          // Resolve reference object in parent, then process again with resolved schema
          // As every object (aka schema) is 'pass-by-reference', this will update the actual apiDoc.
          const lastPathComponent = node.path[node.path.length - 1];
          if (isInteger(lastPathComponent)) {
            const arrayName = node.path[node.path.length - 2];
            const index = parseInt(lastPathComponent);
            parent.object[arrayName][index] = resolvedObject;
          } else {
            parent.object[lastPathComponent] = resolvedObject;
          }

          node.object = resolvedObject;

          return traverse(parent, node as VisitorNode<NodeType>, state);
        }

        if (seenObjects.has(node.object)) return;

        seenObjects.add(node.object);

        this.visitNode(parent, node, state);

        let children: VisitorNode<any>[];

        if (hasNodeType(node, 'document')) {
          children = this.getChildrenForDocument(node);
        } else if (hasNodeType(node, 'components')) {
          children = this.getChildrenForComponents(node);
        } else if (hasNodeType(node, 'componentsV3_1')) {
          children = this.getChildrenForComponentsV3_1(node);
        } else if (hasNodeType(node, 'pathItem')) {
          children = this.getChildrenForPathItem(node);
        } else if (hasNodeType(node, 'schema')) {
          children = this.getChildrenForSchema(node);
        } else if (hasNodeType(node, 'operation')) {
          children = this.getChildrenForOperation(node);
        } else if (hasNodeType(node, 'requestBody')) {
          children = this.getChildrenForRequestBody(node);
        } else if (hasNodeType(node, 'response')) {
          children = this.getChildrenForResponse(node);
        } else if (hasNodeType(node, 'encoding')) {
          children = this.getChildrenForEncoding(node);
        } else if (hasNodeType(node, 'header')) {
          children = this.getChildrenForHeader(node);
        } else if (hasNodeType(node, 'mediaType')) {
          children = this.getChildrenForMediaType(node);
        } else if (hasNodeType(node, 'parameter')) {
          children = this.getChildrenForParameter(node);
        } else if (hasNodeType(node, 'callback')) {
          children = this.getChildrenForCallback(node);
        } else {
          throw new Error(
            `No strategy to traverse node with type ${node.type}.`,
          );
        }

        children.forEach((child) => {
          // cloning state to isolate against sub-objects affecting each other's state
          traverse(node as VisitorNode<NodeType>, child, cloneDeep(state));
        });
      } catch (error) {
        throw error;
      }
    };

    traverse(undefined, root, {
      request: { type: 'request', path: [] },
      response: { type: 'response', path: [] },
    });
  }

  private visitNode<
    ParentType extends VisitorTypes,
    NodeType extends VisitorTypes,
  >(
    parent: VisitorNode<ParentType> | undefined,
    node: VisitorNode<NodeType>,
    state: VisitorState,
  ): void {
    this.removeExamples(node);

    if (hasNodeType(node, 'pathItem')) {
      this.preProcessPathParameters(node.object);
    } else if (hasNodeType(node, 'schema')) {
      this.preProcessSchema(
        hasNodeType(parent, 'schema') ? parent : undefined,
        node,
        state,
      );
    }
  }

  private removeExamples<ObjectType extends VisitorTypes>(
    node: VisitorNode<ObjectType>,
  ): void {
    if (isReferenceObject(node.object)) {
      throw new Error('Object should have been unwrapped.');
    }

    if (hasNodeType(node, 'components')) {
      delete node.object.examples;
    } else if (
      hasNodeType(node, 'mediaType') ||
      hasNodeType(node, 'header') ||
      hasNodeType(node, 'parameter') ||
      hasNodeType(node, 'schema')
    ) {
      delete node.object.example;
      delete node.object.examples;
    }
  }

  /**
   * add path level parameters to the schema's parameters list
   * @param pathItem
   */
  private preProcessPathParameters(pathItem: VisitorObjects['pathItem']): void {
    if (isReferenceObject(pathItem)) {
      throw new Error('Object should have been unwrapped.');
    }

    const parameters = pathItem.parameters ?? [];
    if (parameters.length === 0) return;

    HttpMethods.forEach((method) => {
      const operation = pathItem[method];

      if (operation === undefined || operation === parameters) return;

      operation.parameters = operation.parameters ?? [];

      const match = (
        pathParam: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject,
        opParam: OpenAPIV3.ReferenceObject | OpenAPIV3.OperationObject,
      ) =>
        // if name or ref exists and are equal
        (opParam['name'] && opParam['name'] === pathParam['name']) ||
        (opParam['$ref'] && opParam['$ref'] === pathParam['$ref']);

      // Add Path level query param to list ONLY if there is not already an operation-level query param by the same name.
      for (const param of parameters) {
        if (
          !operation.parameters.some((operationParam) =>
            match(param, operationParam),
          )
        ) {
          operation.parameters.push(param);
        }
      }
    });
  }

  private preProcessSchema(
    parent: VisitorNode<'schema'> | undefined,
    node: VisitorNode<'schema'>,
    state: VisitorState,
  ): void {
    if (isReferenceObject(parent?.object) || isReferenceObject(node.object)) {
      throw new Error('Object should have been unwrapped.');
    }

    const parentSchemas = [parent?.object];
    const nodeSchemas = [node.object];

    /*
    // TODO: Should be response doc
    if (this.apiDoc) {
      const parentResponseSchema = _get(this.apiDoc, parent?.path);
      const nodeResponseSchema = _get(this.apiDoc, node.path);
      parentSchemas.push(parentResponseSchema);
      nodeSchemas.push(nodeResponseSchema);
    }
    */

    // visit the node in both the request and response schema
    for (let i = 0; i < nodeSchemas.length; i++) {
      const kind = i === 0 ? 'request' : 'response';

      const parentSchema = parentSchemas[i];
      const nodeSchema = nodeSchemas[i];

      const options = state[kind];
      options.path = node.path;

      this.handleSerDes(nodeSchema);

      if (options.type === 'request') {
        this.handleReadonly(parentSchema, nodeSchema, options);
      } else {
        this.handleWriteonly(parentSchema, nodeSchema, options);
      }

      this.processDiscriminator(parent, node);
    }
  }

  private processDiscriminator(
    parent: VisitorNode<'schema'> | undefined,
    node: VisitorNode<'schema'>,
  ): void {
    const nodeState = node.discriminator;
    const schemaObj = <OpenAPIV3.CompositionSchemaObject>node.object;

    const xOf =
      schemaObj.oneOf !== undefined
        ? 'oneOf'
        : schemaObj.anyOf
        ? 'anyOf'
        : undefined;

    if (xOf && schemaObj.discriminator?.propertyName !== undefined) {
      nodeState.options = schemaObj[xOf].flatMap((refObject) => {
        if (refObject['$ref'] === undefined) {
          return [];
        }
        const keys = findKeys(
          schemaObj.discriminator.mapping,
          (value) => value === refObject['$ref'],
        );
        const ref = getKeyFromRef(refObject['$ref']);
        return keys.length > 0
          ? keys.map((option) => ({ option, ref }))
          : [{ option: ref, ref }];
      });
      nodeState.discriminator = schemaObj.discriminator?.propertyName;
      nodeState.properties = {
        ...(nodeState.properties ?? {}),
        ...(schemaObj.properties ?? {}),
      };
      nodeState.required = Array.from(
        new Set((nodeState.required ?? []).concat(schemaObj.required ?? [])),
      );
    }

    if (xOf) return;

    const parentState = parent?.discriminator;

    if (parent && parentState && parentState.discriminator) {
      parentState.properties = {
        ...(parentState.properties ?? {}),
        ...(schemaObj.properties ?? {}),
      };
      parentState.required = Array.from(
        new Set((parentState.required ?? []).concat(schemaObj.required ?? [])),
      );

      const ancestor: any = parent.object;
      const ref = node.originalRef;

      if (!ref) return;

      const options = findKeys(
        ancestor.discriminator?.mapping,
        (value) => value === ref,
      );
      const refName = getKeyFromRef(ref);
      if (options.length === 0 && ref) {
        options.push(refName);
      }

      if (options.length > 0) {
        const newSchema = JSON.parse(JSON.stringify(schemaObj));

        const newProperties = {
          ...(parentState.properties ?? {}),
          ...(newSchema.properties ?? {}),
        };
        if (Object.keys(newProperties).length > 0) {
          newSchema.properties = newProperties;
        }

        newSchema.required = parentState.required;
        if (newSchema.required.length === 0) {
          delete newSchema.required;
        }

        // Expose `_discriminator` to consumers without exposing to AJV
        Object.defineProperty(ancestor, '_discriminator', {
          enumerable: false,
          value: ancestor._discriminator ?? {
            validators: {},
            options: parentState.options,
            property: parentState.discriminator,
          },
        });

        for (const option of options) {
          ancestor._discriminator.validators[option] =
            this.ajv.compile(newSchema);
        }
      }

      //reset data
      //parentState.properties = {};
      //delete parentState.required;
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
   * @param {object} nodeSchema - schema
   */
  private handleSerDes(nodeSchema: VisitorObjects['schema']): void {
    if (isReferenceObject(nodeSchema)) {
      throw new Error('Object should have been unwrapped.');
    }

    if (
      nodeSchema.type === 'string' &&
      !!nodeSchema.format &&
      this.serDesMap[nodeSchema.format]
    ) {
      const serDes = this.serDesMap[nodeSchema.format];
      (<any>nodeSchema)['x-eov-type'] = nodeSchema.type;
      if ('nullable' in nodeSchema) {
        // Ajv requires `type` keyword with `nullable` (regardless of value).
        (<any>nodeSchema).type = [
          'string',
          'number',
          'boolean',
          'object',
          'array',
        ];
      } else {
        delete nodeSchema.type;
      }
      if (serDes.deserialize) {
        nodeSchema['x-eov-req-serdes'] = serDes;
      }
      if (serDes.serialize) {
        nodeSchema['x-eov-res-serdes'] = serDes;
      }
    }
  }

  private handleReadonly(
    parentSchema: VisitorObjects['schema'] | undefined,
    nodeSchema: VisitorObjects['schema'],
    state: State<'request'>,
  ) {
    if (isReferenceObject(parentSchema) || isReferenceObject(nodeSchema)) {
      throw new Error('Object should have been unwrapped.');
    }

    const required = parentSchema?.required ?? [];
    const prop = state?.path?.[state?.path?.length - 1];
    const index = required.indexOf(prop);
    if (nodeSchema.readOnly && index > -1) {
      // remove required if readOnly
      parentSchema.required = required
        .slice(0, index)
        .concat(required.slice(index + 1));
      if (parentSchema.required.length === 0) {
        delete parentSchema.required;
      }
    }
  }

  private handleWriteonly(
    parentSchema: VisitorObjects['schema'] | undefined,
    nodeSchema: VisitorObjects['schema'],
    state: State<'response'>,
  ) {
    if (isReferenceObject(parentSchema) || isReferenceObject(nodeSchema)) {
      throw new Error('Object should have been unwrapped.');
    }

    const required = parentSchema?.required ?? [];
    const prop = state?.path?.[state?.path?.length - 1];
    const index = required.indexOf(prop);
    if (nodeSchema.writeOnly && index > -1) {
      // remove required if writeOnly
      parentSchema.required = required
        .slice(0, index)
        .concat(required.slice(index + 1));
      if (parentSchema.required.length === 0) {
        delete parentSchema.required;
      }
    }
  }

  private resolveObject<ObjectType extends VisitorTypesWithReference>(
    object: VisitorObjects[ObjectType] | undefined,
  ):
    | Exclude<VisitorObjects[ObjectType], OpenAPIV3.ReferenceObject>
    | undefined {
    if (!object) return undefined;

    const ref = object['$ref'];

    if (ref && this.resolvedSchemaCache.has(ref)) {
      return this.resolvedSchemaCache.get(ref) as Exclude<
        VisitorObjects[ObjectType],
        OpenAPIV3.ReferenceObject
      >;
    }

    let res = (ref ? this.ajv.getSchema(ref)?.schema : object) as Exclude<
      VisitorObjects[ObjectType],
      OpenAPIV3.ReferenceObject
    >;

    if (ref && !res) {
      const path = ref.split('/').join('.');
      const p = path.substring(path.indexOf('.') + 1);
      res = _get(this.apiDoc, p);
    }

    if (ref) {
      this.resolvedSchemaCache.set(ref, res);
    }

    return res;
  }

  private getChildrenForDocument(
    parent: VisitorNode<'document'>,
  ): VisitorNode<any>[] {
    const children = [];

    if (isDocumentV3_1(parent.object)) {
      children.push(
        VisitorNode.fromParent(parent, 'componentsV3_1', 'components'),
      );
      children.push(
        ...VisitorNode.fromParentDict(parent, 'pathItem', 'webhooks'),
      );
    } else {
      children.push(VisitorNode.fromParent(parent, 'components'));
    }

    children.push(...VisitorNode.fromParentDict(parent, 'pathItem', 'paths'));

    return children;
  }

  private getChildrenForComponents(
    parent: VisitorNode<'components'>,
  ): VisitorNode<any>[] {
    const children = [];

    children.push(...VisitorNode.fromParentDict(parent, 'schema', 'schemas'));
    children.push(
      ...VisitorNode.fromParentDict(parent, 'response', 'responses'),
    );
    children.push(...VisitorNode.fromParentDict(parent, 'header', 'headers'));
    children.push(
      ...VisitorNode.fromParentDict(parent, 'callback', 'callbacks'),
    );
    children.push(
      ...VisitorNode.fromParentDict(parent, 'requestBody', 'requestBodies'),
    );
    children.push(
      ...VisitorNode.fromParentDict(parent, 'parameter', 'parameters'),
    );

    return children;
  }

  private getChildrenForComponentsV3_1(
    parent: VisitorNode<'componentsV3_1'>,
  ): VisitorNode<any>[] {
    const children = [];

    children.push(
      ...VisitorNode.fromParentDict(parent, 'pathItem', 'pathItems'),
    );
    // process components V3.1 also like normal components
    children.push(new VisitorNode('components', parent.object, parent.path));

    return children;
  }

  private getChildrenForPathItem(
    parent: VisitorNode<'pathItem'>,
  ): VisitorNode<any>[] {
    if (isReferenceObject(parent.object)) {
      throw new Error('Object should have been unwrapped.');
    }

    const children = [];

    HttpMethods.forEach((method) => {
      if (method in parent.object)
        children.push(VisitorNode.fromParent(parent, 'operation', method));
    });

    children.push(
      ...VisitorNode.fromParentArray(parent, 'parameter', 'parameters'),
    );

    return children;
  }

  private getChildrenForSchema(
    parent: VisitorNode<'schema'>,
  ): VisitorNode<any>[] {
    if (isReferenceObject(parent.object)) {
      throw new Error('Object should have been unwrapped.');
    }

    const children = [];

    if (typeof parent.object.additionalProperties !== 'boolean') {
      // constructing this manually, as the type of additional properties includes boolean
      children.push(
        new VisitorNode('schema', parent.object.additionalProperties, [
          ...parent.path,
          'additionalProperties',
        ]),
      );
    }
    children.push(
      ...VisitorNode.fromParentDict(parent, 'schema', 'properties'),
    );

    if (parent.object.type === 'array' && 'items' in parent.object) {
      children.push(VisitorNode.fromParent(parent, 'schema', 'items'));
    } else {
      if ('not' in parent.object) {
        children.push(VisitorNode.fromParent(parent, 'schema', 'not'));
      }

      (['allOf', 'oneOf', 'anyOf'] as const).forEach((property) => {
        children.push(
          ...VisitorNode.fromParentArray(parent, 'schema', property),
        );
      });
    }

    return children;
  }

  private getChildrenForOperation(
    parent: VisitorNode<'operation'>,
  ): VisitorNode<any>[] {
    const children = [];

    children.push(
      ...VisitorNode.fromParentArray(parent, 'parameter', 'parameters'),
    );

    children.push(VisitorNode.fromParent(parent, 'requestBody'));
    children.push(
      ...VisitorNode.fromParentDict(parent, 'response', 'responses'),
    );
    children.push(
      ...VisitorNode.fromParentDict(parent, 'callback', 'callbacks'),
    );

    return children;
  }

  private getChildrenForRequestBody(
    parent: VisitorNode<'requestBody'>,
  ): VisitorNode<any>[] {
    const children = [];

    children.push(
      ...VisitorNode.fromParentDict(parent, 'mediaType', 'content'),
    );

    return children;
  }

  private getChildrenForResponse(
    parent: VisitorNode<'response'>,
  ): VisitorNode<any>[] {
    const children = [];

    children.push(...VisitorNode.fromParentDict(parent, 'header', 'headers'));
    children.push(
      ...VisitorNode.fromParentDict(parent, 'mediaType', 'content'),
    );

    return children;
  }

  private getChildrenForEncoding(
    parent: VisitorNode<'encoding'>,
  ): VisitorNode<any>[] {
    const children = [];

    children.push(...VisitorNode.fromParentDict(parent, 'header', 'headers'));

    return children;
  }

  private getChildrenForHeader(
    parent: VisitorNode<'header'>,
  ): VisitorNode<any>[] {
    const children = [];

    children.push(VisitorNode.fromParent(parent, 'schema'));
    children.push(
      ...VisitorNode.fromParentDict(parent, 'mediaType', 'content'),
    );

    return children;
  }

  private getChildrenForMediaType(
    parent: VisitorNode<'mediaType'>,
  ): VisitorNode<any>[] {
    const children = [];

    children.push(VisitorNode.fromParent(parent, 'schema'));
    children.push(
      ...VisitorNode.fromParentDict(parent, 'encoding', 'encoding'),
    );

    return children;
  }

  private getChildrenForParameter(
    parent: VisitorNode<'parameter'>,
  ): VisitorNode<any>[] {
    if (isReferenceObject(parent.object)) {
      throw new Error('Object should have been unwrapped.');
    }

    const children = [];

    children.push(
      new VisitorNode('schema', parent.object.schema, [
        ...parent.path.slice(0, parent.path.length - 1),
        parent.object.name,
        parent.object.in,
      ]),
    );
    children.push(
      ...VisitorNode.fromParentDict(parent, 'mediaType', 'content'),
    );

    return children;
  }

  private getChildrenForCallback(
    parent: VisitorNode<'callback'>,
  ): VisitorNode<any>[] {
    if (isReferenceObject(parent.object)) {
      throw new Error('Object should have been unwrapped.');
    }

    const children = [];

    forEachValue(parent.object, (pathItem, key) => {
      children.push(
        new VisitorNode('pathItem', pathItem, [...parent.path, key]),
      );
    });

    return children;
  }
}

function isDocumentV3_1(
  document: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1,
): document is OpenAPIV3.DocumentV3_1 {
  return document.openapi.startsWith('3.1.');
}

function isReferenceNode(
  node: VisitorNode<any>,
): node is VisitorNode<VisitorTypesWithReference> {
  return [
    'pathItem',
    'schema',
    'requestBody',
    'response',
    'header',
    'parameter',
    'callback',
  ].includes(node.type);
}

function isReferenceObject<SchemaType extends VisitorTypesWithReference>(
  object: VisitorObjects[SchemaType] | undefined,
): object is OpenAPIV3.ReferenceObject {
  return object !== undefined && '$ref' in object && !!object.$ref;
}

function hasNodeType<ObjectType extends VisitorTypes>(
  node: VisitorNode<any> | undefined,
  type: ObjectType,
): node is VisitorNode<typeof type> {
  return node?.type === type;
}

function forEachValue<Value>(
  object: { [key: string]: Value },
  perform: (value: Value, key: string) => void,
): void {
  Object.entries(object).forEach(([key, value]) => perform(value, key));
}

function findKeys(
  object: { [value: string]: string },
  searchFunc: (key: string) => boolean,
): string[] {
  const matches: string[] = [];

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

function getKeyFromRef(ref: string) {
  return ref.split('/components/schemas/')[1];
}

function isInteger(str: string): boolean {
  return /^\d+$/.test(str);
}
