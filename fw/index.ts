// import fsRoutes from 'fs-routes';
// import OpenAPIDefaultSetter from 'openapi-default-setter';
// import OpenAPIRequestCoercer from 'openapi-request-coercer';
// import OpenAPIRequestValidator from 'openapi-request-validator';
// import OpenAPIResponseValidator from 'openapi-response-validator';
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
  // OpenAPIFrameworkOperationContext,
  OpenAPIFrameworkPathContext,
  OpenAPIFrameworkPathObject,
  OpenAPIFrameworkVisitor,
} from './types';
import {
  // addOperationTagToApiDoc,
  // allowsCoercionFeature,
  // allowsDefaultsFeature,
  // allowsFeatures,
  // allowsResponseValidationFeature,
  // allowsValidationFeature,
  assertRegExpAndSecurity,
  // byDefault,
  // byDirectory,
  // byMethods,
  // byRoute,
  // byString,
  copy,
  // getAdditionalFeatures,
  getBasePathsFromServers,
  // getMethodDoc,
  // getSecurityDefinitionByPath,
  handleFilePath,
  handleYaml,
  // injectDependencies,
  // METHOD_ALIASES,
  // resolveParameterRefs,
  // resolveResponseRefs,
  sortApiDocTags,
  // sortOperationDocTags,
  // toAbsolutePath,
  // withNoDuplicates,
} from './util';

export {
  BasePath,
  OpenAPIFrameworkArgs,
  OpenAPIFrameworkConstructorArgs,
  OpenAPIFrameworkPathContext,
  OpenAPIFrameworkPathObject,
  OpenAPIFrameworkAPIContext,
  // OpenAPIFrameworkOperationContext,
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

    const getApiDoc = () => {
      return copy(this.apiDoc);
    };

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
