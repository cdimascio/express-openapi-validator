import fsRoutes from 'fs-routes';
import OpenAPIDefaultSetter from 'openapi-default-setter';
import OpenAPIRequestCoercer from 'openapi-request-coercer';
import OpenAPIRequestValidator from 'openapi-request-validator';
import OpenAPIResponseValidator from 'openapi-response-validator';
import OpenAPISchemaValidator from 'openapi-schema-validator';
import OpenAPISecurityHandler from 'openapi-security-handler';
import { OpenAPI, OpenAPIV2, OpenAPIV3 } from 'openapi-types';
import BasePath from './base.path';
import {
  ConsoleDebugAdapterLogger,
  IOpenAPIFramework,
  OpenAPIFrameworkAPIContext,
  OpenAPIFrameworkArgs,
  OpenAPIFrameworkConstructorArgs,
  OpenAPIFrameworkOperationContext,
  OpenAPIFrameworkPathContext,
  OpenAPIFrameworkPathObject,
  OpenAPIFrameworkVisitor,
} from './types';
import {
  addOperationTagToApiDoc,
  allowsCoercionFeature,
  allowsDefaultsFeature,
  allowsFeatures,
  allowsResponseValidationFeature,
  allowsValidationFeature,
  assertRegExpAndSecurity,
  byDefault,
  byDirectory,
  byMethods,
  byRoute,
  byString,
  copy,
  getAdditionalFeatures,
  getBasePathsFromServers,
  getMethodDoc,
  getSecurityDefinitionByPath,
  handleFilePath,
  handleYaml,
  injectDependencies,
  METHOD_ALIASES,
  resolveParameterRefs,
  resolveResponseRefs,
  sortApiDocTags,
  sortOperationDocTags,
  toAbsolutePath,
  withNoDuplicates,
} from './util';

export {
  BasePath,
  OpenAPIFrameworkArgs,
  OpenAPIFrameworkConstructorArgs,
  OpenAPIFrameworkPathContext,
  OpenAPIFrameworkPathObject,
  OpenAPIFrameworkAPIContext,
  OpenAPIFrameworkOperationContext,
};
export default class OpenAPIFramework implements IOpenAPIFramework {
  public readonly apiDoc;
  public readonly basePaths: BasePath[];
  public readonly featureType;
  public readonly loggingPrefix;
  public readonly name;
  private customFormats;
  private dependencies;
  private enableObjectCoercion;
  private errorTransformer;
  private externalSchemas;
  private originalApiDoc;
  private operations;
  private paths;
  private pathsIgnore;
  private pathSecurity;
  private routesGlob;
  private routesIndexFileRegExp;
  private securityHandlers;
  private validateApiDoc;
  private validator;
  private logger;

