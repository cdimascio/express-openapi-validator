import {
  buildSchemasWithAsync,
  buildAsyncFormats,
  hasAnySchemaWithAsync,
  hasAsync,
  buildSchemaWithAsync
} from '../src/framework/ajv/async-util';
import { expect } from 'chai';

describe('async.utils', () => {
  it('should buildSchemasWithAsync add $async when no dependents', async () => {
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

  it('should buildSchemasWithAsync add $async to async schema and dependents from $ref', async () => {
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

  it('should buildAsyncFormats error if async included in a format', () => {
    const invokeWithAsyncFormat = () => buildAsyncFormats({
      // @ts-expect-error
      formats: [{
        async: true,
        validate: async (a) => { return true; }
      }]
    });
    expect(invokeWithAsyncFormat).to.throw('async not yet implemented on formats');
  });

  it('should buildAsyncFormats contain entry for all async serdes formats', () => {
    const asyncFormats = buildAsyncFormats({
      serDesMap: {
        'foo': {
          async: true,
          format: 'foo',
          deserialize: async () => {}
        },
        'bar': {
          format: 'foo',
          deserialize: () => {}
        }
      }
    });
    expect(asyncFormats).to.have.property('foo');
    expect(asyncFormats).not.to.have.property('bar');
    expect(asyncFormats['foo']).to.be.true;
  });

  it('should hasAnySchemaWithAsync return true with object contains $async subschemas', () => {
    expect(hasAnySchemaWithAsync({
      foo: {
        $async: true
      },
      bar: {
        $async: false
      },
      foobar: {}
    })).to.be.true;
  });

  it('should hasAnySchemaWithAsync return false with object contains $async subschemas', () => {
    expect(hasAnySchemaWithAsync({
      foo: {
        $async: undefined
      },
      bar: {
        $async: false
      },
      foobar: {}
    })).to.be.false;
  });

  it('should hasAsync return true with object.components.schemas contains $async subschemas', () => {
    expect(hasAsync({
      components: {
        schemas: {
          foo: {
            $async: true
          },
          bar: {
            $async: false
          },
          foobar: {}
        }
      }
    })).to.be.true;
  });

  it('should hasAsync return false with object.components.schemas contains $async subschemas', () => {
    expect(hasAsync({
      components: {
        schemas: {
          foo: {
            $async: undefined
          },
          bar: {
            $async: false
          },
          foobar: {}
        }
      }
    })).to.be.false;
  });

  it('should hasAsync return false with no object.components.schemas value', () => {
    expect(hasAsync({
      components: {
        schemas: {}
      }
    })).to.be.false;
    expect(hasAsync({
      components: {}
    })).to.be.false;
    expect(hasAsync({})).to.be.false;
  });

  it('should buildSchemaWithAsync returns new schema with top level $async if subschema contains $async', () => {
    const inSchema = {
      components: {
        schemas: {
          foo: {
            $async: true
          },
          bar: {
            $async: false
          },
          foobar: {}
        }
      }
    };
    const builtSchema = buildSchemaWithAsync(inSchema);
    expect(builtSchema['$async']).to.be.true;
    expect(builtSchema).to.eql({
      ...inSchema,
      $async: true
    })
  });

  it('should buildSchemaWithAsync returns new schema with NO top level $async if subschema does not contain $async', () => {
    const inSchema = {
      components: {
        schemas: {
          foo: {
            $async: undefined
          },
          bar: {
            $async: false
          },
          foobar: {}
        }
      }
    };
    const builtSchema = buildSchemaWithAsync(inSchema);
    expect(builtSchema['$async']).to.be.undefined;
    expect(builtSchema).to.eql(inSchema);
  });

});