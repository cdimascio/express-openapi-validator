import OpenAPIRequestValidator from 'openapi-request-validator';
import OpenAPIRequestCoercer from 'openapi-request-coercer';
import { methodNotAllowed, notFoundError } from '../errors';

export function validateRequest({
  apiDoc,
  loggingKey,
  enableObjectCoercion,
  errorTransformer,
}) {
  return (req, res, next) => {
    console.log(
      'validateRequest_mw: ',
      req.openapi.openApiRoute,
      req.openapi.expressRoute
    );
    const path = req.openapi.expressRoute;
    if (!path) {
      const err = notFoundError(req.path);
      return sendValidationError(res, err, errorTransformer);
    }
    const schema = req.openapi.schema;
    if (!schema) {
      // add openapi metadata to make this case more clear
      // its not obvious that missig schema means methodNotAllowed
      const err = methodNotAllowed(path, req.method);
      return sendValidationError(res, err, errorTransformer);
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

    const validationResult = new OpenAPIRequestValidator({
      //   errorTransformer, // TODO create custom error transformere here as there are a lot of props we can utilize
      parameters: schema.parameters || [],
      requestBody: schema.requestBody,
      // schemas: this.apiDoc.definitions, // v2
      componentSchemas: apiDoc.components // v3
        ? apiDoc.components.schemas
        : undefined,
    }).validate(req);

    if (validationResult && validationResult.errors.length > 0) {
      return sendValidationError(res, validationResult, errorTransformer);
    }
    next();
  };
}

function sendValidationError(res, validationResult, transformer) {
  console.log(
    'validateRequest_mw: validation error',
    validationResult,
    transformer
  );
  if (!validationResult) throw Error('validationResult missing');

  const transform =
    transformer ||
    (v => ({
      statusCode: v.status,
      // TODO content-type shoudl be set and retuned
      error: { errors: v.errors },
    }));
  const x = transform(validationResult);
  if (!x || !x.statusCode || !x.error) {
    throw Error(
      'invalid error transform. must return an object with shape { statusCode, error}'
    );
  }
  // TODO throw rather than returning a result
  return res.status(x.statusCode).json(x.error);
}
