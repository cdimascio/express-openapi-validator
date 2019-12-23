import { OpenApiRequest, OpenApiRequestMetadata } from '../../framework/types';
import { ParametersParse } from './parameters.parse';

/**
 * A class top arse incoing parameters and populate a list of request fields e.g. id and field types e.g. query
 * whose value must later be parsed as a JSON object, JSON Exploded Object, JSON Array, or JSON Exploded Array
 */
export class ParametersTransform {
  private parameters: ParametersParse;
  private schema;

  constructor(parseResult: ParametersParse, schema) {
    this.parameters = parseResult;
    this.schema = schema;
  }

  public applyExplodedJsonTransform(req: OpenApiRequest): void {
    // forcing convert to object if scheme describes param as object + explode
    // for easy validation, keep the schema but update whereabouts of its sub components
    this.parameters.parseObjectExplode.forEach(item => {
      if (req[item.reqField]) {
        // check if there is at least one of the nested properties before create the parent
        const atLeastOne = item.properties.some(p =>
          req[item.reqField].hasOwnProperty(p),
        );
        if (atLeastOne) {
          req[item.reqField][item.name] = {};
          item.properties.forEach(property => {
            if (req[item.reqField][property]) {
              const type = this.schema.properties[item.reqField].properties[
                item.name
              ].properties?.[property]?.type;
              const value = req[item.reqField][property];
              const coercedValue =
                type === 'array' && !Array.isArray(value) ? [value] : value;
              req[item.reqField][item.name][property] = coercedValue;
              delete req[item.reqField][property];
            }
          });
        }
      }
    });
  }

  public applyJsonTransform(req: OpenApiRequest): void {
    /**
     * support json in request params, query, headers and cookies
     * like this filter={"type":"t-shirt","color":"blue"}
     *
     * https://swagger.io/docs/specification/describing-parameters/#schema-vs-content
     */
    this.parameters.parseJson.forEach(item => {
      if (req[item.reqField]?.[item.name]) {
        try {
          req[item.reqField][item.name] = JSON.parse(
            req[item.reqField][item.name],
          );
        } catch (e) {
          // NOOP If parsing failed but _should_ contain JSON, validator will catch it.
          // May contain falsely flagged parameter (e.g. input was object OR string)
        }
      }
    });
  }

  public applyJsonArrayTransform(req: OpenApiRequest): void {
    /**
     * array deserialization
     * filter=foo,bar,baz
     * filter=foo|bar|baz
     * filter=foo%20bar%20baz
     */
    this.parameters.parseArray.forEach(item => {
      if (req[item.reqField]?.[item.name]) {
        req[item.reqField][item.name] = req[item.reqField][item.name].split(
          item.delimiter,
        );
      }
    });
  }

  public applyExplodedJsonArrayTransform(req: OpenApiRequest): void {
    /**
     * forcing convert to array if scheme describes param as array + explode
     */
    this.parameters.parseArrayExplode.forEach(item => {
      if (
        req[item.reqField]?.[item.name] &&
        !(req[item.reqField][item.name] instanceof Array)
      ) {
        req[item.reqField][item.name] = [req[item.reqField][item.name]];
      }
    });
  }

  public applyPathTransform(req: OpenApiRequest): void {
    const openapi = <OpenApiRequestMetadata>req.openapi;
    const shouldUpdatePathParams = Object.keys(openapi.pathParams).length > 0;

    if (shouldUpdatePathParams) {
      req.params = openapi.pathParams ?? req.params;
    }
  }
}
