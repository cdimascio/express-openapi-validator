import OpenAPIRequestValidator from 'openapi-request-validator';
import OpenAPIRequestCoercer from 'openapi-request-coercer';
import { validationError } from '../errors';
import ono from 'ono';
export function validateRequest({ apiDoc, loggingKey, enableObjectCoercion }) {
  return (req, res, next) => {
    if (!req.openapi) {
      // this path was not found in open api and
      // this path is not defined under an openapi base path
      // skip it
      return next();
    }
    const path = req.openapi.expressRoute;
    if (!path) {
      const message = 'not found';
      const err = validationError(404, req.path, message);
      throw ono(err, message);
    }
    const schema = req.openapi.schema;
    if (!schema) {
      // add openapi metadata to make this case more clear
      // its not obvious that missig schema means methodNotAllowed
      const message = `${req.method} method not allowed`;
      const err = validationError(405, req.path, message);
      throw ono(err, message);
    }

    if (!schema.parameters) {
      schema.parameters = [];
    }

    const shouldUpdatePathParams =
      Object.keys(req.openapi.pathParams).length > 0;

    if (shouldUpdatePathParams) {
      req.params = req.openapi.pathParams || req.params;
    }

    // Check if route is in map (throw error - option to ignore)
    if (enableObjectCoercion) {
      // this modifies the request object with coerced types
      new OpenAPIRequestCoercer({
        loggingKey,
        enableObjectCoercion,
        parameters: schema.parameters,
      }).coerce(req);
    }

    const componentParameters = apiDoc.components
        ? apiDoc.components.parameters
        : undefined;
    for (let i=0; i < schema.parameters.length; i++) {
      const a = schema.parameters[i];
      if (a.$ref) {
        const id = a.$ref.replace('#/components/parameters/','');
        schema.parameters[i] = componentParameters[id];
        console.log()
      }
    }

    const validationResult = new OpenAPIRequestValidator({
      // TODO create custom error transformere here as there are a lot of props we can utilize
      // errorTransformer,
      parameters: schema.parameters || [],
      requestBody: schema.requestBody,
      // schemas: this.apiDoc.definitions, // v2
      componentSchemas: apiDoc.components // v3
        ? apiDoc.components.schemas
        : undefined,
    }).validate(req);

    if (validationResult && validationResult.errors.length > 0) {
      const message = validationResult.errors[0].message;
      throw ono(validationResult, message);
    }
    next();
  };
}
