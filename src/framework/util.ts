import { OpenAPIV3 } from 'openapi-types';
import BasePath from './base.path';
import * as fs from 'fs';
import * as jsYaml from 'js-yaml';
import * as path from 'path';

export function assertRegExpAndSecurity(framework, tuple) {
  if (!Array.isArray(tuple)) {
    throw new Error(
      `${framework.name}args.pathSecurity expects an array of tuples.`
    );
  } else if (!(tuple[0] instanceof RegExp)) {
    throw new Error(
      `${
        framework.name
      }args.pathSecurity tuples expect the first argument to be a RegExp.`
    );
  } else if (!Array.isArray(tuple[1])) {
    throw new Error(
      `${
        framework.name
      }args.pathSecurity tuples expect the second argument to be a security Array.`
    );
  }
}

export function copy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function loadSpecFile(filePath) {
  if (typeof filePath === 'string') {
    const absolutePath = path.resolve(process.cwd(), filePath);
    if (fs.existsSync(absolutePath)) {
      try {
        // json or module
        return require(absolutePath);
      } catch (e) {
        return fs.readFileSync(absolutePath, 'utf8');
      }
    }
  }
  return null;
}

export function handleYaml(apiDoc) {
  return typeof apiDoc === 'string'
    ? jsYaml.safeLoad(apiDoc, { json: true })
    : apiDoc;
}

export function sortApiDocTags(apiDoc) {
  if (apiDoc && Array.isArray(apiDoc.tags)) {
    apiDoc.tags.sort((a, b) => {
      return a.name > b.name;
    });
  }
}

export function getBasePathsFromServers(
  servers: OpenAPIV3.ServerObject[]
): BasePath[] {
  if (!servers) {
    return [new BasePath({ url: '' })];
  }
  const basePathsMap: { [key: string]: BasePath } = {};
  for (const server of servers) {
    const basePath = new BasePath(server);
    basePathsMap[basePath.path] = basePath;
  }
  return Object.keys(basePathsMap).map(key => basePathsMap[key]);
}
