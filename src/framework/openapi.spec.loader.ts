import { stringify, Token, TokenData } from 'path-to-regexp';
import { dereferenceParameter } from '../middlewares/parsers/util';
import { OpenAPIFramework } from './index';
import {
  OpenAPIFrameworkAPIContext,
  OpenAPIV3,
  OpenAPIFrameworkArgs,
} from './types';

export interface Spec {
  apiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1;
  basePaths: string[];
  routes: RouteMetadata[];
  serial: number;
}

export interface RouteMetadata {
  basePath: string;
  expressRoute: string;
  openApiRoute: string;
  method: string;
  pathParams: string[];
}

interface DiscoveredRoutes {
  apiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1;
  basePaths: string[];
  routes: RouteMetadata[];
  serial: number;
}
// Sort routes by most specific to least specific i.e. static routes before dynamic
// e.g. /users/my_route before /users/{id}
// Exported for tests
export const sortRoutes = (r1, r2) => {
  const e1 = r1.expressRoute.replace(/\/:/g, '/~');
  const e2 = r2.expressRoute.replace(/\/:/g, '/~');
  if (e1.startsWith(e2)) return -1;
  else if (e2.startsWith(e1)) return 1;
  return e1 > e2 ? 1 : -1;
};

// Uniquely identify the Spec that is emitted
let serial = 0;

export class OpenApiSpecLoader {
  private readonly framework: OpenAPIFramework;
  constructor(opts: OpenAPIFrameworkArgs) {
    this.framework = new OpenAPIFramework(opts);
  }

  public async load(): Promise<Spec> {
    return this.discoverRoutes();
  }

  private async discoverRoutes(): Promise<DiscoveredRoutes> {
    const routes: RouteMetadata[] = [];
    const toExpressParams = this.toExpressParams;
    // const basePaths = this.framework.basePaths;
    // let apiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1 = null;
    // let basePaths: string[] = null;
    const { apiDoc, basePaths } = await this.framework.initialize({
      visitApi(ctx: OpenAPIFrameworkAPIContext): void {
        const apiDoc = ctx.getApiDoc();
        const basePaths = ctx.basePaths;
        for (const bpa of basePaths) {
          const bp = bpa.replace(/\/$/, '');
          if (apiDoc.paths) {
            for (const [path, methods] of Object.entries(apiDoc.paths)) {
              for (const [method, schema] of Object.entries(methods)) {
                if (
                  method.startsWith('x-') ||
                  ['parameters', 'summary', 'description'].includes(method)
                ) {
                  continue;
                }

                const pathParams = [
                  ...(schema.parameters ?? []),
                  ...(methods.parameters ?? []),
                ]
                  .map(param => dereferenceParameter(apiDoc, param))
                  .filter(param => param.in === 'path')
                  .map(param => param.name);

                const openApiRoute = `${bp}${path}`;
                const expressRoute = toExpressParams(openApiRoute);

                routes.push({
                  basePath: bp,
                  expressRoute,
                  openApiRoute,
                  method: method.toUpperCase(),
                  pathParams: Array.from(new Set(pathParams)),
                });
              }
            }
          }
        }
      },
    });

    routes.sort(sortRoutes);

    serial = serial + 1;
    return {
      apiDoc,
      basePaths,
      routes,
      serial
    };
  }

  private toExpressParams(path: string): string {
    // convert an openapi path template to a path-to-regexp route
    // /path/{id} => /path/:id
    // /path/{path}* => /path/*path
    // /path/{path}(*) => /path/*path
    // /path/*path => /path/*path
    // (a wildcard must be a whole path segment)
    // all other characters match literally. stringify escapes the ones
    // path-to-regexp treats as syntax, e.g. ( ) * + ? ! [ ] { } :
    // /People('{name}') => /People\(':name'\)
    const params = /(?<=\/)(?:{([^}]+)}\(?\*\)?|\*(\w+))(?=\/|$)|{([^}]+)}/g;
    const tokens: Token[] = [];
    const addText = (value: string) => {
      if (value) tokens.push({ type: 'text', value });
    };
    let textStart = 0;
    let match: RegExpExecArray | null;
    while ((match = params.exec(path))) {
      const [found, wildcard, rawWildcard, param] = match;
      addText(path.slice(textStart, match.index));
      tokens.push(
        param
          ? { type: 'param', name: param }
          : { type: 'wildcard', name: wildcard ?? rawWildcard },
      );
      textStart = match.index + found.length;
    }
    addText(path.slice(textStart));
    return stringify(new TokenData(tokens));
  }
}
