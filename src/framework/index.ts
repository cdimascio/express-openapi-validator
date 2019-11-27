import * as fs from 'fs';
import * as jsYaml from 'js-yaml';
import * as path from 'path';
import { $RefParser } from './json.ref.schema';
import { OpenAPISchemaValidator } from './openapi.schema.validator';
import { BasePath } from './base.path';
import {
  OpenAPIFrameworkArgs,
  OpenAPIFrameworkVisitor,
  OpenAPIV3,
} from './types';

export class OpenAPIFramework {
  public readonly apiDoc: OpenAPIV3.Document;
  public readonly basePaths: string[];

  private readonly validateApiDoc: boolean;
  private readonly validator: OpenAPISchemaValidator;
  private readonly basePathObs: BasePath[];
  private readonly loggingPrefix: string = 'openapi.validator: ';

  constructor(args: OpenAPIFrameworkArgs) {
    this.apiDoc = this.copy(this.loadSpec(args.apiDoc));
    this.basePathObs = this.getBasePathsFromServers(this.apiDoc.servers);
    this.basePaths = Array.from(
      this.basePathObs.reduce((acc, bp) => {
        bp.all().forEach(path => acc.add(path));
        return acc;
      }, new Set<string>()),
    );
    this.validateApiDoc =
      'validateApiDoc' in args ? !!args.validateApiDoc : true;
    this.validator = new OpenAPISchemaValidator({
      version: this.apiDoc.openapi,
      // extensions: this.apiDoc[`x-${args.name}-schema-extension`],
    });

    if (this.validateApiDoc) {
      const apiDocValidation = this.validator.validate(this.apiDoc);

      if (apiDocValidation.errors.length) {
        console.error(`${this.loggingPrefix}Validating schema`);
        console.error(
          `${this.loggingPrefix}validation errors`,
          JSON.stringify(apiDocValidation.errors, null, '  '),
        );
        throw new Error(
          `${this.loggingPrefix}args.apiDoc was invalid.  See the output.`,
        );
      }
    }
  }

  public initialize(visitor: OpenAPIFrameworkVisitor): void {
    const getApiDoc = () => {
      return this.copy(this.apiDoc);
    };

    this.sortApiDocTags(this.apiDoc);

    if (visitor.visitApi) {
      const basePaths = this.basePathObs;
      visitor.visitApi({
        basePaths,
        getApiDoc,
      });
    }
  }

  private loadSpec(filePath: string | object): OpenAPIV3.Document {
    if (typeof filePath === 'string') {
      const origCwd = process.cwd();
      const specDir = path.resolve(origCwd, path.dirname(filePath));
      const absolutePath = path.resolve(origCwd, filePath);
      if (fs.existsSync(absolutePath)) {
        // Get document, or throw exception on error
        try {
          process.chdir(specDir);
          const docWithRefs = jsYaml.safeLoad(
            fs.readFileSync(absolutePath, 'utf8'),
            { json: true },
          );
          return $RefParser.bundle(docWithRefs);
        } finally {
          process.chdir(origCwd);
        }
      } else {
        throw new Error(
          `${this.loggingPrefix}spec could not be read at ${filePath}`,
        );
      }
    }
    return $RefParser.bundle(filePath);
  }

  private copy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  private sortApiDocTags(apiDoc: OpenAPIV3.Document): void {
    if (apiDoc && Array.isArray(apiDoc.tags)) {
      apiDoc.tags.sort((a, b): number => {
        return a.name < b.name ? -1 : 1;
      });
    }
  }

  private getBasePathsFromServers(
    servers: OpenAPIV3.ServerObject[],
  ): BasePath[] {
    if (!servers || servers.length === 0) {
      return [new BasePath({ url: '' })];
    }
    const basePathsMap: { [key: string]: BasePath } = {};
    for (const server of servers) {
      const basePath = new BasePath(server);
      basePathsMap[basePath.path] = basePath;
    }
    return Object.keys(basePathsMap).map(key => basePathsMap[key]);
  }
}
