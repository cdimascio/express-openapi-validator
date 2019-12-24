import * as fs from 'fs';
import * as jsYaml from 'js-yaml';
import * as path from 'path';
import * as $RefParser from 'json-schema-ref-parser';
import { OpenAPISchemaValidator } from './openapi.schema.validator';
import { BasePath } from './base.path';
import {
  OpenAPIFrameworkArgs,
  OpenAPIFrameworkInit,
  OpenAPIFrameworkVisitor,
  OpenAPIV3,
} from './types';

export class OpenAPIFramework {
  private readonly args: OpenAPIFrameworkArgs;
  private readonly loggingPrefix: string = 'openapi.validator: ';

  constructor(args: OpenAPIFrameworkArgs) {
    this.args = args;
  }

  public async initialize(
    visitor: OpenAPIFrameworkVisitor,
  ): Promise<OpenAPIFrameworkInit> {
    const args = this.args;
    const apiDoc = await this.copy(
      await this.loadSpec(args.apiDoc, args.$refParser),
    );
    const basePathObs = this.getBasePathsFromServers(apiDoc.servers);
    const basePaths = Array.from(
      basePathObs.reduce((acc, bp) => {
        bp.all().forEach(path => acc.add(path));
        return acc;
      }, new Set<string>()),
    );
    const validateApiDoc =
      'validateApiDoc' in args ? !!args.validateApiDoc : true;
    const validator = new OpenAPISchemaValidator({
      version: apiDoc.openapi,
      // extensions: this.apiDoc[`x-${args.name}-schema-extension`],
    });

    if (validateApiDoc) {
      const apiDocValidation = validator.validate(apiDoc);

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
    const getApiDoc = () => {
      return this.copy(apiDoc);
    };

    this.sortApiDocTags(apiDoc);

    if (visitor.visitApi) {
      // const basePaths = basePathObs;
      visitor.visitApi({
        basePaths,
        getApiDoc,
      });
    }
    return {
      apiDoc,
      basePaths,
    };
  }

  private loadSpec(
    filePath: string | object,
    $refParser: { mode: 'bundle' | 'dereference' } = { mode: 'bundle' },
  ): Promise<OpenAPIV3.Document> {
    // Because of this issue ( https://github.com/APIDevTools/json-schema-ref-parser/issues/101#issuecomment-421755168 )
    // We need this workaround ( use '$RefParser.dereference' instead of '$RefParser.bundle' ) if asked by user
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
          return $refParser.mode === 'dereference'
            ? $RefParser.dereference(docWithRefs)
            : $RefParser.bundle(docWithRefs);
        } finally {
          process.chdir(origCwd);
        }
      } else {
        throw new Error(
          `${this.loggingPrefix}spec could not be read at ${filePath}`,
        );
      }
    }
    return $refParser.mode === 'dereference'
      ? $RefParser.dereference(filePath)
      : $RefParser.bundle(filePath);
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
