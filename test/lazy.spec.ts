import { expect } from 'chai';

import { middleware } from '../src';
import { OpenAPIV3 } from '../src/framework/types';
import * as fs from 'fs';

describe('lazy loading', () => {
  let called = false;
  let originalExistsSync: any;

  before(() => {
    originalExistsSync = fs.existsSync;
    (fs as any).existsSync = () => {
      called = true;
      return false;
    };
  });

  after(() => {
    (fs as any).existsSync = originalExistsSync;
  });

  beforeEach(() => {
    called = false;
  });

  it('normally immediately reads the spec file', async () => {
    middleware({
      apiSpec: 'does-not-exist.yaml',
    });
    expect(called).to.be.true;
  });

  it('reads the file on first use in lazyLoad mode', async () => {
    const middlewares = middleware({
      apiSpec: 'does-not-exist.yaml',
      lazyLoadApiSpec: true,
    });
    expect(called).to.be.false;
    const err = await new Promise<any>((resolve) =>
      middlewares[0]({} as any, {} as any, resolve),
    );
    expect(called).to.be.true;
    expect(err).to.be.an.instanceOf(Error);
    expect(err.message).to.contain('could not be read at');
  });
});
