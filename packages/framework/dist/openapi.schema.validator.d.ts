import * as Ajv from 'ajv';
import { OpenAPIV3 } from './index.js';
export declare class OpenAPISchemaValidator {
    private validator;
    constructor({ version }: {
        version: string;
        extensions?: object;
    });
    validate(openapiDoc: OpenAPIV3.Document): {
        errors: Array<Ajv.ErrorObject> | null;
    };
}
