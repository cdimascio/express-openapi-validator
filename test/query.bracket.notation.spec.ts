import { expect } from 'chai';
import { describe, it } from 'mocha';
import { RequestParameterMutator } from '../src/middlewares/parsers/req.parameter.mutator';
import Ajv from 'ajv';
import { OpenAPIV3 } from '../src/framework/types';

type DocumentV3 = OpenAPIV3.DocumentV3;

describe('RequestParameterMutator - handleBracketNotationQueryFields', () => {
  const ajv = new Ajv();
  const mockApiDoc: DocumentV3 = {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {}
  };

  const createMockRequest = (query: any) => ({
    query,
    _openapi: {
      schema: {
        parameters: [
          // This simulates the parameters defined in the OpenAPI spec
          { name: 'filter[name]', in: 'query', schema: { type: 'string' } },
          { name: 'user', in: 'query', schema: { type: 'object' } }
        ]
      }
    }
  });

  const testValidationSchema = {
    body: {},
    query: {
      type: 'object',
      properties: {
        'filter[name]': { type: 'string' },
        'user': { type: 'object' },
        'user[name]': { type: 'string' },
        'user[age]': { type: 'string' },
        'simple': { type: 'string' },
        'another': { type: 'string' }
      },
      additionalProperties: true
    },
    headers: {},
    params: {},
    cookies: {}
  };

  it('should preserve literal bracket notation when defined in the spec', () => {
    // Arrange
    const req = createMockRequest({
      'filter[name]': 'test',
      _openapi: { schema: { parameters: [{ name: 'filter[name]', in: 'query' }] } }
    });
    const mutator = new RequestParameterMutator(ajv, mockApiDoc, '/test', testValidationSchema);

    // Act
    const result = mutator['handleBracketNotationQueryFields'](req.query);

    // Assert
    expect(result).to.have.property('filter[name]', 'test');
    expect(result).to.not.have.property('filter');
  });

  it('should parse bracket notation as nested object when not defined in spec', () => {
    // Arrange
    const req = createMockRequest({
      'user[name]': 'John',
      'user[age]': '30',
      _openapi: { schema: { parameters: [{ name: 'user', in: 'query', schema: { type: 'object' } }] } }
    });
    const mutator = new RequestParameterMutator(ajv, mockApiDoc, '/test', testValidationSchema);

    // Act
    const result = mutator['handleBracketNotationQueryFields'](req.query);

    // Assert
    expect(result).to.have.property('user');
    expect(result.user).to.deep.equal({ name: 'John', age: '30' });
    expect(result).to.not.have.property('user[name]');
    expect(result).to.not.have.property('user[age]');
  });

  it('should handle mixed literal and nested bracket notation', () => {
    // Arrange
    const req = createMockRequest({
      'filter[name]': 'test',
      'user[age]': '30',
      _openapi: { 
        schema: { 
          parameters: [
            { name: 'filter[name]', in: 'query', schema: { type: 'string' } },
            { name: 'user', in: 'query', schema: { type: 'object' } }
          ] 
        } 
      }
    });
    const mutator = new RequestParameterMutator(ajv, mockApiDoc, '/test', testValidationSchema);

    // Act
    const result = mutator['handleBracketNotationQueryFields'](req.query);

    // Assert
    expect(result).to.have.property('filter[name]', 'test');
    expect(result).to.have.property('user');
    expect(result.user).to.deep.equal({ age: '30' });
    expect(result).to.not.have.property('filter');
    expect(result).to.not.have.property('user[age]');
  });

  it('should not modify parameters without brackets', () => {
    // Arrange
    const req = createMockRequest({
      simple: 'value',
      another: 'test',
      _openapi: { schema: { parameters: [] } }
    });
    const mutator = new RequestParameterMutator(ajv, mockApiDoc, '/test', testValidationSchema);
    testValidationSchema
    // Act
    const result = mutator['handleBracketNotationQueryFields'](req.query);

    // Assert
    expect(result).to.deep.equal({
      simple: 'value',
      another: 'test',
      _openapi: { schema: { parameters: [] } }
    });
  });
});
