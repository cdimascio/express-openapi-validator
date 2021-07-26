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
  public readonly ignoreUndocumented: boolean;
  private readonly basePaths: string[];
  private readonly ignorePaths: RegExp | Function;

  constructor(spec: Spec, ignorePaths: RegExp | Function, ignoreUndocumented: boolean = false) {
    this.apiDoc = spec.apiDoc;
    this.basePaths = spec.basePaths;
    this.routes = spec.routes;
    this.ignorePaths = ignorePaths;
    this.ignoreUndocumented = ignoreUndocumented;
    this.buildRouteMaps(spec.routes);
  }

  public isManagedRoute(path: string): boolean {
    for (const bp of this.basePaths) {
      if (path.startsWith(bp) && !this.shouldIgnoreRoute(path)) {
        return true;
      }
    }
    return false;
  }

  public shouldIgnoreRoute(path: string) {
    return typeof this.ignorePaths === 'function' ? this.ignorePaths(path) : this.ignorePaths?.test(path);
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
      const { basePath, expressRoute, openApiRoute, method } = route;
      const routeMethods = this.expressRouteMap[expressRoute];
      const pathKey = openApiRoute.substring(basePath.length);
      const schema = this.apiDoc.paths[pathKey][method.toLowerCase()];
      if (routeMethods) {
        routeMethods[route.method] = schema;
      } else {
        const { basePath, openApiRoute, expressRoute } = route;
        const routeMethod = { [route.method]: schema };
        const routeDetails = {
          basePath,
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
