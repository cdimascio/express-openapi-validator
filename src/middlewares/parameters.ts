import { OpenAPIV3 } from '../framework/types';
import { validationError } from './util';
import * as mediaTypeParser from 'media-typer';
import * as contentTypeParser from 'content-type';

const ARRAY_DELIMITER = {
  form: ',',
  spaceDelimited: ' ',
  pipeDelimited: '|',
};

const PARAM_TYPE = {
  query: 'query',
  header: 'headers',
  path: 'params',
  cookie: 'cookies',
};

type Schema = OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject;
type Parameter = OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject;
interface ParseType {
  name: string;
  reqField: string;
}
export interface ParseJson extends ParseType {}
export interface ParseArrayExplode extends ParseType {}
export interface ParseArray extends ParseArrayExplode {
  delimiter: string;
}
export interface ParseObjectExplode extends ParseType {
  properties: string[];
}

export class Parameters {
  private _apiDocs: OpenAPIV3.Document;
  private parseJson: ParseJson[] = [];
  private parseArray: ParseArray[] = [];
  private parseArrayExplode: ParseArrayExplode[] = [];
  private parseObjectExplode: ParseObjectExplode[] = [];

  constructor(apiDocs: OpenAPIV3.Document) {
    this._apiDocs = apiDocs;
  }

  parse(path: string, parameters: Parameter[] = []) {
    const schemas = { query: {}, headers: {}, params: {}, cookies: {} };

    parameters.forEach(p => {
      const parameter = Util.is$Ref(p)
        ? Util.dereference(this._apiDocs, <OpenAPIV3.ReferenceObject>p)
        : <OpenAPIV3.ParameterObject>p;

      Validate.parameterType(path, parameter);

      const reqField = PARAM_TYPE[parameter.in];
      const { name, schema } = Util.normalize(parameter);
      const { type } = <OpenAPIV3.SchemaObject>schema;
      const { style, explode } = parameter;

      if (parameter.content) {
        this.handleContent(path, name, parameter);
      } else if (parameter.in === 'query' && Util.hasSchemaObject(schema)) {
        this.parseJson.push({ name, reqField });
      }

      if (type === 'array' && !explode) {
        const delimiter = ARRAY_DELIMITER[parameter.style];
        Validate.arrayDelimiter(path, delimiter, parameter);
        this.parseArray.push({ name, reqField, delimiter });
      } else if (type === 'array' && explode) {
        this.parseArrayExplode.push({ name, reqField });
      } else if (style === 'form' && explode) {
        const scheme = <OpenAPIV3.SchemaObject>schema;
        this.handleFormExplode(path, name, scheme, parameter);
      }

      if (!schemas[reqField].properties) {
        schemas[reqField] = {
          type: 'object',
          properties: {},
        };
      }

      schemas[reqField].properties[name] = schema;
      if (parameter.required) {
        if (!schemas[reqField].required) {
          schemas[reqField].required = [];
        }
        schemas[reqField].required.push(name);
      }
    });

    return {
      schema: schemas,
      parseJson: this.parseJson,
      parseArray: this.parseArray,
      parseArrayExplode: this.parseArrayExplode,
      parseObjectExplode: this.parseObjectExplode,
    };
  }

  private handleContent(
    path: string,
    name: string,
    parameter: OpenAPIV3.ParameterObject,
  ) {
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
      const reqField = PARAM_TYPE[parameter.in];
      this.parseJson.push({ name, reqField });
    }
  }

  private handleFormExplode(
    path: string,
    name: string,
    schema: OpenAPIV3.SchemaObject,
    parameter: OpenAPIV3.ParameterObject,
  ) {
    // fetch the keys used for this kind of explode
    const type = schema.type;
    const reqField = PARAM_TYPE[parameter.in];
    const hasXOf = schema.allOf || schema.oneOf || schema.anyOf;
    const properties = hasXOf
      ? xOfProperties(schema)
      : type === 'object'
      ? Object.keys(schema.properties)
      : [];

    this.parseObjectExplode.push({ reqField, name, properties });

    function xOfProperties(schema: Schema) {
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
}

class Util {
  static is$Ref(parameter: Parameter) {
    return parameter.hasOwnProperty('$ref');
  }
  static dereference(
    apiDocs: OpenAPIV3.Document,
    parameter: OpenAPIV3.ReferenceObject,
  ): OpenAPIV3.ParameterObject {
    const id = parameter.$ref.replace(/^.+\//i, '');
    // TODO use ajv.getSchema. double nested $ref may later fail
    return <OpenAPIV3.ParameterObject>apiDocs.components.parameters[id];
  }

  static normalize(parameter: OpenAPIV3.ParameterObject) {
    let schema = parameter.schema;
    if (!schema) {
      const contentType = Object.keys(parameter.content)[0];
      schema = parameter.content?.[contentType]?.schema;
    }
    const name =
      parameter.in === 'header' ? parameter.name.toLowerCase() : parameter.name;
    return { name, schema };
  }

  static hasSchemaObject(schema: Schema) {
    const schemaHasObject = schema => {
      if (!schema) return false;
      const { type, allOf, oneOf, anyOf } = schema;
      return (
        type === 'object' ||
        [].concat(allOf, oneOf, anyOf).some(schemaHasObject)
      );
    };
    return schemaHasObject(schema);
  }
}

class Validate {
  static parameterType(path: string, parameter: OpenAPIV3.ParameterObject) {
    const isKnownType = PARAM_TYPE[parameter.in];
    if (!isKnownType) {
      const message = `Parameter 'in' has incorrect value '${parameter.in}' for [${parameter.name}]`;
      throw validationError(400, path, message);
    }

    const hasSchema = () => {
      const contentType =
        parameter.content && Object.keys(parameter.content)[0];
      return !parameter.schema || !parameter.content?.[contentType]?.schema;
    };

    if (!hasSchema()) {
      const message = `No available parameter in 'schema' or 'content' for [${parameter.name}]`;
      throw validationError(400, path, message);
    }
  }

  static arrayDelimiter(
    path: string,
    delimiter: string,
    parameter: OpenAPIV3.ParameterObject,
  ) {
    if (!delimiter) {
      const message = `Parameter 'style' has incorrect value '${parameter.style}' for [${parameter.name}]`;
      throw validationError(400, path, message);
    }
  }
}
