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
  const { expressRoute, method, schema } = route;
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
      if (!tmpModules[modulePath][oId]) {
        // if oId is not found only module, try the module's default export
        tmpModules[modulePath] = tmpModules[modulePath].default;
      }
    }
    if (!tmpModules[modulePath][oId]) {
      throw Error(
        `Could not find 'x-eov-operation-handler' with id ${oId} in module '${modulePath}'. Make sure operation '${oId}' defined in your API spec exists as a handler function in '${modulePath}'.`,
      );
    }

    const handler = tmpModules[modulePath][oId];
    cache[cacheKey] = handler;
    return handler;
  }
}

export function modulePathResolver(
  handlersPath: string,
  route: RouteMetadata,
  apiDoc: OpenAPIV3.Document,
): RequestHandler {
  const [controller, method] = route.schema['operationId'].split('.');

  const modulePath = path.join(handlersPath, controller);
  const handler = require(modulePath);

  if (handler[method] === undefined) {
    throw new Error(
      `Could not find a [${method}] function in ${modulePath} when trying to route [${route.method} ${route.expressRoute}].`,
    );
  }

  return handler[method];
}
