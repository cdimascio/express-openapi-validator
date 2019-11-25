import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import { OpenApiValidator } from '../src';
import * as packageJson from '../package.json';

describe(packageJson.name, () => {
  it('should succeed when spec exists and is valid', async () => {
    const apiSpec = path.join('test', 'resources', 'openapi.yaml');
    const oam = new OpenApiValidator({ apiSpec });

    expect(oam)
      .to.have.property('install')
      .that.is.a('function');
  });

  it('should throw when spec is missing', async () => {
    const createMiddleware = () =>
      new OpenApiValidator({
        apiSpec: './not-found.yaml',
      }).install(express());

    expect(createMiddleware).to.throw(
      'spec could not be read at ./not-found.yaml',
    );
  });
});
