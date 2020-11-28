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
    schema = parameter.schema;
  }
  if (!schema && parameter.content) {
    const contentType = Object.keys(parameter.content)[0];
    schema = parameter.content?.[contentType]?.schema;
  }
  if (!schema) {
    schema = parameter;
  }

  applyParameterStyle(parameter);
  applyParameterExplode(parameter);

  const name =
    parameter.in === 'header' ? parameter.name.toLowerCase() : parameter.name;

  return { name, schema };
}

function applyParameterStyle(param: OpenAPIV3.ParameterObject) {
  if (!param.style) {
    if (param.in === 'path') {
      param.style = 'simple';
    } else if (param.in === 'query') {
      param.style = 'form';
    } else if (param.style === 'header') {
      param.style = 'simple';
    } else if (param.style === 'cookie') {
      param.style = 'form';
    }
  }
}

function applyParameterExplode(param: OpenAPIV3.ParameterObject) {
  if (param.explode == null) {
    if (param.in === 'path') {
      param.explode = false;
    } else if (param.in === 'query') {
      param.explode = true;
    } else if (param.style === 'header') {
      param.explode = false;
    } else if (param.style === 'cookie') {
      param.explode = true;
    }
  }
}

export function dereferenceSchema(ajv: Ajv, ref: string) {
  // TODO cache schemas - so that we don't recurse every time
  const derefSchema = ajv.getSchema(ref);
  if (derefSchema?.['$ref']) {
    return dereferenceSchema(ajv, '');
  }
  return derefSchema?.schema;
}

function is$Ref(
  parameter: OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject,
): boolean {
  return parameter.hasOwnProperty('$ref');
}
