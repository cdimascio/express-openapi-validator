import { OpenAPISchemaValidator } from './openapi.schema.validator';
import BasePath from './base.path';
import {
  ConsoleDebugAdapterLogger,
  IOpenAPIFramework,
  OpenAPIFrameworkAPIContext,
  OpenAPIFrameworkArgs,
  OpenAPIFrameworkConstructorArgs,
  OpenAPIFrameworkPathContext,
  OpenAPIFrameworkPathObject,
  OpenAPIFrameworkVisitor,
} from './types';
import {
  copy,
  getBasePathsFromServers,
  loadSpecFile,
  handleYaml,
  sortApiDocTags,
} from './util';

export {
  BasePath,
  OpenAPIFrameworkArgs,
  OpenAPIFrameworkConstructorArgs,
  OpenAPIFrameworkPathContext,
  OpenAPIFrameworkPathObject,
  OpenAPIFrameworkAPIContext,
};
export default class OpenAPIFramework implements IOpenAPIFramework {
  public readonly apiDoc;
  public readonly basePaths: BasePath[];
  public readonly featureType;
  public readonly loggingPrefix;
  public readonly name;

  private originalApiDoc;
  private validateApiDoc;
  private validator;
  private logger;

  constructor(protected args = {} as OpenAPIFrameworkConstructorArgs) {
    this.name = args.name;
    this.featureType = args.featureType;
    this.loggingPrefix = args.name ? `${this.name}: ` : '';
    this.logger = args.logger ? args.logger : new ConsoleDebugAdapterLogger();

    const apiDoc =
      typeof args.apiDoc === 'string'
        ? handleYaml(loadSpecFile(args.apiDoc))
        : args.apiDoc;

    this.originalApiDoc = apiDoc;

    if (!this.originalApiDoc) {
      throw new Error(`spec could not be read at ${args.apiDoc}`);
    }
    this.apiDoc = copy(this.originalApiDoc);

    this.basePaths = !args.basePath && this.apiDoc.openapi
      ? getBasePathsFromServers(this.apiDoc.servers)
      : [
          new BasePath({
            url: (args.basePath || this.apiDoc.basePath || '').replace(/\/$/, ''),
          }),
        ];

    this.validateApiDoc =
      'validateApiDoc' in args ? !!args.validateApiDoc : true;

    this.validator = new OpenAPISchemaValidator({
      version: this.apiDoc.openapi,
      extensions: this.apiDoc[`x-${this.name}-schema-extension`],
    });

    if (this.validateApiDoc) {
      const apiDocValidation = this.validator.validate(this.apiDoc);

      if (apiDocValidation.errors.length) {
        this.logger.error(
          `${this.loggingPrefix}Validating schema before populating paths`,
        );
        this.logger.error(
          `${this.loggingPrefix}validation errors`,
          JSON.stringify(apiDocValidation.errors, null, '  '),
        );
        throw new Error(
          `${this.loggingPrefix}args.apiDoc was invalid.  See the output.`,
        );
      }
    }
  }

  public initialize(visitor: OpenAPIFrameworkVisitor) {
    const getApiDoc = () => {
      return copy(this.apiDoc);
    };

    sortApiDocTags(this.apiDoc);

    if (this.validateApiDoc) {
      const apiDocValidation = this.validator.validate(this.apiDoc);

      if (apiDocValidation.errors.length) {
        this.logger.error(
          `${this.loggingPrefix}Validating schema after populating paths`,
        );
        this.logger.error(
          `${this.loggingPrefix}validation errors`,
          JSON.stringify(apiDocValidation.errors, null, '  '),
        );
        throw new Error(
          `${this.loggingPrefix}args.apiDoc was invalid after populating paths.  See the output.`,
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
