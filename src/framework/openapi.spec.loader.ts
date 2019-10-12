import * as _ from 'lodash';
import OpenAPIFramework, {
  OpenAPIFrameworkArgs,
  OpenAPIFrameworkConstructorArgs,
} from './index';
import { OpenAPIFrameworkAPIContext } from './types';

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
      bp.all().forEach(path => acc.add(path));
      return acc;
    }, new Set<string>());
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
        const security = apiDoc.security;
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

              // add apply any general defined security 
              const moddedSchema =
                security || schema.security
                  ? {
                      schema,
                      security: [
                        ...(security || []),
                        ...(schema.security || []),
                      ],
                    }
                  : { ...schema };
              routes.push({
                expressRoute,
                openApiRoute,
                method: method.toUpperCase(),
                pathParams: Array.from(pathParams),
                schema: moddedSchema,
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
