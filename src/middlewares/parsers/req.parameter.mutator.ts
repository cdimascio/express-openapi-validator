import { Request } from 'express';
import Ajv from 'ajv';
import {
  BadRequest,
  OpenApiRequest,
  OpenApiRequestMetadata,
  OpenAPIV3,
  ValidationSchema,
} from '../../framework/types';
import * as url from 'url';
import { dereferenceParameter, normalizeParameter } from './util';
import * as mediaTypeParser from 'media-typer';
import * as contentTypeParser from 'content-type';
import { parse } from 'qs';

type SchemaObject = OpenAPIV3.SchemaObject;
type ReferenceObject = OpenAPIV3.ReferenceObject;
type ParameterObject = OpenAPIV3.ParameterObject;

const RESERVED_CHARS = /[\:\/\?#\[\]@!\$&\'()\*\+,;=]/;

const ARRAY_DELIMITER = {
  simple: ',',
  form: ',',
  spaceDelimited: ' ',
  pipeDelimited: '|',
};

const REQUEST_FIELDS = {
  query: 'query',
  header: 'headers',
  path: 'params',
  cookie: 'cookies',
};

type Schema = ReferenceObject | SchemaObject;

/**
 * A class top parse and mutate the incoming request parameters according to the openapi spec.
 * the request is mutated to accomodate various styles and types e.g. form, explode, deepObject, etc
 */
export class RequestParameterMutator {
  private _apiDocs: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1;
  private path: string;
  private ajv: Ajv;
  private parsedSchema: ValidationSchema;

  constructor(
    ajv: Ajv,
    apiDocs: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1,
    path: string,
    parsedSchema: ValidationSchema,
  ) {
    this.ajv = ajv;
    this._apiDocs = apiDocs;
    this.path = path;
    this.parsedSchema = parsedSchema;
  }

  /**
   * Modifies an incoming request object by applying the openapi schema
   * req values may be parsed/mutated as a JSON object, JSON Exploded Object, JSON Array, or JSON Exploded Array
   * @param req
   */
  public modifyRequest(req: OpenApiRequest): void {
    const { parameters } = (<OpenApiRequestMetadata>req.openapi).schema;
    const rawQuery = this.parseQueryStringUndecoded(
      url.parse(req.originalUrl).query,
    );

    req.query = this.handleBracketNotationQueryFields(req.query);

    (parameters || []).forEach((p) => {
      const parameter = dereferenceParameter(this._apiDocs, p);
      const { name, schema } = normalizeParameter(this.ajv, parameter);

      const { type } = <SchemaObject>schema;
      const { style, explode } = parameter;
      const i = req.originalUrl.indexOf('?');
      const queryString = req.originalUrl.substr(i + 1);

      if (
        parameter.in === 'query' &&
        !parameter.allowReserved &&
        !!parameter.explode
      ) {
        //} && !!parameter.explode) {
        this.validateReservedCharacters(name, rawQuery);
      }
      if (
        parameter.in === 'query' &&
        !parameter.allowReserved &&
        !parameter.explode
      ) {
        //} && !!parameter.explode) {
        this.validateReservedCharacters(name, rawQuery, true);
      }

      if (parameter.content) {
        this.handleContent(req, name, parameter);
      } else if (parameter.in === 'query' && this.isObjectOrXOf(schema)) {
        // handle bracket notation and mutates query param

        if (style === 'form' && explode) {
          this.parseJsonAndMutateRequest(req, parameter.in, name);
          this.handleFormExplode(req, name, <SchemaObject>schema, parameter);
        } else if (style === 'deepObject') {
          this.handleDeepObject(req, queryString, name, schema);
        } else if (style === 'form' && !explode && schema.type === 'object') {
          const value = req.query[name];
          if (typeof value === 'string') {
            const kvPairs = this.csvToKeyValuePairs(value);
            if (kvPairs) {
              req.query[name] = kvPairs;
              return;
            }
          }
          this.parseJsonAndMutateRequest(req, parameter.in, name);
        } else {
          this.parseJsonAndMutateRequest(req, parameter.in, name);
        }
      } else if (type === 'array' && !explode) {
        const delimiter = ARRAY_DELIMITER[parameter.style];
        this.validateArrayDelimiter(delimiter, parameter);
        this.parseJsonArrayAndMutateRequest(
          req,
          parameter.in,
          name,
          delimiter,
          rawQuery,
        );
      } else if (type === 'array' && explode) {
        this.explodeJsonArrayAndMutateRequest(req, parameter.in, name);
      } else if (style === 'form' && explode) {
        this.handleFormExplode(req, name, <SchemaObject>schema, parameter);
      }
    });
  }

  private handleDeepObject(
    req: Request,
    qs: string,
    name: string,
    schema: SchemaObject,
  ): void {
    const getDefaultSchemaValue = () => {
      let defaultValue;

      if (schema.default !== undefined) {
        defaultValue = schema.default;
      } else if (schema.properties) {
        Object.entries(schema.properties).forEach(([k, v]) => {
          // Handle recursive objects
          defaultValue ??= {};
          if (v['default']) {
            defaultValue[k] = v['default'];
          }
        });
      } else {
        ['allOf', 'oneOf', 'anyOf'].forEach((key) => {
          if (schema[key]) {
            schema[key].forEach((s) => {
              if (s.$ref) {
                const compiledSchema = this.ajv.getSchema(s.$ref);
                // as any -> https://stackoverflow.com/a/23553128
                defaultValue =
                  defaultValue === undefined
                    ? (compiledSchema.schema as any).default
                    : defaultValue;
              } else {
                defaultValue =
                  defaultValue === undefined ? s.default : defaultValue;
              }
            });
          }
        });
      }

      return defaultValue;
    };

    if (!req.query?.[name]) {
      req.query[name] = getDefaultSchemaValue();
    }
    this.parseJsonAndMutateRequest(req, 'query', name);
    // TODO handle url encoded?
  }

  private handleContent(
    req: Request,
    name: string,
    parameter: ParameterObject,
  ): void {
    /**
     * Per the OpenAPI3 spec:
     * A map containing the representations for the parameter. The key is the media type
     * and the value describes it. The map MUST only contain one entry.
     * https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#parameterContent
     */
    const contentType = Object.keys(parameter.content)[0];
    const parsedContentType = contentTypeParser.parse(contentType);
    const parsedMediaType = mediaTypeParser.parse(parsedContentType.type);

    const { subtype, suffix } = parsedMediaType;
    const isMediaTypeJson = [subtype, suffix].includes('json');
    if (isMediaTypeJson) {
      const reqField = REQUEST_FIELDS[parameter.in];
      this.parseJsonAndMutateRequest(req, reqField, name);
    }
  }

  private handleFormExplode(
    req: Request,
    name: string,
    schema: SchemaObject,
    parameter: ParameterObject,
  ): void {
    // fetch the keys used for this kind of explode
    const type = schema.type;
    const hasXOf = schema['allOf'] || schema['oneOf'] || schema['anyOf'];
    const properties = hasXOf
      ? xOfProperties(schema)
      : type === 'object'
        ? Object.keys(schema.properties ?? {})
        : [];

    this.explodedJsonObjectAndMutateRequest(
      req,
      parameter.in,
      name,
      properties,
      schema,
    );

    function xOfProperties(schema: Schema): string[] {
      return ['allOf', 'oneOf', 'anyOf'].reduce((acc, key) => {
        if (!schema.hasOwnProperty(key)) {
          return acc;
        } else {
          const foundProperties = schema[key].reduce((acc2, obj) => {
            return obj.type === 'object'
              ? acc2.concat(...Object.keys(obj.properties))
              : acc2;
          }, []);
          return foundProperties.length > 0
            ? acc.concat(...foundProperties)
            : acc;
        }
      }, []);
    }
  }

  private parseJsonAndMutateRequest(
    req: Request,
    $in: string,
    name: string,
  ): void {
    /**
     * support json in request params, query, headers and cookies
     * like this filter={"type":"t-shirt","color":"blue"}
     *
     * https://swagger.io/docs/specification/describing-parameters/#schema-vs-content
     */
    const field = REQUEST_FIELDS[$in];
    if (req[field]?.[name]) {
      try {
        const value = req[field][name];
        const json = JSON.parse(value);
        req[field][name] = json;
      } catch (e) {
        // NOOP If parsing failed but _should_ contain JSON, validator will catch it.
        // May contain falsely flagged parameter (e.g. input was object OR string)
      }
    }
  }

  /**
   * used for !explode array parameters
   * @param req
   * @param $in
   * @param name
   * @param delimiter
   * @param rawQuery
   * @private
   */
  private parseJsonArrayAndMutateRequest(
    req: Request,
    $in: string,
    name: string,
    delimiter: string,
    rawQuery: Map<string, string[]>,
  ): void {
    /**
     * array deserialization for query and params
     * filter=foo,bar,baz
     * filter=foo|bar|baz
     * filter=foo%20bar%20baz
     */
    const field = REQUEST_FIELDS[$in];
    const rawValues = [];
    if (['query'].includes($in)) {
      // perhaps split query from params
      rawValues.concat(rawQuery.get(name) ?? []);
    }

    let i = 0;
    if (req[field]?.[name]) {
      if (Array.isArray(req[field][name])) return;
      const value = req[field][name].split(delimiter);
      const rawValue = rawValues[i++];
      if (rawValue?.includes(delimiter)) {
        // TODO add && !allowReserved to improve performance. When allowReserved is true, commas are common and we do not need to do this extra work
        // Currently, rawValue is only populated for query params
        // if the raw value contains a delimiter, decode manually
        // parse the decode value and update req[field][name]
        const manuallyDecodedValues = rawValue
          .split(delimiter)
          .map((v) => decodeURIComponent(v));
        req[field][name] = manuallyDecodedValues;
      } else {
        req[field][name] = value;
      }
    }
  }

  // TODO is this method still necessary with the new qs processing introduced in the express-5 support
  // (Try removing it)
  private explodedJsonObjectAndMutateRequest(
    req: Request,
    $in: string,
    name: string,
    properties: string[],
    schema: SchemaObject,
  ): void {
    // forcing convert to object if scheme describes param as object + explode
    // for easy validation, keep the schema but update whereabouts of its sub components
    const field = REQUEST_FIELDS[$in];
    if (req[field]) {
      // check if there is at least one of the nested properties before creating the root property
      const atLeastOne = properties.some((p) => {
        return Object.prototype.hasOwnProperty.call(req[field], p);
      });
      if (atLeastOne) {
        req[field][name] = {};
        properties.forEach((property) => {
          if (req[field][property]) {
            const schema = this.parsedSchema[field];
            const type = schema.properties[name].properties?.[property]?.type;
            const value = req[field][property];
            const coercedValue =
              type === 'array' && !Array.isArray(value) ? [value] : value;
            req[field][name][property] = coercedValue;
            delete req[field][property];
          }
        });
      }
    }
  }

  private explodeJsonArrayAndMutateRequest(
    req: Request,
    $in: string,
    name: string,
  ): void {
    /**
     * forcing convert to array if scheme describes param as array + explode
     */
    const field = REQUEST_FIELDS[$in];
    if (req[field]?.[name] && !Array.isArray(req[field][name])) {
      const value = [req[field][name]];
      req[field][name] = value;
    }
  }

  private isObjectOrXOf(schema: Schema): boolean {
    const schemaHasObject = (schema) => {
      if (!schema) return false;
      if (schema.$ref) return true;
      const { type, allOf, oneOf, anyOf } = schema;
      return (
        type === 'object' ||
        [].concat(allOf, oneOf, anyOf).some(schemaHasObject)
      );
    };
    return schemaHasObject(schema);
  }

  private validateArrayDelimiter(
    delimiter: string,
    parameter: ParameterObject,
  ): void {
    if (!delimiter) {
      const message = `Parameter 'style' has incorrect value '${parameter.style}' for [${parameter.name}]`;
      throw new BadRequest({
        path: `.query.${parameter.name}`,
        message: message,
      });
    }
  }

  private validateReservedCharacters(
    name: string,
    pairs: Map<string, string[]>,
    allowComma: boolean = false,
  ) {
    const vs = pairs.get(name);
    if (!vs) return;
    for (const v of vs) {
      const svs = allowComma ? v.split(',') : [v];
      for (const sv of svs) {
        if (sv?.match(RESERVED_CHARS)) {
          const message = `Parameter '${name}' must be url encoded. Its value may not contain reserved characters.`;
          throw new BadRequest({ path: `/query/${name}`, message: message });
        }
      }
    }
  }

  private parseQueryStringUndecoded(qs: string): Map<string, string[]> {
    if (!qs) return new Map<string, string[]>();
    const q = qs.replace('?', '');
    return q.split('&').reduce((m, p) => {
      const [k, v] = p.split('=');
      m.set(k, m.get(k) ?? []);
      m.get(k)!.push(v);
      return m;
    }, new Map<string, string[]>());
  }

  private csvToKeyValuePairs(
    csvString: string,
  ): Record<string, string> | undefined {
    const hasBrace = csvString.split('{').length > 1;
    const items = csvString.split(',');

    if (hasBrace) {
      // if it has a brace, we assume its JSON and skip creating k v pairs
      // TODO improve json check, but ensure its cheap
      return;
    }

    if (items.length % 2 !== 0) {
      // if the number of elements is not event,
      // then we do not have k v pairs, so return undefined
      return;
    }

    const result = {};

    for (let i = 0; i < items.length - 1; i += 2) {
      result[items[i]] = items[i + 1];
    }

    return result;
  }

  /**
   * Handles query parameters with bracket notation.
   * @param query The query parameters object to process
   * @returns The processed query parameters object
   */
  private handleBracketNotationQueryFields(query: { [key: string]: any }): {
    [key: string]: any;
  } {
    const handler = new BracketNotationHandler(query);
    return handler.process();
  }
}

/**
 * Handles parsing of query parameters with bracket notation.
 * - If a parameter in the OpenAPI spec has literal brackets in its name (e.g., 'filter[name]'),
 *   it will be treated as a literal parameter name.
 * - Otherwise, it will be parsed as a nested object using qs.
 */
class BracketNotationHandler {
  // Cache for literal bracket parameters per endpoint
  private static readonly literalBracketParamsCache = new Map<
    string,
    Set<string>
  >();

  constructor(private readonly query: { [key: string]: any }) {}

  /**
   * Process the query parameters to handle bracket notation
   */
  public process(): { [key: string]: any } {
    const literalBracketParams = this.getLiteralBracketParams();

    const query = this.query;
    Object.keys(query).forEach((key) => {
      // Only process keys that contain brackets
      if (key.includes('[')) {
        // Only process keys that do not contain literal bracket notation
        if (!literalBracketParams.has(key)) {
          // Use qs.parse to handle it as a nested object
          const normalizedKey = key.split('[')[0];
          const parsed = parse(`${key}=${query[key]}`);

          // Use the parsed value for the normalized key
          if (parsed[normalizedKey] !== undefined) {
            // If we already have a value for this key, merge the objects
            if (
              query[normalizedKey] &&
              typeof query[normalizedKey] === 'object' &&
              typeof parsed[normalizedKey] === 'object' &&
              !Array.isArray(parsed[normalizedKey])
            ) {
              query[normalizedKey] = {
                ...query[normalizedKey],
                ...parsed[normalizedKey],
              };
            } else {
              query[normalizedKey] = parsed[normalizedKey];
            }
          }

          // Remove the original bracketed key from the query
          delete query[key];
        }
      }
    });

    return query;
  }

  /**
   * Gets a cache key for the current request's OpenAPI schema
   * Combines path, method, and operation ID to create a key
   */
  private getCacheKey(): string | null {
    const schema = this.query._openapi?.schema;
    if (!schema) return null;

    // Use all available identifiers to ensure uniqueness
    const path = schema.path ?? '';
    const method = schema.method ?? '';
    const operationId = schema.operationId ?? '';

    // Combine all parts with a consistent separator
    return `${path}|${method}|${operationId}`;
  }

  /**
   * Gets the set of parameter names that should be treated as literal bracket notation
   */
  private getLiteralBracketParams(): Set<string> {
    const cacheKey = this.getCacheKey();

    if (
      cacheKey &&
      BracketNotationHandler.literalBracketParamsCache.has(cacheKey)
    ) {
      return BracketNotationHandler.literalBracketParamsCache.get(cacheKey)!;
    }

    // Get the OpenAPI parameters for the current request
    const openApiParams = (this.query._openapi?.schema?.parameters ||
      []) as ParameterObject[];

    // Create a Set of parameter names that have literal brackets in the spec
    const literalBracketParams = new Set<string>(
      openApiParams
        .filter((p) => p.in === 'query' && p.name.includes('['))
        .map((p) => p.name),
    );

    // Cache the result for future requests to this endpoint
    if (cacheKey) {
      BracketNotationHandler.literalBracketParamsCache.set(
        cacheKey,
        literalBracketParams,
      );
    }

    return literalBracketParams;
  }
}
