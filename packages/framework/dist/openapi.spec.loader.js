"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenApiSpecLoader = exports.sortRoutes = void 0;
const framework_1 = require("./framework");
// Sort routes by most specific to least specific i.e. static routes before dynamic
// e.g. /users/my_route before /users/{id}
// Exported for tests
// TODO this should be part of the express package
const sortRoutes = (r1, r2) => {
    const e1 = r1.expressRoute.replace(/\/:/g, '/~');
    const e2 = r2.expressRoute.replace(/\/:/g, '/~');
    return e1 > e2 ? 1 : -1;
};
exports.sortRoutes = sortRoutes;
class OpenApiSpecLoader {
    constructor(opts) {
        this.framework = new framework_1.OpenAPIFramework(opts);
    }
    async load() {
        return this.discoverRoutes();
    }
    async discoverRoutes() {
        const routes = [];
        const toExpressParams = this.toExpressParams;
        // const basePaths = this.framework.basePaths;
        // let apiDoc: OpenAPIV3.Document = null;
        // let basePaths: string[] = null;
        const { apiDoc, basePaths } = await this.framework.initialize({
            visitApi(ctx) {
                var _a;
                const apiDoc = ctx.getApiDoc();
                const basePaths = ctx.basePaths;
                for (const bpa of basePaths) {
                    const bp = bpa.replace(/\/$/, '');
                    for (const [path, methods] of Object.entries(apiDoc.paths)) {
                        for (const [method, schema] of Object.entries(methods)) {
                            if (method.startsWith('x-') ||
                                ['parameters', 'summary', 'description'].includes(method)) {
                                continue;
                            }
                            const pathParams = new Set();
                            for (const param of (_a = schema.parameters) !== null && _a !== void 0 ? _a : []) {
                                if (param.in === 'path') {
                                    pathParams.add(param.name);
                                }
                            }
                            const openApiRoute = `${bp}${path}`;
                            const expressRoute = `${openApiRoute}`
                                .split(':')
                                .map(toExpressParams)
                                .join('\\:');
                            routes.push({
                                basePath: bp,
                                expressRoute,
                                openApiRoute,
                                method: method.toUpperCase(),
                                pathParams: Array.from(pathParams),
                            });
                        }
                    }
                }
            },
        });
        routes.sort(exports.sortRoutes);
        return {
            apiDoc,
            basePaths,
            routes,
        };
    }
    toExpressParams(part) {
        // substitute wildcard path with express equivalent
        // {/path} => /path(*) <--- RFC 6570 format (not supported by openapi)
        // const pass1 = part.replace(/\{(\/)([^\*]+)(\*)}/g, '$1:$2$3');
        // instead create our own syntax that is compatible with express' pathToRegex
        // /{path}* => /:path*)
        // /{path}(*) => /:path*)
        const pass1 = part.replace(/\/{([^\*]+)}\({0,1}(\*)\){0,1}/g, '/:$1$2');
        // substitute params with express equivalent
        // /path/{id} => /path/:id
        return pass1.replace(/\{([^}]+)}/g, ':$1');
    }
}
exports.OpenApiSpecLoader = OpenApiSpecLoader;
//# sourceMappingURL=openapi.spec.loader.js.map