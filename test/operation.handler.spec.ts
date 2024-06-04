import path from 'path';
import express from 'express';
import { expect } from 'chai';
import request from 'supertest';
import * as OpenApiValidator from '../src';
import * as resolvers from '../src/resolvers';
import { ExpressWithServer, createApp } from './common/app';
import { OpenApiValidatorOpts } from '../src/framework/types';

describe('operation handler', () => {
  let defaultNumberOfRoutes: number;

  before(() => {
    const apiSpec = path.join(__dirname, 'resources/eov-operations.yaml');
    const app = express();

    const mwf = OpenApiValidator.middleware;
    app.use(mwf({ apiSpec }));

    expect((<any>mwf)._oav)
      .to.have.property('options')
      .to.deep.include({ operationHandlers: false });

    defaultNumberOfRoutes = app._router.stack.length;
  });

  it('should not install handlers when nothing provided', async () => {
    const apiSpec = path.join(__dirname, 'resources/eov-operations.yaml');
    const app = express();

    const mwf = OpenApiValidator.middleware;
    app.use(mwf({ apiSpec }));

    expect((<any>mwf)._oav)
      .to.have.property('options')
      .to.deep.include({ operationHandlers: false });
  });

  it('should use the default handler when string provided', async () => {
    const apiSpec = path.join(__dirname, 'resources/eov-operations.yaml');
    const app = express();

    const mwf = OpenApiValidator.middleware;
    const oav = mwf({
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
    const oav = mwf({
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

describe('custom operation handler', () => {
  let app: ExpressWithServer;
  let basePath: string;

  const apiSpec = path.join(
    __dirname,
    'resources/eov-operations.modulepath.yaml',
  );
  const handler = {
    basePath: path.join(__dirname, 'resources/routes'),
    resolver: resolvers.modulePathResolver,
  };
  const eovConf: OpenApiValidatorOpts = {
    apiSpec,
    operationHandlers: handler,
  };

  before(async () => {
    app = await createApp(eovConf, 3005);
    basePath = app.basePath;
  });

  after(async () => {
    await app.closeServer();
  });

  it('should recognize mapped operation', async () =>
    request(app)
      .get(`${basePath}/ping`)
      .expect(200)
      .then((r) => {
        expect(r.text).to.be.equal('pong');
      }));
});
