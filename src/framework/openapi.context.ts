import { OpenAPIV3 } from './types';
import { Spec } from './openapi.spec.loader';

export class OpenApiContext {
  public readonly apiDoc: OpenAPIV3.Document;
  public readonly expressRouteMap = {};
  public readonly openApiRouteMap = {};
  public readonly routes = [];
  private basePaths: string[];

  constructor(spec: Spec) {
    this.apiDoc = spec.apiDoc;
    this.basePaths = spec.basePaths;
    this.routes = this.initializeRoutes(spec.routes);
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
