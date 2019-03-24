import { OpenApiSpecLoader } from './openapi.spec.loader';
import { OpenAPIFrameworkArgs } from './framework';

export class OpenApiContext {
  // TODO cleanup structure (group related functionality)
  expressRouteMap = {};
  openApiRouteMap = {};
  routes = [];
  apiDoc;
  constructor(opts: OpenAPIFrameworkArgs) {
    const openApiRouteDiscovery = new OpenApiSpecLoader(opts);
    const { apiDoc, routes } = openApiRouteDiscovery.load();

    this.apiDoc = apiDoc;
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
