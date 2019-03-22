import { OpenAPIV3 } from 'openapi-types';
// import { Logger } from 'ts-log';
// import { URL } from 'url';
import BasePath from './base.path';
// import { IOpenAPIFramework } from './types';
// const difunc = require('difunc');
const fs = require('fs');
// const isDir = require('is-dir');
const jsYaml = require('js-yaml');
const path = require('path');

export const METHOD_ALIASES = {
  // HTTP style
  DELETE: 'delete',
  GET: 'get',
  HEAD: 'head',
  OPTIONS: 'options',
  PATCH: 'patch',
  POST: 'post',
  PUT: 'put',

  // js style
  del: 'delete',
  delete: 'delete',
  get: 'get',
  head: 'head',
  options: 'options',
  patch: 'patch',
  post: 'post',
  put: 'put',
};

// export function addOperationTagToApiDoc(apiDoc, tag) {
//   const apiDocTags = apiDoc.tags || [];
//   const availableTags = apiDocTags.map(t => {
//     return t && t.name;
//   });

//   if (availableTags.indexOf(tag) === -1) {
//     apiDocTags.push({
//       name: tag
//     });
//   }

//   apiDoc.tags = apiDocTags;
// }

// function allows(docs, prop, val) {
//   return ![].slice.call(docs).filter(byProperty(prop, val)).length;
// }

// export function allowsCoercionFeature(framework: IOpenAPIFramework, ...docs) {
//   return allows(
//     arguments,
//     `x-${framework.name}-disable-coercion-${framework.featureType}`,
//     true
//   );
// }

// export function allowsDefaultsFeature(framework: IOpenAPIFramework, ...docs) {
//   return allows(
//     arguments,
//     `x-${framework.name}-disable-defaults-${framework.featureType}`,
//     true
//   );
// }

// export function allowsFeatures(framework: IOpenAPIFramework, ...docs) {
//   return allows(
//     docs,
//     `x-${framework.name}-disable-${framework.featureType}`,
//     true
//   );
// }

// export function allowsResponseValidationFeature(
//   framework: IOpenAPIFramework,
//   ...docs
// ) {
//   return allows(
//     arguments,
//     `x-${framework.name}-disable-response-validation-${framework.featureType}`,
//     true
//   );
// }

// export function allowsValidationFeature(framework: IOpenAPIFramework, ...docs) {
//   return allows(
//     docs,
//     `x-${framework.name}-disable-validation-${framework.featureType}`,
//     true
//   );
// }

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

// export function byDefault(param) {
//   return param && 'default' in param;
// }

// export function byDirectory(el) {
//   return isDir.sync(el);
// }

// export function byMethods(name) {
//   // not handling $ref at this time.  Please open an issue if you need this.
//   return name in METHOD_ALIASES;
// }

// function byProperty(property, value) {
//   return obj => {
//     return obj && property in obj && obj[property] === value;
//   };
// }

// export function byRoute(a, b) {
//   if (isDynamicRoute(a.path) && !isDynamicRoute(b.path)) {
//     return 1;
//   }
//   if (!isDynamicRoute(a.path) && isDynamicRoute(b.path)) {
//     return -1;
//   }

//   // invert compare to keep that /{foo} does not beat /{foo}.{bar}
//   return -1 * a.path.localeCompare(b.path);
// }

// export function byString(el) {
//   return typeof el === 'string';
// }

export function copy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// export function getAdditionalFeatures(
//   framework: IOpenAPIFramework,
//   logger: Logger,
//   ...docs
// ) {
//   const additionalFeatures = [];
//   let index = docs.length - 1;
//   const inheritProperty = `x-${framework.name}-inherit-additional-${
//     framework.featureType
//   }`;
//   const additionalProperty = `x-${framework.name}-additional-${
//     framework.featureType
//   }`;

//   while (index > 0) {
//     --index;
//     const currentDoc = docs[index + 1];
//     const parentDoc = docs[index];

//     if (currentDoc && currentDoc[inheritProperty] === false) {
//       break;
//     } else {
//       [].unshift.apply(additionalFeatures, getDocFeature(parentDoc));
//     }
//   }

//   return additionalFeatures.filter(feature => {
//     if (typeof feature === 'function') {
//       return true;
//     } else {
//       logger.warn(
//         `${framework.loggingPrefix}Ignoring ${feature} as ${
//           framework.featureType
//         } in ${additionalProperty} array.`
//       );
//       return false;
//     }
//   });