  constructor(protected args = {} as OpenAPIFrameworkConstructorArgs) {
    this.name = args.name;
    this.featureType = args.featureType;
    this.loggingPrefix = args.name ? `${this.name}: ` : '';
    this.logger = args.logger ? args.logger : new ConsoleDebugAdapterLogger();
    // monkey patch for node v6:
    if (!this.logger.debug) {
      this.logger.debug = this.logger.info;
    }

    [
      { name: 'apiDoc', required: true },
      { name: 'errorTransformer', type: 'function' },
      { name: 'externalSchemas', type: 'object' },
      { name: 'featureType', required: true },
      { name: 'name', required: true },
      { name: 'pathSecurity', class: Array, className: 'Array' },
      { name: 'securityHandlers', type: 'object' },
    ].forEach(arg => {
      if (arg.required && !(arg.name in args)) {
        throw new Error(`${this.loggingPrefix}args.${arg.name} is required`);
      }

      if (arg.type && arg.name in args && typeof args[arg.name] !== arg.type) {
        throw new Error(
          `${this.loggingPrefix}args.${arg.name} must be a ${
            arg.type
          } when given`
        );
      }

      if (
        arg.class &&
        arg.name in args &&
        !(args[arg.name] instanceof arg.class)
      ) {
        throw new Error(
          `${this.loggingPrefix}args.${arg.name} must be an instance of ${
            arg.className
          } when given`
        );
      }
    });

    // if (!args.paths && !args.operations) {
    //   throw new Error(
    //     `${
    //       this.loggingPrefix
    //     }args.paths and args.operations must not both be empty`
    //   );
    // }

    this.enableObjectCoercion = !!args.enableObjectCoercion;
    this.originalApiDoc = handleYaml(handleFilePath(args.apiDoc));
    this.apiDoc = copy(this.originalApiDoc);
    this.basePaths = this.apiDoc.openapi
      ? getBasePathsFromServers(this.apiDoc.servers)
      : [
          new BasePath({
            url: (this.apiDoc.basePath || '').replace(/\/$/, ''),
          }),
        ];
    this.validateApiDoc =
      'validateApiDoc' in args ? !!args.validateApiDoc : true;
    this.validator = new OpenAPISchemaValidator({
      version:
        (this.apiDoc as OpenAPIV3.Document).openapi ||
        (this.apiDoc as OpenAPIV2.Document).swagger,
      extensions: this.apiDoc[`x-${this.name}-schema-extension`],
    });
    this.customFormats = args.customFormats;
    this.dependencies = args.dependencies;
    this.errorTransformer = args.errorTransformer;
    this.externalSchemas = args.externalSchemas;
    this.operations = args.operations;
    // this.paths = args.paths;
    this.pathsIgnore = args.pathsIgnore;
    this.pathSecurity = Array.isArray(args.pathSecurity)
      ? args.pathSecurity
      : [];
    this.routesGlob = args.routesGlob;
    this.routesIndexFileRegExp = args.routesIndexFileRegExp;
    this.securityHandlers = args.securityHandlers;
    this.pathSecurity.forEach(assertRegExpAndSecurity.bind(null, this));

    if (this.validateApiDoc) {
      const apiDocValidation = this.validator.validate(this.apiDoc);

      if (apiDocValidation.errors.length) {
        this.logger.error(
          `${this.loggingPrefix}Validating schema before populating paths`
        );
        this.logger.error(
          `${this.loggingPrefix}validation errors`,
          JSON.stringify(apiDocValidation.errors, null, '  ')
        );
        throw new Error(
          `${this.loggingPrefix}args.apiDoc was invalid.  See the output.`
        );
      }
    }
  }

