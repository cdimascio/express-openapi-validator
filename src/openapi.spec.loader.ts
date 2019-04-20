import * as _ from 'lodash';
import OpenAPIFramework, {
  OpenAPIFrameworkArgs,
  OpenAPIFrameworkConstructorArgs,
} from './framework';
import { OpenAPIFrameworkAPIContext } from './framework/types';

export class OpenApiSpecLoader {
  private opts: OpenAPIFrameworkArgs;
  constructor(opts: OpenAPIFrameworkArgs) {
    this.opts = opts;
  }

  load() {
    const framework = this.createFramework(this.opts);
    const apiDoc = framework.apiDoc || {};
    const bps = framework.basePaths || [];
    const basePaths = bps.reduce((acc, bp) => {
      const all = bp.all().forEach(path => acc.add(path));
      return acc;
    }, new Set());
    const routes = this.discoverRoutes(framework, basePaths);
    return {
      apiDoc,
      basePaths,
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

  private discoverRoutes(framework: OpenAPIFramework, basePaths: Set<string>) {
    const routes = [];
    const toExpressParams = this.toExpressParams;
    framework.initialize({
      visitApi(ctx: OpenAPIFrameworkAPIContext) {
        const apiDoc = ctx.getApiDoc();
        for (const bpa of basePaths) {
          const bp = bpa.replace(/\/$/, '');
          for (const [path, methods] of Object.entries(apiDoc.paths)) {
            for (const [method, schema] of Object.entries(methods)) {
              const pathParams = new Set();
              for (const param of schema.parameters || []) {
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
