import { OpenAPIV3 } from './types';
import { Spec, RouteMetadata } from './openapi.spec.loader';


export interface RoutePair {
  expressRoute: string;
  openApiRoute: string;
}
export class OpenApiContext {
  public readonly apiDoc: OpenAPIV3.Document;
  public readonly expressRouteMap = {};
  public readonly openApiRouteMap = {};
  public readonly routes: RouteMetadata[] = [];
  private readonly basePaths: string[];
  private readonly ignorePaths: RegExp;

  constructor(spec: Spec, ignorePaths: RegExp) {
    this.apiDoc = spec.apiDoc;
    this.basePaths = spec.basePaths;
    this.routes = spec.routes;
    this.ignorePaths = ignorePaths;
    this.buildRouteMaps(spec.routes);
  }

  public isManagedRoute(path: string): boolean {
    for (const bp of this.basePaths) {
      if (path.startsWith(bp) && !this.ignorePaths?.test(path)) {
        return true;
      }
    }
    return false;
  }

  public routePair(route: string): RoutePair {
    const methods = this.methods(route);
    if (methods) {
      return {
        expressRoute: methods._expressRoute,
        openApiRoute: methods._openApiRoute,
      };
    }
    return null;
  }

  private methods(route: string) {
    const expressRouteMethods = this.expressRouteMap[route];
    if (expressRouteMethods) return expressRouteMethods;
    const openApiRouteMethods = this.openApiRouteMap[route];
    return openApiRouteMethods;
  }

  // side-effecting builds express/openapi route maps
  private buildRouteMaps(routes: RouteMetadata[]): void {
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
  }
}
