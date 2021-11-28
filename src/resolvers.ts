import * as path from 'path';
import { RequestHandler } from 'express';
import { RouteMetadata } from './framework/openapi.spec.loader';
import { OpenAPIV3 } from './framework/types';

const cache = {};
export function defaultResolver(
  handlersPath: string,
  route: RouteMetadata,
  apiDoc: OpenAPIV3.Document,
): RequestHandler {
  const tmpModules = {};
  const { basePath, expressRoute, openApiRoute, method } = route;
  const pathKey = openApiRoute.substring(basePath.length);
  const schema = apiDoc.paths[pathKey][method.toLowerCase()];
  const oId = schema['x-eov-operation-id'] || schema['operationId'];
  const baseName = schema['x-eov-operation-handler'];

  const cacheKey = `${expressRoute}-${method}-${oId}-${baseName}`;
  if (cache[cacheKey]) return cache[cacheKey];

  if (oId && !baseName) {
    throw Error(
      `found x-eov-operation-id for route ${method} - ${expressRoute}]. x-eov-operation-handler required.`,
    );
  }
  if (!oId && baseName) {
    throw Error(
      `found x-eov-operation-handler for route [${method} - ${expressRoute}]. operationId or x-eov-operation-id required.`,
    );
  }
  if (oId && baseName && typeof handlersPath === 'string') {
    const modulePath = path.join(handlersPath, baseName);
    if (!tmpModules[modulePath]) {
      tmpModules[modulePath] = require(modulePath);
    }

    const handler = tmpModules[modulePath][oId] || tmpModules[modulePath].default;

    if (!handler) {
      throw Error(
        `Could not find 'x-eov-operation-handler' with id ${oId} in module '${modulePath}'. Make sure operation '${oId}' defined in your API spec exists as a handler function (or module has a default export) in '${modulePath}'.`,
      );
    }

    cache[cacheKey] = handler;
    return handler;
  }
}

export function modulePathResolver(
  handlersPath: string,
  route: RouteMetadata,
  apiDoc: OpenAPIV3.Document,
): RequestHandler {
  const pathKey = route.openApiRoute.substring(route.basePath.length);
  const schema = apiDoc.paths[pathKey][route.method.toLowerCase()];
  const [controller, method] = schema['operationId'].split('.');

  const modulePath = path.join(handlersPath, controller);
  const handler = require(modulePath);

  if (handler[method] === undefined) {
    throw new Error(
      `Could not find a [${method}] function in ${modulePath} when trying to route [${route.method} ${route.expressRoute}].`,
    );
  }

  return handler[method];
}
