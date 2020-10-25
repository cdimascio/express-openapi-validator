import * as _zipObject from 'lodash.zipobject';
import { pathToRegexp } from 'path-to-regexp';
import * as deepCopy from 'lodash.clonedeep';
import { Response, NextFunction } from 'express';
import { OpenApiContext } from '../framework/openapi.context';
import {
  OpenApiRequest,
  OpenApiRequestHandler,
  OpenApiRequestMetadata,
} from '../framework/types';

export function applyOpenApiMetadata(
  openApiContext: OpenApiContext,
  validateResponses: boolean,
): OpenApiRequestHandler {
  return (req: OpenApiRequest, res: Response, next: NextFunction): void => {
    // note base path is empty when path is fully qualified i.e. req.path.startsWith('')
    const path = req.path.startsWith(req.baseUrl)
      ? req.path
      : `${req.baseUrl}/${req.path}`;
    if (openApiContext.shouldIgnoreRoute(path)) {
      return next();
    }
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

      if (validateResponses) {
        // when validating responses, add a copy of the schema for response validation
        // why? options like 'readOnly' may remove required properties from the schema
        // for example,
        //  if a request param is readOnly and required, required should be removed for the request, but it 
        //  but it should be removed from the response
        //  in order to handle this, we need two copies (when response validation is active)
        const openapi = <any>req.openapi;
        openapi._schema = {
          _res: deepCopy(schema),
        };
      }
    } else if (openApiContext.isManagedRoute(path)) {
      req.openapi = {};
    }
    next();
  };

  function lookupRoute(req: OpenApiRequest): OpenApiRequestMetadata {
    const path = req.originalUrl.split('?')[0];
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
        const paramKeys = keys.map((k) => k.name);
        const paramsVals = matchedRoute.slice(1).map(decodeURIComponent);
        const pathParams = _zipObject(paramKeys, paramsVals);

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
