import * as Ajv from 'ajv';
import { OpenAPIV3, Options } from '..';
export declare function createRequestAjv(openApiSpec: OpenAPIV3.Document, options?: Options): Ajv.Ajv;
export declare function createResponseAjv(openApiSpec: OpenAPIV3.Document, options?: Options): Ajv.Ajv;
