import * as _zipObject from 'lodash.zipobject';
import { pathToRegexp } from 'path-to-regexp';
import { Response, NextFunction } from 'express';
import { OpenApiContext } from '../framework/openapi.context';
import {
  BadRequest,
  MethodNotAllowed,
  NotFound,
  OpenApiRequest,
  OpenApiRequestHandler,
  OpenApiRequestMetadata,
  OpenAPIV3,
} from '../framework/types';
import { httpMethods } from './parsers/schema.preprocessor';

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
      if (!schema) {
        // Prevents validation for routes which match on path but mismatch on method
        if(openApiContext.ignoreUndocumented) {
          return next();
        }
        throw new MethodNotAllowed({
          path: req.path,
          message: `${req.method} method not allowed`,
          headers: {
            Allow: Object.keys(openApiContext.openApiRouteMap[openApiRoute])
              .filter((key) => httpMethods.has(key.toLowerCase()))
              .join(', '),
          },
        });
      }
      req.openapi = {
        expressRoute: expressRoute,
        openApiRoute: openApiRoute,
        pathParams: pathParams,
        schema: schema,
      };
      req.params = pathParams;
      if (responseApiDoc) {
        // add the response schema if validating responses
        (<any>req.openapi)._responseSchema = (<any>matched)._responseSchema;
      }
    } else if (openApiContext.isManagedRoute(path) && !openApiContext.ignoreUndocumented) {
      throw new NotFound({
        path: req.path,
        message: 'not found',
      });
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
        try {
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
        } catch (error) {
          throw new BadRequest({
            path: req.path,
            message: `malformed uri'`,
          });
        }
      }
    }

    return null;
  }
}
