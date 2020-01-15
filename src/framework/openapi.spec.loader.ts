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
// Sort routes by most specific to least specific i.e. static routes before dynamic
// e.g. /users/my_route before /users/{id}
// Exported for tests
export const sortRoutes = (r1, r2) => {
  const e1 = r1.expressRoute.replace(/\/:/g, '/~');
  const e2 = r2.expressRoute.replace(/\/:/g, '/~');
  return e1 > e2 ? 1 : -1;
};

export class OpenApiSpecLoader {
  private readonly framework: OpenAPIFramework;
  constructor(opts: OpenAPIFrameworkArgs) {
    this.framework = new OpenAPIFramework(opts);
  }

  public async load(): Promise<Spec> {
    return this.discoverRoutes();
  }

  public loadSync(): Spec {
    const discoverRoutesSync = () => {
      let savedError,
        savedResult: Spec,
        done = false;
      const discoverRoutes = require('util').callbackify(
        this.discoverRoutes.bind(this),
      );
      // const discoverRoutes: any = this.discoverRoutes.bind(this);
      discoverRoutes((error, result) => {
        savedError = error;
        savedResult = result;
        done = true;
      });

      // Deasync should be used here any nowhere else!
      // it is an optional peer dep
      // Only necessary for those looking to use a blocking
      // intial openapi parse to resolve json-schema-refs
      require('deasync').loopWhile(() => !done);

      if (savedError) throw savedError;
      return savedResult;
    };
    return discoverRoutesSync();
  }

  private async discoverRoutes(): Promise<DiscoveredRoutes> {
    const routes: RouteMetadata[] = [];
    const toExpressParams = this.toExpressParams;
    // const basePaths = this.framework.basePaths;
    // let apiDoc: OpenAPIV3.Document = null;
    // let basePaths: string[] = null;
    const { apiDoc, basePaths } = await this.framework.initialize({
      visitApi(ctx: OpenAPIFrameworkAPIContext): void {
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
              (schema.parameters ?? []).forEach(parameter =>
                schemaParameters.add(parameter),
              );
              (methods.parameters ?? []).forEach(parameter =>
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

    routes.sort(sortRoutes);

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
