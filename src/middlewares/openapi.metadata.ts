const pathToRegexp = require('path-to-regexp');
const _ = require('lodash');
import { OpenApiContext } from '../openapi.context';

export function applyOpenApiMetadata(openApiContext: OpenApiContext) {
  return (req, res, next) => {
    req.openapi = {};
    console.log('applyOpenApiMetadata: applying metadata to request', req.path);
    const matched = matchRoute(req);

    if (matched) {
      const { expressRoute, openApiRoute, pathParams, schema } = matched;
      console.log('applyOpenApiMetadata', expressRoute, openApiRoute);
      req.openapi.expressRoute = expressRoute;
      req.openapi.openApiRoute = openApiRoute;
      req.openapi.pathParams = pathParams;
      req.openapi.schema = schema;
      req.params = pathParams;
    }
    next();
  };

  function matchRoute(req) {
    const path = req.path;
    const method = req.method;
    for (const [expressRoute, methods] of Object.entries(
      openApiContext.expressRouteMap
    )) {
      const schema = methods[method];
      const routePair = openApiContext.routePair(expressRoute);
      const openApiRoute = routePair.openApiRoute;

      const keys = [];
      const regexp = pathToRegexp(expressRoute, keys);
      const matchedRoute = regexp.exec(path);

      if (matchedRoute) {
        console.log('core_mw: matchRoute', matchedRoute);
        console.log('core_mw: matchRoute:keys', keys);
        const paramKeys = keys.map(k => k.name);
        const paramsVals = matchedRoute.slice(1);
        const pathParams = _.zipObject(paramKeys, paramsVals);
        console.log('core_mw: create params', pathParams);
        return {
          schema,
          // schema may or may not contain express and openApi routes, so include them here
          expressRoute,
          openApiRoute,
          pathParams,
        };
      }
    }

    return null;
  }
}
