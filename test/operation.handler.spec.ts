import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import { OpenApiValidator } from '../src';
import * as resolvers from '../src/resolvers';

describe('operation handler', () => {
  it('should not install handlers when nothing provided', async () => {
    const apiSpec = path.join(__dirname, 'resources/eov-operations.yaml');
    const app = express();

    const oam = new OpenApiValidator({ 
      apiSpec
    })
    
    oam.installSync(app);

    expect(oam)
      .to.have.property('options')
      .to.deep.include({ operationHandlers: false });
    
    expect(app._router.stack.length).to.equal(6)
  })

  it('should use the default handler when string provided', async () => {
    const apiSpec = path.join(__dirname, 'resources/eov-operations.yaml');
    const app = express();

    const oam = new OpenApiValidator({ 
      apiSpec,
      operationHandlers: path.join(__dirname, 'resources')
    })
    
    oam.installSync(app);

    expect(oam)
      .to.have.property('options')
      .to.deep.include({ operationHandlers: {
        basePath: path.join(__dirname, 'resources'),
        resolver: resolvers.defaultResolver
      }});
    
    expect(app._router.stack.length).to.be.greaterThan(6)
  });

  it('can use a custom operation resolver', async () => {
    const apiSpec = path.join(__dirname, 'resources/eov-operations.modulepath.yaml');
    const app = express();

    const handler = {
      basePath: path.join(__dirname, 'resources/routes'),
      resolver: resolvers.modulePathResolver
    };

    const oam = new OpenApiValidator({ 
      apiSpec,
      operationHandlers: handler
    })
    
    oam.installSync(app);

    expect(oam)
      .to.have.property('options')
      .to.deep.include({ operationHandlers: handler});
    
    expect(app._router.stack.length).to.be.greaterThan(6)
  });
});
