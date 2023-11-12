import { expect } from 'chai';
import type {
  Express,
  IRouter,
  Response,
  NextFunction,
  Request,
} from 'express';
import * as express from 'express';
import { OpenAPIV3 } from '../src/framework/types';
import * as request from 'supertest';
import { createApp } from './common/app';

import * as OpenApiValidator from '../src';
import { Server } from 'http';

interface HTTPError extends Error {
  status: number;
  text: string;
  method: string;
  path: string;
}

describe('when useRequestUrl is set to "true" on the child router', async () => {
  let app: Express & { server?: Server };

  before(async () => {
    const router = makeRouter({ useRequestUrl: true });
    app = await makeMainApp();
    app.use(router);
  });

  after(() => app?.server?.close());

  it('should apply parent app schema to requests', async () => {
    const result = await request(app).get('/api/pets/1');
    const error = result.error as HTTPError;
    expect(result.statusCode).to.equal(400);
    expect(error.path).to.equal('/api/pets/1');
    expect(error.text).to.contain(
      'Bad Request: request/params/petId must NOT have fewer than 3 characters',
    );
  });

  it('should apply child router schema to requests', async () => {
    const result = await request(app).get('/api/pets/not-uuid');
    const error = result.error as HTTPError;
    expect(result.statusCode).to.equal(400);
    expect(error.path).to.equal('/api/pets/not-uuid');
    expect(error.text).to.contain(
      'Bad Request: request/params/petId must match format &quot;uuid&quot',
    );
  });

  it('should return a reponse if request is valid', async () => {
    const validId = 'f627f309-cae3-46d2-84f7-d03856c84b02';
    const result = await request(app).get(`/api/pets/${validId}`);
    expect(result.statusCode).to.equal(200);
    expect(result.body).to.deep.equal({
      id: 'f627f309-cae3-46d2-84f7-d03856c84b02',
      name: 'Mr Sparky',
      tag: "Ain't nobody tags me",
    });
  });
});

describe('when useRequestUrl is set to "false" on the child router', async () => {
  let app: Express & { server?: Server };

  before(async () => {
    const router = makeRouter({ useRequestUrl: false });
    app = await makeMainApp();
    app.use(router);
  });

  after(() => app?.server?.close());

  it('should throw not found', async () => {
    const result = await request(app).get('/api/pets/valid-pet-id');
    const error = result.error as HTTPError;
    expect(result.statusCode).to.equal(404);
    expect(error.path).to.equal('/api/pets/valid-pet-id');
    expect(error.text).to.contain('Not Found');
  });
});

function defaultResponse(): OpenAPIV3.ResponseObject {
  return {
    description: 'unexpected error',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['code', 'message'],
          properties: {
            code: {
              type: 'integer',
              format: 'int32',
            },
            message: {
              type: 'string',
            },
          },
        },
      },
    },
  };
}

/* 
   represents spec of the "public" entrypoint to our application e.g gateway. The
   type of id in path and id in the response here defined as simple string
   with minLength
 */
const gatewaySpec: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { version: '1.0.0', title: 'test bug OpenApiValidator' },
  servers: [{ url: 'http://localhost:3000/api' }],
  paths: {
    '/pets/{petId}': {
      get: {
        summary: 'Info for a specific pet',
        operationId: 'showPetById',
        tags: ['pets'],
        parameters: [
          {
            name: 'petId',
            in: 'path',
            required: true,
            description: 'The id of the pet to retrieve',
            schema: {
              type: 'string',
              minLength: 3,
            },
          },
        ],
        responses: {
          '200': {
            description: 'Expected response to a valid request',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id', 'name'],
                  properties: {
                    id: {
                      type: 'string',
                    },
                    name: {
                      type: 'string',
                    },
                    tag: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          default: defaultResponse(),
        },
      },
    },
  },
};

/*
 represents spec of the child router. We route request from main app (gateway) to this router.
 This router has its own schema, routes and validation formats. In particular, we force id in the path and id in the response to be uuid.
 */
const childRouterSpec: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { version: '1.0.0', title: 'test bug OpenApiValidator' },
  servers: [{ url: 'http://localhost:3000/' }],
  paths: {
    '/internal/api/pets/{petId}': {
      get: {
        summary: 'Info for a specific pet',
        operationId: 'showPetById',
        tags: ['pets'],
        parameters: [
          {
            name: 'petId',
            in: 'path',
            required: true,
            description: 'The id of the pet to retrieve',
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Expected response to a valid request',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id', 'name'],
                  properties: {
                    id: {
                      type: 'string',
                      format: 'uuid',
                    },
                    name: {
                      type: 'string',
                    },
                    tag: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

function redirectToInternalService(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  req.url = `/internal${req.originalUrl}`;
  next();
}

function makeMainApp(): ReturnType<typeof createApp> {
  return createApp(
    {
      apiSpec: gatewaySpec,
      validateResponses: true,
      validateRequests: true,
    },
    3000,
    (app) => {
      app
        .get(
          '/api/pets/:petId',
          function (_req: Request, _res: Response, next: NextFunction) {
            next();
          },
        )
        .use(redirectToInternalService);
    },
    false,
  );
}

function makeRouter({ useRequestUrl }: { useRequestUrl: boolean }): IRouter {
  return express
    .Router()
    .use(
      OpenApiValidator.middleware({
        apiSpec: childRouterSpec,
        validateRequests: true,
        validateResponses: true,
        useRequestUrl,
      }),
    )
    .get('/internal/api/pets/:petId', function (req, res) {
      res.json({
        id: req.params.petId,
        name: 'Mr Sparky',
        tag: "Ain't nobody tags me",
      });
    });
}
