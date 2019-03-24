const pathToRegexp = require('path-to-regexp');
const _ = require('lodash');
import OpenAPIRequestValidator from 'openapi-request-validator';
import OpenAPIRequestCoercer from 'openapi-request-coercer';
import { methodNotAllowed, notFoundError } from '../errors';

export function core(opts, apiDoc, openApiRouteMap) {
  return (req, res, next) => {
    req.openapi = {
      apiDoc,
    };
    const matched = matchRoute(req);

    if (matched) {
      const { expressRoute, openApiRoute, pathParams } = matched;
      console.log('core_mw: matched', expressRoute, openApiRoute);
      req.openapi.expressRoute = expressRoute;
      req.openapi.openApiRoute = openApiRoute;
      req.params = pathParams;
      req.openapi.pathParams = pathParams;
      next();
    } else {
      res.status(404).json({ test: 'test' });
    }
  };

  function matchRoute(req) {
    const path = req.path;
    const method = req.method;
    for (const [openApiRoute, methods] of Object.entries(openApiRouteMap)) {
      const { expressRoute } = methods[method];
      console.log('core_mw: matchRoute', openApiRoute, expressRoute, req.path); //, methods[method]);
      const keys = [];
      const regexp = pathToRegexp(methods[method].expressRoute, keys);
      const matchedRoute = regexp.exec(path);

      if (matchedRoute) {
        console.log('core_mw: matchRoute', matchedRoute);
        console.log('core_mw: matchRoute:keys', keys);
        // TODO is this a good enough test
        const paramKeys = keys.map(k => k.name);
        const paramsVals = matchedRoute.slice(1);
        const pathParams = _.zipObject(paramKeys, paramsVals);
        console.log('core_mw: create params', pathParams);
        return {
          expressRoute,
          openApiRoute,
          pathParams,
        };
      }
    }

    return null;
  }
}

export function validateRequest({
  loggingKey,
  enableObjectCoercion,
  errorTransformer,
}) {
  return (req, res, next) => {
    const { path: rpath, method, route } = req;
    console.log(
      'validateRequest_mw: ',
      rpath,
      route,
      method,
      req.openapi.openApiRoute
    );
    const path = req.openapi.openApiRoute;
    if (path && method) {
      const documentedRoute = req.openapi.apiDoc.paths[path];
      if (!documentedRoute) {
        // TODO add option to enable undocumented routes to pass through without 404
        // TODO this should not occur as we only set up middleware and params on routes defined in the openapi spec
        const { statusCode, error } = sendValidationResultError(
          res,
          notFoundError(path),
          errorTransformer
        );
        return res.status(statusCode).json(error);
      }

      const schema = documentedRoute[method.toLowerCase()];
      if (!schema) {
        const { statusCode, error } = sendValidationResultError(
          res,
          methodNotAllowed(path, method),
          errorTransformer
        );
        return res.status(statusCode).json(error);
      }

      console.log('validateRequest_mw: schema', schema);
      // TODO coercer and request validator fail on null parameters
      if (!schema.parameters) {
        schema.parameters = [];
      }

      console.log(
        '----about to coerce',
        req.params,
        '-',
        req.openapi.pathParams
      );
      if (Object.keys(req.params).length === 0 && req.openapi.pathParams) {
        console.log('-----------OVERRIDING PATH PARAMS');
        req.params = req.openapi.pathParams;
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

      console.log('----about to validate', req.params);
      const validationResult = new OpenAPIRequestValidator({
        errorTransformer,
        parameters: schema.parameters || [],
        requestBody: schema.requestBody,
        // schemas: this.apiDoc.definitions, // v2
        componentSchemas: req.openapi.apiDoc.components // v3
          ? req.openapi.apiDoc.components.schemas
          : undefined,
      }).validate(req);

      if (validationResult && validationResult.errors.length > 0) {
        const { statusCode, error } = sendValidationResultError(
          res,
          validationResult,
          errorTransformer
        );
        return res.status(statusCode).json(error);
      }
    }
    next();
  };
}

// function transformValidationResult(validationResult, transformer) {
function sendValidationResultError(res, validationResult, transformer) {
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
  return res.status(x.statusCode).json(x.error);
}

// function identifyRoutePath(route, path) {
//   return Array.isArray(route.path)
//     ? route.path.find(r => r === path)
//     : route.path || path;
// }

export function httpNotFound(req, res, next) {
  // if (req.openapi.path)
}
