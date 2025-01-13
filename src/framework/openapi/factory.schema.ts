import { assertVersion } from './assert.version';

// https://github.com/OAI/OpenAPI-Specification/blob/master/schemas/v3.0/schema.json
import * as openapi3Schema from '../openapi.v3.schema.json';
// https://github.com/OAI/OpenAPI-Specification/blob/master/schemas/v3.1/schema.json with dynamic refs replaced due to AJV bug - https://github.com/ajv-validator/ajv/issues/1745
import * as openapi31Schema from '../openapi.v3_1.modified.schema.json';

export const factorySchema = (version: string): Object => {
  const { minor } = assertVersion(version);

  if (minor === '0') {
    return openapi3Schema;
  }

  return openapi31Schema;
};
