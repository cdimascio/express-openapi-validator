import * as _ from 'lodash';
import OpenAPIFramework, {
  OpenAPIFrameworkArgs,
  OpenAPIFrameworkConstructorArgs,
} from './index';
import { OpenAPIFrameworkAPIContext, OpenAPIV3 } from './types';

export interface Spec {
  apiDoc: OpenAPIV3.Document;
  basePaths: string[];
  routes: any[]; // TODO create tye
}
export class OpenApiSpecLoader {
  private opts: OpenAPIFrameworkArgs;
  constructor(opts: OpenAPIFrameworkArgs) {
    this.opts = opts;
  }

  public load(): Spec {
    const framework = this.createFramework(this.opts);
    const routes = this.discoverRoutes(framework, framework.basePaths);
    return {
      apiDoc: framework.apiDoc,
      basePaths: framework.basePaths,
      routes,
    };
  }

  private createFramework(args: OpenAPIFrameworkArgs): OpenAPIFramework {
    const frameworkArgs: OpenAPIFrameworkConstructorArgs = {
      featureType: 'middleware',
      name: 'express-openapi-validator',
      ...(args as OpenAPIFrameworkArgs),
    };

    const framework = new OpenAPIFramework(frameworkArgs);
    return framework;
  }

  private discoverRoutes(
    framework: OpenAPIFramework,
    basePaths: string[],
  ): any[] { // TODO create type
    const routes = [];
    const toExpressParams = this.toExpressParams;
    framework.initialize({
      visitApi(ctx: OpenAPIFrameworkAPIContext) {
        const apiDoc = ctx.getApiDoc();
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
              ((methods as any).parameters || []).forEach(parameter =>
                schemaParameters.add(parameter),
              );
              schema.parameters = Array.from(schemaParameters);
              const pathParams = new Set();
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
    return routes;
  }

  private toExpressParams(part) {
    return part.replace(/\{([^}]+)}/g, ':$1');
  }
}
