import { OpenApiSpecLoader } from './openapi.spec.loader';
import { OpenAPIFrameworkArgs } from './index';
import { OpenAPIV3 } from './types';

export class OpenApiContext {
  // TODO cleanup structure (group related functionality)
  expressRouteMap = {};
  openApiRouteMap = {};
  routes = [];
  apiDoc: OpenAPIV3.Document;
  private basePaths: Set<string>;
  constructor(opts: OpenAPIFrameworkArgs) {
    const openApiRouteDiscovery = new OpenApiSpecLoader(opts);
    const { apiDoc, basePaths, routes } = openApiRouteDiscovery.load();

    this.apiDoc = apiDoc;
    this.basePaths = <Set<string>>basePaths;
    this.routes = this.initializeRoutes(routes);
  }

  private initializeRoutes(routes) {
    for (const route of routes) {
      const routeMethods = this.expressRouteMap[route.expressRoute];
      if (routeMethods) {
        routeMethods[route.method] = route.schema;
      } else {
        const { schema, openApiRoute, expressRoute } = route;
        const routeMethod = { [route.method]: schema };
        const routeDetails = {
          _openApiRoute: openApiRoute,
          _expressRoute: expressRoute,
          ...routeMethod,
        };
        this.expressRouteMap[route.expressRoute] = routeDetails;
        this.openApiRouteMap[route.openApiRoute] = routeDetails;
      }
    }
    return routes;
  }

  isManagedRoute(path) {
    for (const bp of this.basePaths) {
      if (path.startsWith(bp)) return true;
    }
    return false;
  }

  routePair(route) {
    const methods = this.methods(route);
    if (methods) {
      return {
        expressRoute: methods._expressRoute,
        openApiRoute: methods._openApiRoute,
      };
    }
    return null;
  }

  methods(route) {
    const expressRouteMethods = this.expressRouteMap[route];
    if (expressRouteMethods) return expressRouteMethods;
    const openApiRouteMethods = this.openApiRouteMap[route];
    return openApiRouteMethods;
  }

  schema(route, method) {
    const methods = this.methods(route);
    if (methods) {
      const schema = methods[method];
      return schema;
    }
    return null;
  }
}
