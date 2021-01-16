"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAPIFramework = void 0;
const fs = require("fs");
const path = require("path");
const $RefParser = require("json-schema-ref-parser");
const openapi_schema_validator_1 = require("./openapi.schema.validator");
const base_path_1 = require("./base.path");
class OpenAPIFramework {
    constructor(args) {
        this.loggingPrefix = 'openapi.validator: ';
        this.args = args;
    }
    // TODO the visitor should be implemented in the corresponding framework specific package
    // e.g. express-openapi-validator
    async initialize(visitor) {
        const args = this.args;
        const apiDoc = await this.loadSpec(args.apiDoc, args.$refParser);
        const basePathObs = this.getBasePathsFromServers(apiDoc.servers);
        const basePaths = Array.from(basePathObs.reduce((acc, bp) => {
            bp.all().forEach((path) => acc.add(path));
            return acc;
        }, new Set()));
        const validateApiDoc = 'validateApiDoc' in args ? !!args.validateApiDoc : true;
        const validator = new openapi_schema_validator_1.OpenAPISchemaValidator({
            version: apiDoc.openapi,
        });
        if (validateApiDoc) {
            const apiDocValidation = validator.validate(apiDoc);
            if (apiDocValidation.errors.length) {
                console.error(`${this.loggingPrefix}Validating schema`);
                console.error(`${this.loggingPrefix}validation errors`, JSON.stringify(apiDocValidation.errors, null, '  '));
                throw new Error(`${this.loggingPrefix}args.apiDoc was invalid.  See the output.`);
            }
        }
        const getApiDoc = () => {
            return apiDoc;
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
    loadSpec(filePath, $refParser = { mode: 'bundle' }) {
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
                    return $refParser.mode === 'dereference'
                        ? $RefParser.dereference(absolutePath)
                        : $RefParser.bundle(absolutePath);
                }
                finally {
                    process.chdir(origCwd);
                }
            }
            else {
                throw new Error(`${this.loggingPrefix}spec could not be read at ${filePath}`);
            }
        }
        return $refParser.mode === 'dereference'
            ? $RefParser.dereference(filePath)
            : $RefParser.bundle(filePath);
    }
    sortApiDocTags(apiDoc) {
        if (apiDoc && Array.isArray(apiDoc.tags)) {
            apiDoc.tags.sort((a, b) => {
                return a.name < b.name ? -1 : 1;
            });
        }
    }
    getBasePathsFromServers(servers) {
        if (!servers || servers.length === 0) {
            return [new base_path_1.BasePath({ url: '' })];
        }
        const basePathsMap = {};
        for (const server of servers) {
            const basePath = new base_path_1.BasePath(server);
            basePathsMap[basePath.expressPath] = basePath;
        }
        return Object.keys(basePathsMap).map((key) => basePathsMap[key]);
    }
}
exports.OpenAPIFramework = OpenAPIFramework;
//# sourceMappingURL=framework.js.map