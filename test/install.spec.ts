import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import { OpenApiValidator } from '../src';

describe('install', () => {
  it('should succeed when spec exists and is valid', async () => {
    const apiSpec = path.join('test', 'resources', 'openapi.yaml');
    const oam = new OpenApiValidator({ apiSpec });

    expect(oam)
      .to.have.property('install')
      .that.is.a('function');
  });

  it('should throw when spec is missing', async () => {
    try {
      await new OpenApiValidator({
        apiSpec: './not-found.yaml',
      }).install(express());
    } catch (e) {
      expect(e.message).to.contain(
        'spec could not be read at ./not-found.yaml',
      );
    }
  });

  it('should throw when security handlers are specified in new and old', async () => {
    const apiSpec = path.join('test', 'resources', 'openapi.yaml');
    expect(function() {
      return new OpenApiValidator({
        apiSpec,
        validateSecurity: {},
        securityHandlers: {},
      });
    }).to.throw(
      'securityHandlers and validateSecurity may not be used together. Use validateSecurities.handlers to specify handlers.',
    );
  });
});
