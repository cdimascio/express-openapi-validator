import { expect } from 'chai';
import { OpenApiContext } from '../src/framework/openapi.context';
import { Spec } from '../src/framework/openapi.spec.loader';

describe('route matcher cache', () => {
  it('reuses compiled route matchers for the same route and options', () => {
    const context = makeContext();

    const first = context.getRouteMatcher('/pets/:petId', false, false);
    const second = context.getRouteMatcher('/pets/:petId', false, false);

    expect(second).to.equal(first);
    expect(first.regexp.exec('/pets/123')).to.not.equal(null);
    expect(first.paramKeys).to.deep.equal(['petId']);
  });

  it('caches separate matchers for strict and case-sensitive routing options', () => {
    const context = makeContext();

    const defaultMatcher = context.getRouteMatcher('/pets/:petId', false, false);
    const strictMatcher = context.getRouteMatcher('/pets/:petId', true, false);
    const sensitiveMatcher = context.getRouteMatcher('/pets/:petId', false, true);

    expect(strictMatcher).to.not.equal(defaultMatcher);
    expect(sensitiveMatcher).to.not.equal(defaultMatcher);
    expect(context.getRouteMatcher('/pets/:petId', true, false)).to.equal(strictMatcher);
    expect(context.getRouteMatcher('/pets/:petId', false, true)).to.equal(sensitiveMatcher);
  });
});

function makeContext(): OpenApiContext {
  const spec: Spec = {
    apiDoc: {
      openapi: '3.0.0',
      info: {
        title: 'test',
        version: '1.0.0',
      },
      paths: {
        '/pets/{petId}': {
          get: {
            responses: {
              200: {
                description: 'ok',
              },
            },
          },
        },
      },
    },
    basePaths: [''],
    routes: [
      {
        basePath: '',
        expressRoute: '/pets/:petId',
        openApiRoute: '/pets/{petId}',
        method: 'GET',
        pathParams: ['petId'],
      },
    ],
    serial: 1,
  };

  return new OpenApiContext(spec, undefined, false, false);
}
