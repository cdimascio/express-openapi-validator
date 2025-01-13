import { OpenAPIV3 } from '../types';

export function stripExamples(
  document: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1,
): void {
  stripExamplesFromPaths(document.paths);
  stripExamplesFromComponents(document.components);

  if (isDocumentV3_1(document)) {
    stripExamplesFromPaths(document.components?.pathItems);
    stripExamplesFromPaths(document.webhooks);
  }
}

function stripExamplesFromPaths(path?: OpenAPIV3.PathsObject): void {
  if (hasNoExamples(path)) return;
  forEachValue(path, (pathItem) => stripExamplesFromPathItem(pathItem));
}

function stripExamplesFromComponents(
  components?: OpenAPIV3.ComponentsObject,
): void {
  if (hasNoExamples(components)) return;

  delete components.examples;

  stripExamplesFromSchema(components.schemas);
  stripExamplesFromResponses(components.responses);
  stripExamplesFromHeaders(components.headers);
  stripExamplesFromCallbacks(components.callbacks);

  forEachValue(components.requestBodies, (requestBody) =>
    stripExamplesFromRequestBody(requestBody),
  );

  if (components.parameters !== undefined) {
    stripExamplesFromParameters(
      Object.entries(components.parameters).map(
        ([_key, parameter]) => parameter,
      ),
    );
  }
}

function stripExamplesFromPathItem(
  pathItem?: OpenAPIV3.ReferenceObject | OpenAPIV3.PathItemObject,
): void {
  // Explicitly not checking whether pathItem is a ReferenceObject, as
  // there is no way to differentiate them. Attempt to remove all example
  // properties either way.
  if (pathItem === undefined) return;

  ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].forEach(
    (method) => {
      stripExamplesFromOperation(pathItem[method]);
    },
  );

  if ('parameters' in pathItem) {
    stripExamplesFromParameters(pathItem.parameters);
  }
}

function stripExamplesFromSchema(
  schema?: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
): void {
  if (hasNoExamples(schema)) return;

  if (schema.type !== 'array') {
    stripExamplesFromBaseSchema(schema);
    return;
  }

  if ('items' in schema) {
    stripExamplesFromSchema(schema.items);
  } else {
    stripExamplesFromSchema(schema.not);
    (['allOf', 'oneOf', 'anyOf'] as const).forEach((property) => {
      schema[property].forEach((childObject) =>
        stripExamplesFromSchema(childObject),
      );
    });
  }
}

function stripExamplesFromBaseSchema<T>(
  baseSchema?: OpenAPIV3.BaseSchemaObject<T>,
): void {
  if (hasNoExamples(baseSchema)) return;

  if (typeof baseSchema.additionalProperties !== 'boolean') {
    stripExamplesFromSchema(baseSchema.additionalProperties);
  }

  forEachValue(baseSchema.properties, (schema) =>
    stripExamplesFromSchema(schema),
  );
}

function stripExamplesFromOperation(
  operation?: OpenAPIV3.OperationObject,
): void {
  if (hasNoExamples(operation)) return;
  stripExamplesFromParameters(operation.parameters);
  stripExamplesFromRequestBody(operation.requestBody);
  stripExamplesFromResponses(operation.responses);
  stripExamplesFromCallbacks(operation.callbacks);
}

function stripExamplesFromRequestBody(
  requestBody?: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject,
): void {
  if (hasNoExamples(requestBody)) return;
  stripExamplesFromContent(requestBody.content);
}

function stripExamplesFromResponses(
  responses?: OpenAPIV3.ReferenceObject | OpenAPIV3.ResponsesObject,
): void {
  if (hasNoExamples(responses)) return;
  forEachValue(responses, (response) => {
    if ('$ref' in response) {
      return;
    }
    stripExamplesFromHeaders(response.headers);
    stripExamplesFromContent(response.content);
  });
}

function stripExamplesFromEncoding(encoding?: OpenAPIV3.EncodingObject): void {
  if (hasNoExamples(encoding)) return;
  stripExamplesFromHeaders(encoding.headers);
}

function stripExamplesFromHeaders(headers?: {
  [header: string]: OpenAPIV3.ReferenceObject | OpenAPIV3.HeaderObject;
}): void {
  if (hasNoExamples(headers)) return;
  forEachValue(headers, (header) => stripExamplesFromParameterBase(header));
}

function stripExamplesFromContent(content?: {
  [media: string]: OpenAPIV3.MediaTypeObject;
}): void {
  forEachValue(content, (mediaTypeObject) => {
    if (hasNoExamples(mediaTypeObject)) return;

    delete mediaTypeObject.example;
    delete mediaTypeObject.examples;

    stripExamplesFromSchema(mediaTypeObject.schema);
    forEachValue(mediaTypeObject.encoding, (encoding) =>
      stripExamplesFromEncoding(encoding),
    );
  });
}

function stripExamplesFromParameters(
  parameters?: Array<OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject>,
): void {
  if (hasNoExamples(parameters)) return;
  parameters.forEach((parameter) => stripExamplesFromParameterBase(parameter));
}

function stripExamplesFromParameterBase(
  parameterBase?: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterBaseObject,
): void {
  if (hasNoExamples(parameterBase)) return;

  delete parameterBase.example;
  delete parameterBase.examples;

  stripExamplesFromSchema(parameterBase.schema);
  stripExamplesFromContent(parameterBase.content);
}

function stripExamplesFromCallbacks(callbacks?: {
  [callback: string]: OpenAPIV3.ReferenceObject | OpenAPIV3.CallbackObject;
}): void {
  if (hasNoExamples(callbacks)) return;

  forEachValue(callbacks, (callback) => {
    if ('$ref' in callback) {
      return;
    }
    stripExamplesFromPaths(callback);
  });
}

function isDocumentV3_1(
  document: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1,
): document is OpenAPIV3.DocumentV3_1 {
  return document.openapi.startsWith('3.1.');
}

function hasNoExamples<T>(
  object: T | OpenAPIV3.ReferenceObject | undefined,
): object is OpenAPIV3.ReferenceObject | undefined {
  return object === undefined || '$ref' in object;
}

function forEachValue<Value>(
  dictionary: { [key: string]: Value } | undefined,
  perform: (value: Value) => void,
): void {
  if (dictionary === undefined) return;
  Object.entries(dictionary).forEach(([_key, value]) => perform(value));
}
