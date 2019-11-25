import * as _ from 'lodash';
import { pathToRegexp } from 'path-to-regexp';
import { Response, NextFunction } from 'express';
import { OpenApiContext } from '../framework/openapi.context';
import {
  OpenApiRequest,
  OpenApiRequestHandler,
  OpenApiRequestMetadata,
} from '../framework/types';

export function applyOpenApiMetadata(
  openApiContext: OpenApiContext,
): OpenApiRequestHandler {
  return (req: OpenApiRequest, res: Response, next: NextFunction): void => {
    const matched = lookupRoute(req);
    if (matched) {
      const { expressRoute, openApiRoute, pathParams, schema } = matched;
      req.openapi = {
        expressRoute: expressRoute,
        openApiRoute: openApiRoute,
        pathParams: pathParams,
        schema: schema,
      };
      req.params = pathParams;
    } else if (openApiContext.isManagedRoute(req.path)) {
      req.openapi = {};
    }
    -next();
  };

  function lookupRoute(req: OpenApiRequest): OpenApiRequestMetadata {
    const path = req.path;
    const method = req.method;
    const routeEntries = Object.entries(openApiContext.expressRouteMap);
    for (const [expressRoute, methods] of routeEntries) {
      const schema = methods[method];
      const routePair = openApiContext.routePair(expressRoute);
      const openApiRoute = routePair.openApiRoute;

      const keys = [];
      const strict = !!req.app.enabled('strict routing');
      const sensitive = !!req.app.enabled('case sensitive routing');
      const pathOpts = {
        sensitive,
        strict,
      };
      const regexp = pathToRegexp(expressRoute, keys, pathOpts);
      const matchedRoute = regexp.exec(path);

      if (matchedRoute) {
        const paramKeys = keys.map(k => k.name);
        const paramsVals = matchedRoute.slice(1);
        const pathParams = _.zipObject(paramKeys, paramsVals);

        return {
          schema,
          // schema may or may not contain express and openApi routes,
          // thus we include them here
          expressRoute,
          openApiRoute,
          pathParams,
        };
      }
    }

    return null;
  }
}
