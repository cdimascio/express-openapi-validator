import { expect } from 'chai';
import * as packageJson from '../package.json';
import {
  InternalServerError,
  UnsupportedMediaType,
  RequestEntityToLarge,
  BadRequest,
  MethodNotAllowed,
  NotFound,
  Unauthorized,
  Forbidden,
} from '../src';
import { HttpError } from '../src/framework/types';

describe(packageJson.name, () => {
  it('should be an instance of BadRequest', async () => {
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
    expect(new BadRequest(err)).to.be.an.instanceof(BadRequest);
    expect(
      HttpError.create({
        status: 400,
        ...err,
      }),
    ).to.be.an.instanceof(BadRequest);
  });

  it('should be an instance of InternalServerError', async () => {
    console.log('Testing instaceof detection of InternalServerError');
    const err = {
      path: '/error',
      message: 'Expected Internal Server Error',
    };
    expect(new InternalServerError(err)).to.be.an.instanceof(
      InternalServerError,
    );
    expect(
      HttpError.create({
        status: 500,
        ...err,
      }),
    ).to.be.an.instanceof(InternalServerError);
  });

  it('should be an instance of UnsupportedMediaType', async () => {
    console.log('Testing instaceof detection of UnsupportedMediaType');
    const err = {
      path: '/unsupported_media_type',
      message: 'unsupported media type application/json',
    };
    expect(new UnsupportedMediaType(err)).to.be.an.instanceof(
      UnsupportedMediaType,
    );
    expect(
      HttpError.create({
        status: 415,
        ...err,
      }),
    ).to.be.an.instanceof(UnsupportedMediaType);
  });

  it('should be an instance of RequestEntityToLarge', async () => {
    console.log('Testing instaceof detection of RequestEntityToLarge');
    const err = {
      path: '/entity_to_large',
      message: 'request qntity too large',
    };
    expect(new RequestEntityToLarge(err)).to.be.an.instanceof(
      RequestEntityToLarge,
    );
    expect(
      HttpError.create({
        status: 413,
        ...err,
      }),
    ).to.be.an.instanceof(RequestEntityToLarge);
  });

  it('should be an instance of MethodNotAllowed', async () => {
    console.log('Testing instaceof detection of MethodNotAllowed');
    const err = {
      path: '/method_not_allowed',
      message: 'POST method not allowed',
    };
    expect(new MethodNotAllowed(err)).to.be.an.instanceof(MethodNotAllowed);
    expect(
      HttpError.create({
        status: 405,
        ...err,
      }),
    ).to.be.an.instanceof(MethodNotAllowed);
  });

  it('should be an instance of NotFound', async () => {
    console.log('Testing instaceof detection of NotFound');
    const err = {
      path: '/not_found',
      message: 'not found',
    };
    expect(new NotFound(err)).to.be.an.instanceof(NotFound);
    expect(
      HttpError.create({
        status: 404,
        ...err,
      }),
    ).to.be.an.instanceof(NotFound);
  });

  it('should be an instance of Unauthorized', async () => {
    console.log('Testing instaceof detection of Unauthorized');
    const err = {
      path: '/unauthorized',
      message: 'unauthorized',
    };
    expect(new Unauthorized(err)).to.be.an.instanceof(Unauthorized);
    expect(
      HttpError.create({
        status: 401,
        ...err,
      }),
    ).to.be.an.instanceof(Unauthorized);
  });

  it('should be an instance of Forbidden', async () => {
    console.log('Testing instaceof detection of Forbidden');
    const err = {
      path: '/forbidden',
      message: 'forbidden',
    };
    expect(new Forbidden(err)).to.be.an.instanceof(Forbidden);
    expect(
      HttpError.create({
        status: 403,
        ...err,
      }),
    ).to.be.an.instanceof(Forbidden);
  });
});
