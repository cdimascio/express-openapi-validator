import * as _ from 'lodash';
import { OpenAPIFramework } from './index';
import {
  OpenAPIFrameworkAPIContext,
  OpenAPIV3,
  OpenAPIFrameworkArgs,
} from './types';

export interface Spec {
  apiDoc: OpenAPIV3.Document;
  basePaths: string[];
  routes: RouteMetadata[];
}

export interface RouteMetadata {
  expressRoute: string;
  openApiRoute: string;
  method: string;
  pathParams: string[];
  schema: OpenAPIV3.OperationObject;
}

interface DiscoveredRoutes {
  apiDoc: OpenAPIV3.Document;
  basePaths: string[];
  routes: RouteMetadata[];
}
export class OpenApiSpecLoader {
  private readonly framework: OpenAPIFramework;
  constructor(opts: OpenAPIFrameworkArgs) {
    this.framework = new OpenAPIFramework(opts);
  }

  public async load(): Promise<Spec> {
    const routes = await this.discoverRoutes();
    return routes;
    // const { apiDoc, basePaths } = this.framework;
    // const routes = this.discoverRoutes();
    // return {
    //   apiDoc,
    //   basePaths,
    //   routes,
    // };
  }

  private async discoverRoutes(): Promise<DiscoveredRoutes> {
    const routes: RouteMetadata[] = [];
    const toExpressParams = this.toExpressParams;
    // const basePaths = this.framework.basePaths;
    // let apiDoc: OpenAPIV3.Document = null;
    // let basePaths: string[] = null;
    const { apiDoc, basePaths } = await this.framework.initialize({
      visitApi(ctx: OpenAPIFrameworkAPIContext) {
        const apiDoc = ctx.getApiDoc();
        const basePaths = ctx.basePaths;
        for (const bpa of basePaths) {
          const bp = bpa.replace(/\/$/, '');
          for (const [path, methods] of Object.entries(apiDoc.paths)) {
            for (const [method, schema] of Object.entries(methods)) {
              if (['parameters', 'summary', 'description'].includes(method)) {
                continue;
              }
              const schemaParameters = new Set();
              (schema.parameters || []).forEach(parameter =>
                schemaParameters.add(parameter),
              );
              (methods.parameters || []).forEach(parameter =>
                schemaParameters.add(parameter),
              );
              schema.parameters = Array.from(schemaParameters);
              const pathParams = new Set<string>();
              for (const param of schema.parameters) {
                if (param.in === 'path') {
                  pathParams.add(param.name);
                }
              }
              const openApiRoute = `${bp}${path}`;
              const expressRoute = `${openApiRoute}`
                .split('/')
                .map(toExpressParams)
                .join('/');

              routes.push({
                expressRoute,
                openApiRoute,
                method: method.toUpperCase(),
                pathParams: Array.from(pathParams),
                schema,
              });
            }
          }
        }
      },
    });
    return {
      apiDoc,
      basePaths,
      routes,
    };
  }

  private toExpressParams(part: string): string {
    return part.replace(/\{([^}]+)}/g, ':$1');
  }
}
