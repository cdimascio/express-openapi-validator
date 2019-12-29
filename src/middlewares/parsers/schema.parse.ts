import { OpenAPIV3 } from '../../framework/types';
import { validationError } from '../util';

const PARAM_TYPE = {
  query: 'query',
  header: 'headers',
  path: 'params',
  cookie: 'cookies',
};

type Schema = OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject;
type Parameter = OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject;

export interface ParametersSchema {
  query: object;
  headers: object;
  params: object;
  cookies: object;
}

/**
 * A class top arse incoing parameters and populate a list of request fields e.g. id and field types e.g. query
 * whose value must later be parsed as a JSON object, JSON Exploded Object, JSON Array, or JSON Exploded Array
 */
export class ParametersSchemaParser {
  private _apiDocs: OpenAPIV3.Document;

  constructor(apiDocs: OpenAPIV3.Document) {
    this._apiDocs = apiDocs;
  }

  /**
   * Parse incoing parameters and populate a list of request fields e.g. id and field types e.g. query
   * whose value must later be parsed as a JSON object, JSON Exploded Object, JSON Array, or JSON Exploded Array
   * @param path
   * @param parameters
   */
  public parse(path: string, parameters: Parameter[] = []): ParametersSchema {
    const schemas = { query: {}, headers: {}, params: {}, cookies: {} };

    parameters.forEach(p => {
      const parameter = Util.is$Ref(p)
        ? Util.dereference(this._apiDocs, <OpenAPIV3.ReferenceObject>p)
        : <OpenAPIV3.ParameterObject>p;

      Validate.parameterType(path, parameter);

      const reqField = PARAM_TYPE[parameter.in];
      const { name, schema } = Util.normalize(parameter);

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

    return schemas;
  }
}
class Util {
  public static is$Ref(parameter: Parameter): boolean {
    return parameter.hasOwnProperty('$ref');
  }
  public static dereference(
    apiDocs: OpenAPIV3.Document,
    parameter: OpenAPIV3.ReferenceObject,
  ): OpenAPIV3.ParameterObject {
    const id = parameter.$ref.replace(/^.+\//i, '');
    // TODO use ajv.getSchema. double nested $ref may later fail
    return <OpenAPIV3.ParameterObject>apiDocs.components.parameters[id];
  }

  public static normalize(
    parameter: OpenAPIV3.ParameterObject,
  ): {
    name: string;
    schema: Schema;
  } {
    let schema = parameter.schema;
    if (!schema) {
      const contentType = Object.keys(parameter.content)[0];
      schema = parameter.content?.[contentType]?.schema;
    }
    const name =
      parameter.in === 'header' ? parameter.name.toLowerCase() : parameter.name;
    return { name, schema };
  }
}

class Validate {
  public static parameterType(
    path: string,
    parameter: OpenAPIV3.ParameterObject,
  ): void {
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
}
