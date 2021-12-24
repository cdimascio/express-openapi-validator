import * as path from 'path';
import { expect } from 'chai';

import { date, dateTime } from '../src/framework/base.serdes';
import * as OpenApiValidator  from '../src';
import { OpenAPIV3 } from '../src/framework/types';
import Ajvs = OpenAPIV3.Ajvs;

const apiSpecPath = path.join('test', 'resources', 'serdes.yaml');

class ObjectID {
  id: string;

  constructor(id: string = "5fdefd13a6640bb5fb5fa925") {
    this.id = id;
  }

  toString() {
    return this.id;
  }
}

describe('ajv.return', () => {
  let ajvs : Ajvs = null;

  class ReqRes {
    id?: string|ObjectID
  }

  const customSchema = {
    type: 'object',
    properties: {
      id: {
        $ref: '#/components/schemas/ObjectId',
      },
    },
    required: ['id'],
    additionalProperties: false,
  };

  before(async () => {
    ajvs = await OpenApiValidator.ajv({
      apiSpec: apiSpecPath,
      validateRequests: {
        coerceTypes: true
      },
      validateResponses: {
        coerceTypes: true
      },
      serDes: [
        date,
        dateTime,
        {
          format: "mongo-objectid",
          deserialize: (s) => new ObjectID(s),
          serialize: (o) => o.toString(),
        },
      ],
      unknownFormats: ['string-list'],
    });
  });

  it('should control request and deserialize string to object', async () => {
    const req : ReqRes = {
      id : '507f191e810c19729de860ea',
    }

    const isValid = ajvs.req.validate(
      customSchema,
      req
    );
    expect(isValid).to.be.equal(true);
    expect(ajvs.req.errors).to.be.equal(null);
    expect(req.id instanceof ObjectID).to.be.true;
  });

  it('should control request and return error if id is not set', async () => {
    const req : ReqRes = {
      // No id but it is required
      // id : '507f191e810c19729de860ea',
    }

    const isValid = ajvs.req.validate(
      customSchema,
      req
    );
    expect(isValid).to.be.equal(false);
    expect(ajvs.req.errors.length).to.be.equal(1);
    expect(ajvs.req.errors[0].message).to.be.equal('should have required property \'id\'');
  });

  it('should control request and return error if id is in bad format', async () => {
    const req : ReqRes = {
       id : 'notAnObjectId',
    }

    const isValid = ajvs.req.validate(
      customSchema,
      req
    );
    expect(isValid).to.be.equal(false);
    expect(ajvs.req.errors.length).to.be.equal(1);
    expect(ajvs.req.errors[0].message).to.be.equal('should match pattern "^[0-9a-fA-F]{24}$"');
  });


  it('should control response and serialize object to string', async () => {
    const res : ReqRes = {
      id : new ObjectID('507f191e810c19729de860ea'),
    }

    const isValid = ajvs.res.validate(
      customSchema,
      res
    );
    expect(res.id).to.be.equal('507f191e810c19729de860ea');
    expect(isValid).to.be.equal(true);
    expect(ajvs.res.errors).to.be.equal(null);
  });

  it('should control response and return an error if id is not set', async () => {

    const res : ReqRes = {
      // No id but it is required
      // id : '507f191e810c19729de860ea',
      //id : new ObjectID('507f191e810c19729de860ea'),
    }

    const isValid = ajvs.res.validate(
      customSchema,
      res
    );
    expect(isValid).to.be.equal(false);
    expect(ajvs.res.errors.length).to.be.equal(1);
    expect(ajvs.res.errors[0].message).to.be.equal('should have required property \'id\'');
  });
});