  public initialize(visitor: OpenAPIFrameworkVisitor) {
    const securitySchemes = (this.apiDoc as OpenAPIV3.Document).openapi
      ? (this.apiDoc.components || {}).securitySchemes
      : this.apiDoc.securityDefinitions;

    const apiSecurityMiddleware =
      this.securityHandlers && this.apiDoc.security && securitySchemes
        ? new OpenAPISecurityHandler({
            securityDefinitions: securitySchemes,
            securityHandlers: this.securityHandlers,
            operationSecurity: this.apiDoc.security,
            loggingKey: `${this.name}-security`,
          })
        : null;

    // let paths = [];
    // let routes = [];
    // const routesCheckMap = {};

    // if (this.paths) {
    //   paths = [].concat(this.paths);
    //   this.logger.debug(`${this.loggingPrefix}paths=`, paths);
    //   paths.forEach(pathItem => {
    //     if (byString(pathItem)) {
    //       pathItem = toAbsolutePath(pathItem);
    //       if (!byDirectory(pathItem)) {
    //         throw new Error(
    //           `${
    //             this.loggingPrefix
    //           }args.paths contained a value that was not a path to a directory`
    //         );
    //       }
    //       routes = routes.concat(
    //         fsRoutes(pathItem, {
    //           glob: this.routesGlob,
    //           indexFileRegExp: this.routesIndexFileRegExp,
    //         })
    //           .filter(fsRoutesItem => {
    //             return this.pathsIgnore
    //               ? !this.pathsIgnore.test(fsRoutesItem.route)
    //               : true;
    //           })
    //           .map(fsRoutesItem => {
    //             routesCheckMap[fsRoutesItem.route] = true;
    //             return {
    //               path: fsRoutesItem.route,
    //               module: require(fsRoutesItem.path),
    //             };
    //           })
    //       );
    //     } else {
    //       if (!pathItem.path || !pathItem.module) {
    //         throw new Error(
    //           `${
    //             this.loggingPrefix
    //           }args.paths must consist of strings or valid route specifications`
    //         );
    //       }
    //       routes.push(pathItem);
    //     }
    //   });
    //   routes = routes.sort(byRoute);
    // }

    // if (this.operations) {
    //   const apiDocPaths = this.apiDoc.paths;
    //   Object.keys(apiDocPaths).forEach(apiDocPathUrl => {
    //     const pathDoc = apiDocPaths[apiDocPathUrl];
    //     const route = {
    //       path: apiDocPathUrl,
    //       module: Object.keys(pathDoc)
    //         .filter(byMethods)
    //         .reduce((acc, method) => {
    //           const methodDoc = pathDoc[METHOD_ALIASES[method]];
    //           const operationId = methodDoc.operationId;
    //           if (operationId && operationId in this.operations) {
    //             const operation = this.operations[operationId];

    //             acc[METHOD_ALIASES[method]] = (() => {
    //               const innerFunction: any = operation;
    //               innerFunction.apiDoc = methodDoc;
    //               // Operations get dependencies injected in `this`
    //               return innerFunction.bind({
    //                 dependencies: { ...this.dependencies },
    //               });
    //             })();
    //           } else {
    //             this.logger.warn(
    //               `${
    //                 this.loggingPrefix
    //               }Operation ${operationId} not found in the operations parameter`
    //             );
    //           }

    //           return acc;
    //         }, {}),
    //     };

    //     if (routesCheckMap[route.path]) {
    //       this.logger.warn(
    //         `${this.loggingPrefix}Overriding path ${
    //           route.path
    //         } with handlers from operations`
    //       );
    //       const routeIndex = routes.findIndex(r => r.path === route.path);
    //       routes[routeIndex] = {
    //         ...routes[routeIndex],
    //         ...route,
    //         module: {
    //           ...((routes[routeIndex] || {}).module || {}),
    //           ...(route.module || {}),
    //         },
    //       };
    //     } else {
    //       routes.push(route);
    //     }
    //   });
    // }
    // this.logger.debug(`${this.loggingPrefix}routes=`, routes);

    // // Check for duplicate routes
    // const dups = routes.filter((v, i, o) => {
    //   if (i > 0 && v.path === o[i - 1].path) {
    //     return v.path;
    //   }
    // });
    // if (dups.length > 0) {
    //   throw new Error(
    //     `${this.loggingPrefix}args.paths produced duplicate urls for "${
    //       dups[0].path
    //     }"`
    //   );
    // }

    const getApiDoc = () => {
      return copy(this.apiDoc);
    };

    // routes.forEach(routeItem => {
    //   const route = routeItem.path;
    //   this.logger.debug(`${this.loggingPrefix}setting up`, route);
    //   const pathModule = injectDependencies(
    //     routeItem.module.default || routeItem.module,
    //     this.dependencies
    //   );
    //   // express path params start with :paramName
    //   // openapi path params use {paramName}
    //   const openapiPath = route;
    //   // Do not make modifications to this.
    //   const originalPathItem = this.originalApiDoc.paths[openapiPath] || {};
    //   const pathDoc = this.apiDoc.paths[openapiPath] || {};
    //   const pathParameters = pathDoc.parameters || [];

    //   // push all parameters defined in the path module to the path parameter list
    //   if (Array.isArray(pathModule.parameters)) {
    //     [].push.apply(pathParameters, pathModule.parameters);
    //   }

    //   pathDoc.parameters = pathParameters;
    //   this.apiDoc.paths[openapiPath] = pathDoc;
    //   const methodsProcessed = {};

    //   [
    //     ...Object.keys(pathModule).filter(byMethods),
    //     ...Object.keys(pathDoc).filter(byMethods),
    //   ].forEach(methodAlias => {
    //     const methodName = METHOD_ALIASES[methodAlias];
    //     if (methodName in methodsProcessed) {
    //       this.logger.warn(
    //         `${
    //           this.loggingPrefix
    //         }${openapiPath}.${methodAlias} has already been defined. Ignoring the 2nd definition...`
    //       );
    //       return;
    //     }
    //     methodsProcessed[methodName] = true;
    //     // operationHandler may be an array or a function.
    //     const operationHandler =
    //       pathModule[methodAlias] ||
    //       routeItem.operations[(pathDoc[methodAlias] || {}).operationId];
    //     const operationDoc =
    //       handleYaml(getMethodDoc(operationHandler)) || pathDoc[methodName];
    //     // consumes is defined as property of each operation or entire document
    //     // in Swagger 2.0. For OpenAPI 3.0 consumes mime types are defined as the
    //     // key value(s) for each operation requestBody.content object.
    //     const consumes =
    //       operationDoc && Array.isArray(operationDoc.consumes)
    //         ? operationDoc.consumes
    //         : operationDoc &&
    //           operationDoc.requestBody &&
    //           operationDoc.requestBody.content
    //         ? Object.keys(operationDoc.requestBody.content)
    //         : Array.isArray(this.apiDoc.consumes)
    //         ? this.apiDoc.consumes
    //         : [];
    //     const operationContext: OpenAPIFrameworkOperationContext = {
    //       additionalFeatures: getAdditionalFeatures(
    //         this,
    //         this.logger,
    //         this.originalApiDoc,
    //         originalPathItem,
    //         pathModule,
    //         operationDoc
    //       ),
    //       allowsFeatures: allowsFeatures(
    //         this,
    //         this.apiDoc,
    //         pathModule,
    //         pathDoc,
    //         operationDoc
    //       ),
    //       apiDoc: this.apiDoc,
    //       basePaths: this.basePaths,
    //       consumes,
    //       features: {},
    //       methodName,
    //       methodParameters: [],
    //       operationDoc,
    //       operationHandler,
    //       path: openapiPath,
    //     };

    //     if (operationDoc) {
    //       pathDoc[methodName] = operationDoc;

    //       if (operationDoc.tags) {
    //         sortOperationDocTags(operationDoc);
    //         operationDoc.tags.forEach(
    //           addOperationTagToApiDoc.bind(null, this.apiDoc)
    //         );
    //       }

    //       if (operationContext.allowsFeatures) {
    //         // add features
    //         if (
    //           operationDoc.responses &&
    //           allowsResponseValidationFeature(
    //             this,
    //             this.apiDoc,
    //             pathModule,
    //             pathDoc,
    //             operationDoc
    //           )
    //         ) {
    //           // add response validation feature
    //           // it's invalid for a method doc to not have responses, but the post
    //           // validation will pick it up, so this is almost always going to be added.
    //           const responseValidator = new OpenAPIResponseValidator({
    //             loggingKey: `${this.name}-response-validation`,
    //             components: this.apiDoc.components,
    //             definitions: this.apiDoc.definitions,
    //             externalSchemas: this.externalSchemas,
    //             errorTransformer: this.errorTransformer,
    //             responses: resolveResponseRefs(
    //               this,
    //               operationDoc.responses,
    //               this.apiDoc,
    //               route
    //             ),
    //             customFormats: this.customFormats,
    //           });

    //           operationContext.features.responseValidator = responseValidator;
    //         }

    //         const methodParameters = withNoDuplicates(
    //           resolveParameterRefs(
    //             this,
    //             Array.isArray(operationDoc.parameters)
    //               ? pathParameters.concat(operationDoc.parameters)
    //               : pathParameters,
    //             this.apiDoc
    //           )
    //         );
    //         operationContext.methodParameters = methodParameters;

    //         if (methodParameters.length || operationDoc.requestBody) {
    //           // defaults, coercion, and parameter validation middleware
    //           if (
    //             allowsValidationFeature(
    //               this,
    //               this.apiDoc,
    //               pathModule,
    //               pathDoc,
    //               operationDoc
    //             )
    //           ) {
    //             const requestValidator = new OpenAPIRequestValidator({
    //               errorTransformer: this.errorTransformer,
    //               parameters: methodParameters,
    //               schemas: this.apiDoc.definitions, // v2
    //               componentSchemas: this.apiDoc.components // v3
    //                 ? this.apiDoc.components.schemas
    //                 : undefined,
    //               externalSchemas: this.externalSchemas,
    //               customFormats: this.customFormats,
    //               requestBody: operationDoc.requestBody as OpenAPIV3.RequestBodyObject,
    //             });
    //             operationContext.features.requestValidator = requestValidator;
    //             this.logger.debug(
    //               `${this.loggingPrefix}request validator on for`,
    //               methodName,
    //               openapiPath
    //             );
    //           }

    //           if (
    //             allowsCoercionFeature(
    //               this,
    //               this.apiDoc,
    //               pathModule,
    //               pathDoc,
    //               operationDoc
    //             )
    //           ) {
    //             const coercer = new OpenAPIRequestCoercer({
    //               extensionBase: `x-${this.name}-coercion`,
    //               loggingKey: `${this.name}-coercion`,
    //               parameters: methodParameters,
    //               enableObjectCoercion: this.enableObjectCoercion,
    //             });

    //             operationContext.features.coercer = coercer;
    //           }

    //           // no point in default feature if we don't have any parameters with defaults.
    //           if (
    //             methodParameters.filter(byDefault).length &&
    //             allowsDefaultsFeature(
    //               this,
    //               this.apiDoc,
    //               pathModule,
    //               pathDoc,
    //               operationDoc
    //             )
    //           ) {
    //             const defaultSetter = new OpenAPIDefaultSetter({
    //               parameters: methodParameters,
    //             });
    //             operationContext.features.defaultSetter = defaultSetter;
    //           }
    //         }

    //         let securityFeature;
    //         let securityDefinition;

    //         if (this.securityHandlers && securitySchemes) {
    //           if (operationDoc.security) {
    //             securityDefinition = operationDoc.security;
    //           } else if (this.pathSecurity.length) {
    //             securityDefinition = getSecurityDefinitionByPath(
    //               openapiPath,
    //               this.pathSecurity
    //             );
    //           }
    //         }

    //         if (securityDefinition) {
    //           pathDoc[methodName].security = securityDefinition;
    //           securityFeature = new OpenAPISecurityHandler({
    //             securityDefinitions: securitySchemes,
    //             securityHandlers: this.securityHandlers,
    //             operationSecurity: securityDefinition,
    //             loggingKey: `${this.name}-security`,
    //           });
    //         } else if (apiSecurityMiddleware) {
    //           securityFeature = apiSecurityMiddleware;
    //         }

    //         if (securityFeature) {
    //           operationContext.features.securityHandler = securityFeature;
    //         }
    //       }
    //     }

    //     if (visitor.visitOperation) {
    //       visitor.visitOperation(operationContext);
    //     }
    //   });

    //   if (visitor.visitPath) {
    //     visitor.visitPath({
    //       basePaths: this.basePaths,
    //       getApiDoc,
    //       getPathDoc: () => copy(pathDoc),
    //     });
    //   }
    // });

    sortApiDocTags(this.apiDoc);

    if (this.validateApiDoc) {
      const apiDocValidation = this.validator.validate(this.apiDoc);

      if (apiDocValidation.errors.length) {
        this.logger.error(
          `${this.loggingPrefix}Validating schema after populating paths`
        );
        this.logger.error(
          `${this.loggingPrefix}validation errors`,
          JSON.stringify(apiDocValidation.errors, null, '  ')
        );
        throw new Error(
          `${
            this.loggingPrefix
          }args.apiDoc was invalid after populating paths.  See the output.`
        );
      }
    }

    if (visitor.visitApi) {
      visitor.visitApi({
        basePaths: this.basePaths,
        getApiDoc,
      });
    }
  }
}
