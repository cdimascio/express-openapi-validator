import { Ajv } from 'ajv';
import { OpenAPIV3 } from '../../framework/types';
import ajv = require('ajv');
import { OpenAPIFramework } from '../../framework';

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

// export function dereference(
//   apiDocs: OpenAPIV3.Document,
//   schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
// ): OpenAPIV3.SchemaObject {
//   // TODO this should recurse or use ajv.getSchema - if implemented as such, may want to cache the result
//   // as it is called by query.paraer and req.parameter mutator

//   if (schema?.['$ref']) {
//     const ref = (<OpenAPIV3.ReferenceObject>schema).$ref;
//     const id = ref.replace(/^.+\//i, '');
//     if (apiDocs.components?.parameters?.[id]) {
//       return <OpenAPIV3.SchemaObject>(
//         (<unknown>apiDocs.components.parameters[id])
//       );
//     } else if (apiDocs.components?.schemas?.[id]) {
//       return <OpenAPIV3.SchemaObject>apiDocs.components.schemas[id];
//     }
//   }
//   return <OpenAPIV3.SchemaObject>schema;
// }

export function normalizeParameter(
  ajv: Ajv,
  parameter: OpenAPIV3.ParameterObject,
): {
  name: string;
  schema: OpenAPIV3.SchemaObject;
} {
  let schema;
  if (is$Ref(parameter)) {
    schema = dereferenceSchema(ajv, parameter['$ref']);
  } else if (parameter?.schema?.['$ref']) {
    schema = dereferenceSchema(ajv, parameter.schema['$ref']);
  } else {
    schema = parameter.schema 
  }
  if (!schema) {
    const contentType = Object.keys(parameter.content)[0];
    schema = parameter.content?.[contentType]?.schema;
  }
  if (!schema) {
    schema = parameter;
  }

  const name =
    parameter.in === 'header' ? parameter.name.toLowerCase() : parameter.name;
  return { name, schema };
}

export function dereferenceSchema(ajv: Ajv, ref: string) {
  // TODO cache schemas - so that we don't recurse every time
  const derefSchema = ajv.getSchema(ref);
  if (derefSchema?.['$ref']) {
    return dereferenceSchema(ajv, '');
  }
  return derefSchema.schema;
}

function is$Ref(
  parameter: OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject,
): boolean {
  return parameter.hasOwnProperty('$ref');
}
