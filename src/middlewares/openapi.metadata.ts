import * as _zipObject from 'lodash.zipobject';
import { pathToRegexp } from 'path-to-regexp';
import { Response, NextFunction } from 'express';
import { OpenApiContext } from '../framework/openapi.context';
import {
  OpenApiRequest,
  OpenApiRequestHandler,
  OpenApiRequestMetadata,
  OpenAPIV3,
} from '../framework/types';

export function applyOpenApiMetadata(
  openApiContext: OpenApiContext,
  responseApiDoc: OpenAPIV3.Document,
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
      const parameters = [];
      for (const param of schema?.parameters || []) {
        if (param.$ref) {
          const p = param.$ref.replace('#/components/parameters/', '');
          parameters.push(
            openApiContext.apiDoc.components.parameters[p]
          );
        } else {
          parameters.push(param);
        }
      }
      req.openapi = {
        expressRoute: expressRoute,
        openApiRoute: openApiRoute,
        pathParams: pathParams,
        schema: schema,
        parameters: parameters,
      };
      req.params = pathParams;
      if (responseApiDoc) {
        // add the response schema if validating responses
        (<any>req.openapi)._responseSchema = (<any>matched)._responseSchema;
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
      const routePair = openApiContext.routePair(expressRoute);
      const openApiRoute = routePair.openApiRoute;
      const pathKey = openApiRoute.substring((<any>methods).basePath.length);
      const schema = openApiContext.apiDoc.paths[pathKey][method.toLowerCase()];
      const _schema = responseApiDoc?.paths[pathKey][method.toLowerCase()];

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

        const r = {
          schema,
          expressRoute,
          openApiRoute,
          pathParams,
        };
        (<any>r)._responseSchema = _schema;
        return r;
      }
    }

    return null;
  }
}
