import { Request } from 'express';
import { Ajv } from 'ajv';
import {
  OpenAPIV3,
  OpenApiRequest,
  OpenApiRequestMetadata,
  ValidationSchema,
  BadRequest,
} from '../../framework/types';
import * as url from 'url';
import { dereferenceParameter, normalizeParameter } from './util';
import * as mediaTypeParser from 'media-typer';
import * as contentTypeParser from 'content-type';

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
  private _apiDocs: OpenAPIV3.Document;
  private path: string;
  private ajv: Ajv;
  private parsedSchema: ValidationSchema;

  constructor(
    ajv: Ajv,
    apiDocs: OpenAPIV3.Document,
    path: string,
    parsedSchema: ValidationSchema,
  ) {
    this.ajv = ajv;
    this._apiDocs = apiDocs;
    this.path = path;
    this.parsedSchema = parsedSchema;
  }

  /**
   * Modifies an incoing request object by applying the openapi schema
   * req values may be parsed/mutated as a JSON object, JSON Exploded Object, JSON Array, or JSON Exploded Array
   * @param req
   */
  public modifyRequest(req: OpenApiRequest): void {
    const { parameters } = (<OpenApiRequestMetadata>req.openapi).schema;
    const rawQuery = this.parseQueryStringUndecoded(
      url.parse(req.originalUrl).query,
    );

    (parameters || []).forEach((p) => {
      const parameter = dereferenceParameter(this._apiDocs, p);
      const { name, schema } = normalizeParameter(this.ajv, parameter);

      const { type } = <SchemaObject>schema;
      const { style, explode } = parameter;
      const i = req.originalUrl.indexOf('?');
      const queryString = req.originalUrl.substr(i + 1);

      if (parameter.in === 'query' && !parameter.allowReserved) {
        this.validateReservedCharacters(name, rawQuery);
      }

      if (parameter.content) {
        this.handleContent(req, name, parameter);
      } else if (parameter.in === 'query' && this.isObjectOrXOf(schema)) {
        if (style === 'form' && explode) {
          this.parseJsonAndMutateRequest(req, parameter.in, name);
          this.handleFormExplode(req, name, <SchemaObject>schema, parameter);
        } else if (style === 'deepObject') {
          this.handleDeepObject(req, queryString, name, schema);
        } else {
          this.parseJsonAndMutateRequest(req, parameter.in, name);
        }
      } else if (type === 'array' && !explode) {
        const delimiter = ARRAY_DELIMITER[parameter.style];
        this.validateArrayDelimiter(delimiter, parameter);
        this.parseJsonArrayAndMutateRequest(req, parameter.in, name, delimiter);
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
    const hasXOf = schema.allOf || schema.oneOf || schema.anyOf;
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

  private parseJsonArrayAndMutateRequest(
    req: Request,
    $in: string,
    name: string,
    delimiter: string,
  ): void {
    /**
     * array deserialization
     * filter=foo,bar,baz
     * filter=foo|bar|baz
     * filter=foo%20bar%20baz
     */
    const field = REQUEST_FIELDS[$in];
    if (req[field]?.[name]) {
      if (Array.isArray(req[field][name])) return;
      const value = req[field][name].split(delimiter);
      req[field][name] = value;
    }
  }

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
      const atLeastOne = properties.some((p) => req[field].hasOwnProperty(p));
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
    if (req[field]?.[name] && !(req[field][name] instanceof Array)) {
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
  ) {
    const vs = pairs.get(name);
    if (!vs) return;
    for (const v of vs) {
      if (v?.match(RESERVED_CHARS)) {
        const message = `Parameter '${name}' must be url encoded. Its value may not contain reserved characters.`;
        throw new BadRequest({ path: `.query.${name}`, message: message });
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
}
