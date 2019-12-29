import { OpenAPIV3 } from '../../framework/types';

export function dereferenceParameter(
  apiDocs: OpenAPIV3.Document,
  parameter: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject,
): OpenAPIV3.ParameterObject {
  // TODO this should recurse or use ajv.getSchema - if implemented as such, may want to cache the result
  // as it is called by query.paraer and req.parameter mutator
  if (is$Ref(parameter)) {
    const p = <OpenAPIV3.ReferenceObject>parameter;
    const id = p.$ref.replace(/^.+\//i, '');
    return <OpenAPIV3.ParameterObject>apiDocs.components.parameters[id];
  } else {
    return <OpenAPIV3.ParameterObject>parameter;
  }
}

export function normalizeParameter(
  parameter: OpenAPIV3.ParameterObject,
): {
  name: string;
  schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject;
} {
  // TODO this should recurse or use ajv.getSchema - if implemented as such, may want to cache the result
  // as it is called by query.paraer and req.parameter mutator
  let schema = parameter.schema;
  if (!schema) {
    const contentType = Object.keys(parameter.content)[0];
    schema = parameter.content?.[contentType]?.schema;
  }
  const name =
    parameter.in === 'header' ? parameter.name.toLowerCase() : parameter.name;
  return { name, schema };
}

function is$Ref(
  parameter: OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject,
): boolean {
  return parameter.hasOwnProperty('$ref');
}
