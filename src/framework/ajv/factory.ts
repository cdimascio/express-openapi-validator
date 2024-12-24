import { Options } from "ajv";
import AjvDraft4 from 'ajv-draft-04';
import Ajv2020 from 'ajv/dist/2020';
import { assertVersion } from "../openapi/assert.version";
import { AjvInstance } from "../types";

export const factoryAjv = (version: string, options: Options): AjvInstance => {
  const { minor } = assertVersion(version)

  let ajvInstance: AjvInstance

  if (minor === '0') {
    ajvInstance = new AjvDraft4(options);
  } else if (minor == '1') {
    ajvInstance = new Ajv2020(options);
  
    // Open API 3.1 has a custom "media-range" attribute defined in its schema, but the spec does not define it. "It's not really intended to be validated"
    // https://github.com/OAI/OpenAPI-Specification/issues/2714#issuecomment-923185689
    // Since the schema is non-normative (https://github.com/OAI/OpenAPI-Specification/pull/3355#issuecomment-1915695294) we will only validate that it's a string
    // as the spec states
    ajvInstance.addFormat('media-range', true);
  }

  return ajvInstance
}