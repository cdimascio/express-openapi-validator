import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as OpenApiValidator from '../src';
import * as resolvers from '../src/resolvers';

describe('operation handler', () => {
  let defaultNumberOfRoutes = null;

  before(async () => {
    const apiSpec = path.join(__dirname, 'resources/eov-operations.yaml');
    const app = express();

    const mwf = OpenApiValidator.middleware;
    app.use(mwf(app, { apiSpec }));

    expect((<any>mwf)._oav)
      .to.have.property('options')
      .to.deep.include({ operationHandlers: false });

    defaultNumberOfRoutes = app._router.stack.length;
  });

  it('should not install handlers when nothing provided', async () => {
    const apiSpec = path.join(__dirname, 'resources/eov-operations.yaml');
    const app = express();

    const mwf = OpenApiValidator.middleware;
    app.use(mwf(app, { apiSpec }));

    expect((<any>mwf)._oav)
      .to.have.property('options')
      .to.deep.include({ operationHandlers: false });
  });

  it('should use the default handler when string provided', async () => {
    const apiSpec = path.join(__dirname, 'resources/eov-operations.yaml');
    const app = express();

    const mwf = OpenApiValidator.middleware;
    const oav = mwf(app, {
      apiSpec,
      operationHandlers: path.join(__dirname, 'resources'),
    });

    app.use(oav);

    expect((<any>mwf)._oav)
      .to.have.property('options')
      .to.deep.include({
        operationHandlers: {
          basePath: path.join(__dirname, 'resources'),
          resolver: resolvers.defaultResolver,
        },
      });

    // expect(app._router.stack.length).to.be.greaterThan(defaultNumberOfRoutes);
  });

  it('can use a custom operation resolver', async () => {
    const apiSpec = path.join(
      __dirname,
      'resources/eov-operations.modulepath.yaml',
    );
    const app = express();

    const handler = {
      basePath: path.join(__dirname, 'resources/routes'),
      resolver: resolvers.modulePathResolver,
    };

    const mwf = OpenApiValidator.middleware;
    const oav = mwf(app, {
      apiSpec,
      operationHandlers: handler,
    });

    app.use(oav);

    expect((<any>mwf)._oav)
      .to.have.property('options')
      .to.deep.include({ operationHandlers: handler });

    // expect(app._router.stack.length).to.be.greaterThan(defaultNumberOfRoutes);
  });
});