//   function getDocFeature(doc) {
//     if (doc && Array.isArray(doc[additionalProperty])) {
//       return doc[additionalProperty];
//     }
//   }
// }

// export function getSecurityDefinitionByPath(openapiPath, pathSecurity) {
//   for (let i = pathSecurity.length; i--; ) {
//     const tuple = pathSecurity[i];
//     if (tuple[0].test(openapiPath)) {
//       return tuple[1];
//     }
//   }
// }

// export function getMethodDoc(operationHandler) {
//   const doc =
//     operationHandler.apiDoc ||
//     (Array.isArray(operationHandler)
//       ? operationHandler.slice(-1)[0].apiDoc
//       : null);

//   if (doc) {
//     return copy(doc);
//   }

//   return null;
// }

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

// export function injectDependencies(handlers, dependencies) {
//   if (typeof handlers !== 'function') {
//     return handlers;
//   }
//   return difunc(dependencies || {}, handlers);
// }

// export function isDynamicRoute(route) {
//   return route.indexOf('{') > 0;
// }

// export function resolveParameterRefs(
//   framework: IOpenAPIFramework,
//   parameters,
//   apiDoc
// ) {
//   return parameters.map(parameter => {
//     if (typeof parameter.$ref === 'string') {
//       const apiVersion = apiDoc.swagger ? apiDoc.swagger : apiDoc.openapi;
//       const apiDocParameters =
//         apiVersion === '2.0' ? apiDoc.parameters : apiDoc.components.parameters;
//       const PARAMETER_REF_REGEX =
//         apiVersion === '2.0'
//           ? /^#\/parameters\/(.+)$/
//           : /^#\/components\/parameters\/(.+)$/;
//       const match = PARAMETER_REF_REGEX.exec(parameter.$ref);
//       const definition = match && (apiDocParameters || {})[match[1]];

//       if (!definition) {
//         throw new Error(
//           `${
//             framework.name
//           }: Invalid parameter $ref or definition not found in apiDoc.parameters: ${
//             parameter.$ref
//           }`
//         );
//       }

//       return definition;
//     } else {
//       return parameter;
//     }
//   });
// }

// export function resolveResponseRefs(
//   framework: IOpenAPIFramework,
//   responses,
//   apiDoc,
//   route
// ) {
//   return Object.keys(responses).reduce((resolvedResponses, responseCode) => {
//     const response = responses[responseCode];

//     if (typeof response.$ref === 'string') {
//       const apiVersion = apiDoc.swagger ? apiDoc.swagger : apiDoc.openapi;
//       const apiDocResponses =
//         apiVersion === '2.0' ? apiDoc.responses : apiDoc.components.responses;
//       const RESPONSE_REF_REGEX =
//         apiVersion === '2.0'
//           ? /^#\/responses\/(.+)$/
//           : /^#\/components\/responses\/(.+)$/;
//       const match = RESPONSE_REF_REGEX.exec(response.$ref);
//       const definition = match && (apiDocResponses || {})[match[1]];

//       if (!definition) {
//         throw new Error(
//           `${
//             framework.name
//           }: Invalid response $ref or definition not found in apiDoc.responses: ${
//             response.$ref
//           }`
//         );
//       }

//       resolvedResponses[responseCode] = definition;
//     } else {
//       resolvedResponses[responseCode] = response;
//     }

//     return resolvedResponses;
//   }, {});
// }

export function sortApiDocTags(apiDoc) {
  if (apiDoc && Array.isArray(apiDoc.tags)) {
    apiDoc.tags.sort((a, b) => {
      return a.name > b.name;
    });
  }
}

// export function sortOperationDocTags(operationDoc) {
//   operationDoc.tags.sort((a, b) => {
//     if (a < b) {
//       return -1;
//     }
//     return 1;
//   });
// }

// export function toAbsolutePath(part) {
//   return path.resolve(process.cwd(), part);
// }

// export function withNoDuplicates(arr) {
//   const parameters = [];
//   const seenParams = {};
//   let index = arr.length;

//   while (index > 0) {
//     --index;
//     const item = arr[index];
//     const key = [item.name, item.location].join(';////|||||\\\\;');

//     if (key in seenParams) {
//       continue;
//     }

//     seenParams[key] = true;
//     // unshifting to preserve ordering.
//     parameters.unshift(item);
//   }

//   return parameters;
// }

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
