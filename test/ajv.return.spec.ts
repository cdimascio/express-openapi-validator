import * as path from 'path';
import { expect } from 'chai';

import { date, dateTime } from '../src/framework/base.serdes';
import * as OpenApiValidator  from '../src';
import { Ajv } from 'ajv';

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
  let ajv : Ajv = null;

  before(async () => {
    ajv = await OpenApiValidator.ajv({
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

  it('should control BAD id format and throw an error', async () => {
    class ReqClass {
      id: string|ObjectID
    }

    const req : ReqClass = {
      id : '507f191e810c19729de860ea',
    }

    ajv.validate(
      {
        type: 'object',
        properties: {
          id: {
            $ref: '#/components/schemas/ObjectId',
          },
        },
        required: ['token'],
        additionalProperties: false,
      },
      req
    );
    expect(req.id instanceof ObjectID).to.be.true;
  });
});



