import OpenAPIRequestValidator from 'openapi-request-validator';
import OpenAPIRequestCoercer from 'openapi-request-coercer';
import { validationError } from '../errors';
import ono from 'ono';

export function validateRequest({ apiDoc, loggingKey, enableObjectCoercion }) {
  const openApiRequestValidatorMap = new Map();
  const openApiRequestCoercerMap = new Map();

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

    const { validator, coercer } = getOrInitValidatorAndCoercer(
      path,
      req.method,
      apiDoc,
      schema,
      loggingKey,
      enableObjectCoercion,
    );

    // Check if route is in map (throw error - option to ignore)
    if (enableObjectCoercion) {
      coercer.coerce(req);
    }

    const validationResult = validator.validate(req);
    if (validationResult && validationResult.errors.length > 0) {
      const message = validationResult.errors[0].message;
      throw ono(validationResult, message);
    }
    next();
  }

  function getOrInitValidatorAndCoercer(
    path,
    method,
    apiDoc,
    schema,
    loggingKey,
    enableObjectCoercion,
  ) {
    // do not change path case as its affected (or not) by case-senstive routing
    const key = `${path}_${method.toLowerCase()}`;

    let validator = openApiRequestValidatorMap.get(key);
    if (!validator) {
      const componentParameters = apiDoc.components
        ? apiDoc.components.parameters
        : undefined;

      // fetch $ref schema, and inline it with the paramter
      // workaround for https://github.com/kogosoftwarellc/open-api/issues/483
      for (let i = 0; i < schema.parameters.length; i++) {
        const a = schema.parameters[i];
        if (a.$ref) {
          const id = a.$ref.replace('#/components/parameters/', '');
          schema.parameters[i] = componentParameters[id];
          console.log();
        }
      }

      validator = new OpenAPIRequestValidator({
        // TODO create custom error transformere here as there 
        // are a lot of props we can utilize errorTransformer,
        parameters: schema.parameters || [],
        requestBody: schema.requestBody,
        componentSchemas: apiDoc.components
          ? apiDoc.components.schemas
          : undefined,
      });
      openApiRequestValidatorMap.set(key, validator);
    }

    let coercer = openApiRequestCoercerMap.get(key);
    if (!coercer) {
      coercer = new OpenAPIRequestCoercer({
        loggingKey,
        enableObjectCoercion,
        parameters: schema.parameters,
      });
    }
    openApiRequestCoercerMap.set(key, coercer);

    return {
      validator,
      coercer,
    };
  }
}
