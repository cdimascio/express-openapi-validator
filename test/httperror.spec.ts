import { expect } from 'chai';
import * as packageJson from '../package.json';
import { error } from '../src';
import { HttpError } from '../src/framework/types';

describe(packageJson.name, () => {
  it('should be an instance of BadRequest', (done) => {
    console.log('Testing instaceof detection of BadRequest');
    const err = {
      path: '.query.domain_id',
      errors: [
        {
          path: '.query.domain_id',
          message: "should have required property 'domain_id'",
          error_code: 'required.openapi.validation',
        },
      ],
    };
    expect(new error.BadRequest(err)).to.be.an.instanceof(error.BadRequest);
    expect(
      HttpError.create({
        status: 400,
        ...err,
      }),
    ).to.be.an.instanceof(error.BadRequest);
    done();
  });

  it('should be an instance of InternalServerError', (done) => {
    console.log('Testing instaceof detection of InternalServerError');
    const err = {
      path: '/error',
      message: 'Expected Internal Server Error',
    };
    expect(new error.InternalServerError(err)).to.be.an.instanceof(
      error.InternalServerError,
    );
    expect(
      HttpError.create({
        status: 500,
        ...err,
      }),
    ).to.be.an.instanceof(error.InternalServerError);
    done();
  });

  it('should be an instance of UnsupportedMediaType', (done) => {
    console.log('Testing instaceof detection of UnsupportedMediaType');
    const err = {
      path: '/unsupported_media_type',
      message: 'unsupported media type application/json',
    };
    expect(new error.UnsupportedMediaType(err)).to.be.an.instanceof(
      error.UnsupportedMediaType,
    );
    expect(
      HttpError.create({
        status: 415,
        ...err,
      }),
    ).to.be.an.instanceof(error.UnsupportedMediaType);
    done();
  });

  it('should be an instance of RequestEntityTooLarge', (done) => {
    console.log('Testing instaceof detection of RequestEntityTooLarge');
    const err = {
      path: '/entity_too_large',
      message: 'request entity too large',
    };
    expect(new error.RequestEntityTooLarge(err)).to.be.an.instanceof(
      error.RequestEntityTooLarge,
    );
    expect(
      HttpError.create({
        status: 413,
        ...err,
      }),
    ).to.be.an.instanceof(error.RequestEntityTooLarge);
    done();
  });

  it('should be an instance of MethodNotAllowed', (done) => {
    console.log('Testing instaceof detection of MethodNotAllowed');
    const err = {
      path: '/method_not_allowed',
      message: 'POST method not allowed',
    };
    expect(new error.MethodNotAllowed(err)).to.be.an.instanceof(error.MethodNotAllowed);
    expect(
      HttpError.create({
        status: 405,
        ...err,
      }),
    ).to.be.an.instanceof(error.MethodNotAllowed);
    done();
  });

  it('should be an instance of NotFound', (done) => {
    console.log('Testing instaceof detection of NotFound');
    const err = {
      path: '/not_found',
      message: 'not found',
    };
    expect(new error.NotFound(err)).to.be.an.instanceof(error.NotFound);
    expect(
      HttpError.create({
        status: 404,
        ...err,
      }),
    ).to.be.an.instanceof(error.NotFound);
    done();
  });

  it('should be an instance of Unauthorized', (done) => {
    console.log('Testing instaceof detection of Unauthorized');
    const err = {
      path: '/unauthorized',
      message: 'unauthorized',
    };
    expect(new error.Unauthorized(err)).to.be.an.instanceof(error.Unauthorized);
    expect(
      HttpError.create({
        status: 401,
        ...err,
      }),
    ).to.be.an.instanceof(error.Unauthorized);
    done();
  });

  it('should be an instance of Forbidden', (done) => {
    console.log('Testing instaceof detection of Forbidden');
    const err = {
      path: '/forbidden',
      message: 'forbidden',
    };
    expect(new error.Forbidden(err)).to.be.an.instanceof(error.Forbidden);
    expect(
      HttpError.create({
        status: 403,
        ...err,
      }),
    ).to.be.an.instanceof(error.Forbidden);
    done();
  });
});
