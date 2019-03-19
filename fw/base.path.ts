import { OpenAPIV3 } from 'openapi-types';
import { URL } from 'url';

export default class BasePath {
  public readonly variables: { [key: string]: { enum: string[] } } = {};
  public readonly path: string = '';

  constructor(server: OpenAPIV3.ServerObject) {
    // break the url into parts
    // baseUrl param added to make the parsing of relative paths go well
    const serverUrl = new URL(server.url, 'http://localhost');
    console.log(serverUrl);
    let urlPath = decodeURI(serverUrl.pathname).replace(/\/$/, '');
    if (/{\w+}/.test(urlPath)) {
      // has variable that we need to check out
      urlPath = urlPath.replace(/{(\w+)}/g, (substring, p1) => `:${p1}`);
    }
    console.log(urlPath);
    this.path = urlPath;
    for (const variable in server.variables) {
      if (server.variables.hasOwnProperty(variable)) {
        this.variables[variable] = { enum: server.variables[variable].enum };
      }
    }
  }

  public hasVariables() {
    return Object.keys(this.variables).length > 0;
  }

  public static fromServers(servers: OpenAPIV3.ServerObject[]) {
    if (!servers) {
      return [new BasePath({ url: '' })];
    }
    return servers.map(server => new BasePath(server));
  }
}
