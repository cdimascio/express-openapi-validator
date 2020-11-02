import { compile } from 'path-to-regexp';
import { OpenAPIV3 } from './types';

interface ServerUrlVariables {
  [key: string]: ServerUrlValues;
}
interface ServerUrlValues {
  enum: string[];
  default?: string;
}

export class BasePath {
  public readonly variables: ServerUrlVariables = {};
  public readonly expressPath: string = '';
  private allPaths: string[] = null;

  constructor(server: OpenAPIV3.ServerObject) {
    // break the url into parts
    // baseUrl param added to make the parsing of relative paths go well
    let urlPath = this.findUrlPath(server.url);
    if (/:/.test(urlPath)) {
      // escape colons as (any at this point) do not signify express route params.
      // this is an openapi base path, thus route params are wrapped in braces {}, 
      // not prefixed by colon : (like express route params)
      urlPath = urlPath.replace(':','\\:')
    }
    if (/{\w+}/.test(urlPath)) {
      // has variable that we need to check out
      urlPath = urlPath.replace(/{(\w+)}/g, (substring, p1) => `:${p1}(.*)`);
    }
    this.expressPath = urlPath;
    for (const variable in server.variables) {
      if (server.variables.hasOwnProperty(variable)) {
        const v = server.variables[variable];
        const enums = v.enum ?? [];
        if (enums.length === 0 && v.default) enums.push(v.default);

        this.variables[variable] = {
          enum: enums,
          default: v.default,
        };
      }
    }
  }

  public static fromServers(servers: OpenAPIV3.ServerObject[]): BasePath[] {
    if (!servers) {
      return [new BasePath({ url: '' })];
    }
    return servers.map(server => new BasePath(server));
  }

  public hasVariables(): boolean {
    return Object.keys(this.variables).length > 0;
  }

  public all(): string[] {
    if (!this.hasVariables()) return [this.expressPath];
    if (this.allPaths) return this.allPaths;
    // TODO performance optimization
    // ignore variables that are not part of path params
    const allParams = Object.entries(this.variables).reduce((acc, v) => {
      const [key, value] = v;
      const params = value.enum.map(e => ({
        [key]: e,
      }));
      acc.push(params);
      return acc;
    }, []);

    const allParamCombos = cartesian(...allParams);
    const toPath = compile(this.expressPath);
    const paths = new Set<string>();
    for (const combo of allParamCombos) {
      paths.add(toPath(combo));
    }
    this.allPaths = Array.from(paths);
    return this.allPaths;
  }

  private findUrlPath(u: string): string {
    const findColonSlashSlash = p => {
      const r = /:\/\//.exec(p);
      if (r) return r.index;
      return -1;
    };
    const findFirstSlash = p => {
      const r = /\//.exec(p);
      if (r) return r.index;
      return -1;
    };

    const fcssIdx = findColonSlashSlash(u);
    const startSearchIdx = fcssIdx !== -1 ? fcssIdx + 3 : 0;
    const startPathIdx = findFirstSlash(u.substring(startSearchIdx));
    if (startPathIdx === -1) return '/';

    const pathIdx = startPathIdx + startSearchIdx;
    const path = u.substring(pathIdx);
    // ensure a trailing slash is always present
    return path[path.length - 1] === '/' ? path : path + '/';
  }
}

function cartesian(...arg) {
  const r = [],
    max = arg.length - 1;
  function helper(obj, i: number) {
    const values = arg[i];
    for (var j = 0, l = values.length; j < l; j++) {
      const a = { ...obj };
      const key = Object.keys(values[j])[0];
      a[key] = values[j][key];
      if (i == max) r.push(a);
      else helper(a, i + 1);
    }
  }
  helper({}, 0);
  return r;
}
