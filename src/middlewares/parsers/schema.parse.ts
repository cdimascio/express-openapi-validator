import { OpenAPIV3, ParametersSchema } from '../../framework/types';
import { validationError } from '../util';
import { dereferenceParameter, normalizeParameter } from './util';

const PARAM_TYPE = {
  query: 'query',
  header: 'headers',
  path: 'params',
  cookie: 'cookies',
};

type Parameter = OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject;

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
      const parameter = dereferenceParameter(this._apiDocs, p);

      this.validateParameterType(path, parameter);

      const reqField = PARAM_TYPE[parameter.in];
      const { name, schema } = normalizeParameter(parameter);

      if (!schemas[reqField].properties) {
        schemas[reqField] = {
          type: 'object',
          properties: {},
        };
      }

      schemas[reqField].properties[name] = schema;
      if (reqField === 'query' && parameter.allowEmptyValue) {
        if (!schemas[reqField].allowEmptyValue) {
          schemas[reqField].allowEmptyValue = new Set<string>();
        }
        schemas[reqField].allowEmptyValue.add(name);
      }
      if (parameter.required) {
        if (!schemas[reqField].required) {
          schemas[reqField].required = [];
        }
        schemas[reqField].required.push(name);
      }
    });

    return schemas;
  }

  private validateParameterType(
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
