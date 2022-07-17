import { OpenAPIV3 } from '../types';
import * as cloneDeep from 'lodash.clonedeep';

type AsyncReferenceObject = (OpenAPIV3.ReferenceObject & {
  $async: true
});

export type PossiblyAsyncReferenceObject = OpenAPIV3.ReferenceObject | AsyncReferenceObject;

type AsyncSchemaObject = (OpenAPIV3.SchemaObject & {
  $async: true
});

export type PossiblyAsyncSchemaObject = OpenAPIV3.SchemaObject | AsyncSchemaObject;

export interface ComponentSchemas {
  [key: string]: PossiblyAsyncReferenceObject | PossiblyAsyncSchemaObject
}

interface ReferenceMap {
  [key: string]: Array<string>
}

interface AsyncFormatsMap {[key: string]: boolean}
interface AsyncComponentsMap {[key: string]: boolean}
interface DependentsMap {[key: string]: Array<string>}

function isAsyncReferenceOrSchema(object: PossiblyAsyncReferenceObject | PossiblyAsyncSchemaObject): object is AsyncReferenceObject | AsyncSchemaObject {
  return (object as PossiblyAsyncReferenceObject)['$async'] === true || (object as PossiblyAsyncSchemaObject)['$async'] === true;
}

function isReferenceObject(object:  PossiblyAsyncReferenceObject | PossiblyAsyncSchemaObject): object is PossiblyAsyncReferenceObject {
  return object['$ref'] !== undefined;
}

export const buildSchemasWithAsync = (asyncFormats: AsyncFormatsMap, schemas: ComponentSchemas): ComponentSchemas => {
  const componentsWithAsync: AsyncComponentsMap = {};
  const dependentsMap: DependentsMap = {};

  const asyncSchemas: ComponentSchemas = cloneDeep<ComponentSchemas>(schemas);

  // Walk all top level schemas
  // Note dependencies of these top level schemas and if they require async.
  Object.entries(asyncSchemas).forEach(([id, schemaObject]) => {
    const thisComponentId = `#/components/schemas/${id}`;

    recordDependenciesAndAsync(
      thisComponentId,
      schemaObject,
      dependentsMap,
      componentsWithAsync,
      asyncFormats
    );
  });

  const toDecorate = Object.keys(componentsWithAsync);

  // Decorate the async schema and any dependents.
  while (toDecorate.length > 0) {
    const current = toDecorate.pop();
    if (dependentsMap[current]) {
      // If the dependent hasn't been decorated yet, push it on the decoration stack
      dependentsMap[current].forEach(dependent => {
        const possiblyAsyncDependent = asyncSchemas[dependent.replace('#/components/schemas/', '')];
        if (!isAsyncReferenceOrSchema(possiblyAsyncDependent)) {
          toDecorate.push(dependent);
        }
      });
    }
    asyncSchemas[current.replace('#/components/schemas/', '')] = {
      ...asyncSchemas[current.replace('#/components/schemas/', '')],
      $async: true
    };
  }

  return asyncSchemas;
}

const recordDependenciesAndAsync = (
  componentId: string,
  schemaObject: PossiblyAsyncReferenceObject | PossiblyAsyncSchemaObject,
  dependentsMap: ReferenceMap,
  componentsWithAsync: AsyncComponentsMap,
  asyncFormats: AsyncFormatsMap
) => {
  // This schema references another schema, record the dependency and carry on
  if (isReferenceObject(schemaObject)) {
    dependentsMap[schemaObject['$ref']] = dependentsMap[schemaObject['$ref']] || [];
    dependentsMap[schemaObject['$ref']].push(componentId);
  } else {
    // This schema is a string type which has async, note it.
    const isStringSchema = schemaObject.type === 'string' || schemaObject['x-eov-type'] === 'string';
    if (isStringSchema && schemaObject.format && asyncFormats[schemaObject.format]) {
      componentsWithAsync[componentId] = true;
    } else if (schemaObject.properties) {
      // This schema has properties that may be sub-schemas that require async, record them too.
      Object.entries(schemaObject.properties).forEach(([propertyId, propertySchema]) => {
        recordDependenciesAndAsync(
          componentId,
          propertySchema,
          dependentsMap,
          componentsWithAsync,
          asyncFormats
        )
      });
    }
  }
}