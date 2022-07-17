import { buildSchemasWithAsync } from '../src/framework/ajv/build-async-schema';
import { expect } from 'chai';

describe('async.decorator', () => {
  it('should add $async when no dependents', async () => {
    const schemas = {
      A: {
        type: 'string',
        format: 'no-async-format'
      },
      B: {
        type: 'string',
        format: 'async-format'
      }
    }

    const possiblyAsyncSchemas = buildSchemasWithAsync(
      {
      'async-format': true
      },
      schemas as Parameters<typeof buildSchemasWithAsync>[1]
    )

    expect(possiblyAsyncSchemas.A).not.to.have.property('$async');
    expect(possiblyAsyncSchemas.B).to.have.property('$async');
  })

  it('should add $async to async schema and dependents from $ref', async () => {
    const schemas = {
      A: {
        type: 'string',
        format: 'no-async-format'
      },
      B: {
        type: 'string',
        format: 'async-format'
      },
      C: {
        type: 'object',
        properties: {
          D: {
            $ref: '#/components/schemas/B'
          }
        }
      },
      E: {
        $ref: '#/components/schemas/C'
      }
    }

    const possiblyAsyncSchemas = buildSchemasWithAsync(
      {
      'async-format': true
      },
      schemas as Parameters<typeof buildSchemasWithAsync>[1]
    )

    expect(possiblyAsyncSchemas.A).not.to.have.property('$async');
    expect(possiblyAsyncSchemas.B).to.have.property('$async');
    expect(possiblyAsyncSchemas.C).to.have.property('$async');
    expect(possiblyAsyncSchemas.E).to.have.property('$async');
  })
});