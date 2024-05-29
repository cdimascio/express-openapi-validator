import * as path from 'path';
import { RequestHandler } from 'express';
import { RouteMetadata } from './framework/openapi.spec.loader';
import { OpenAPIV3 } from './framework/types';
import { fileURLToPath, pathToFileURL } from 'url';

// Prevent TypeScript from replacing dynamic import with require()
const dynamicImport = new Function('specifier', 'return import(specifier)');

const cache = {};
export async function defaultResolver(
  handlersPath: string | URL,
  route: RouteMetadata,
  apiDoc: OpenAPIV3.Document,
): Promise<RequestHandler> {
  const { basePath, expressRoute, openApiRoute, method } = route;
  const pathKey = openApiRoute.substring(basePath.length);
  const schema = apiDoc.paths[pathKey][method.toLowerCase()];
  const oId = schema['x-eov-operation-id'] || schema['operationId'];
  const handlerName = schema['x-eov-operation-handler'];

  const cacheKey = `${expressRoute}-${method}-${oId}-${handlerName}`;
  if (cache[cacheKey]) return cache[cacheKey];

  if (oId && !handlerName) {
    throw Error(
      `found x-eov-operation-id for route ${method} - ${expressRoute}]. x-eov-operation-handler required.`,
    );
  }
  if (!oId && handlerName) {
    throw Error(
      `found x-eov-operation-handler for route [${method} - ${expressRoute}]. operationId or x-eov-operation-id required.`,
    );
  }

  const isHandlerPath = !!handlersPath && (typeof handlersPath === 'string' || handlersPath instanceof URL);
  if (oId && handlerName && isHandlerPath) {
    const modulePath = typeof handlersPath === 'string'
      ? path.join(handlersPath, handlerName)
      : path.join(fileURLToPath(handlersPath), handlerName);
    const importedModule = typeof handlersPath === 'string'
      ? require(modulePath)
      : await dynamicImport(pathToFileURL(modulePath).toString());

    const handler = importedModule[oId] || importedModule.default?.[oId] || importedModule.default;

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
