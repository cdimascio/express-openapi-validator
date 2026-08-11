import * as path from 'path';
import * as express from 'express';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import { OpenApiValidatorOpts } from '../src/framework/types';
import { AppWithServer } from './common/app.common';

describe('hooks: beforeRequestBodyValidation and afterResponseBodyValidation', () => {
  let app: AppWithServer;
  let basePath: string;

  // Flags to verify hooks are called
  let beforeHookCalled = false;
  let afterHookCalled = false;
  let capturedSchema: any = null;

  const eovConf: OpenApiValidatorOpts = {
    apiSpec: path.join('test', 'resources', 'hooks.yaml'),
    validateRequests: true,
    validateResponses: true,
    beforeRequestBodyValidation: {
      transformRequest: async (req, schema) => {
        beforeHookCalled = true;
        capturedSchema = schema;
        // Mutate req.body — the modified body gets validated
        req.body.extra = 'added-by-hook';
      },
    },
    afterResponseBodyValidation: {
      transformResponse: async (body, req, schema) => {
        afterHookCalled = true;
        capturedSchema = schema;
        if (Array.isArray(body)) {
          return (body as any[]).map((item) => ({ ...item, transformed: true }));
        }
        return { ...(body as object), transformed: true };
      },
    },
  };

  before(async () => {
    // useRoutes=false: no default common routes or error handler
    app = await createApp(eovConf, 3020, undefined, false);
    basePath = app.basePath;

    app.use(
      express
        .Router()
        .post(`${basePath}/hooks/echo`, (req, res) => {
          res.json(req.body);
        })
        .get(`${basePath}/hooks/items`, (req, res) => {
          res.json([
            { id: 1, name: 'item1' },
            { id: 2, name: 'item2' },
          ]);
        })
        .post(`${basePath}/hooks/both`, (req, res) => {
          res.json(req.body);
        })
        .get(`${basePath}/hooks/plain`, (req, res) => {
          res.json({ message: 'hello' });
        })
        .post(`${basePath}/hooks/missing-handler`, (req, res) => {
          res.json({ ok: true });
        })
        .get(`${basePath}/hooks/missing-after-handler`, (req, res) => {
          res.json({ message: 'hello' });
        }),
    );

    // Custom error handler
    app.use((err, req, res, next) => {
      res.status(err.status ?? 500).json({
        message: err.message,
        errors: err.errors,
      });
    });
  });

  after(() => {
    app.server.close();
  });

  beforeEach(() => {
    beforeHookCalled = false;
    afterHookCalled = false;
    capturedSchema = null;
  });

  // ─── beforeRequestBodyValidation ───────────────────────────────────────────

  it('before hook: is called for routes with x-eov-before-request-body-validation', async () => {
    const res = await request(app)
      .post(`${basePath}/hooks/echo`)
      .set('Content-Type', 'application/json')
      .send({ name: 'test', value: 42 });

    expect(res.status).to.equal(200);
    expect(beforeHookCalled).to.be.true;
    expect(capturedSchema).to.have.property('operationId', 'echoPost');
  });

  it('before hook: can mutate req.body before validation runs', async () => {
    // The hook adds `extra: "added-by-hook"` to req.body.
    // The spec defines `extra` as an optional string on the request and response.
    const res = await request(app)
      .post(`${basePath}/hooks/echo`)
      .set('Content-Type', 'application/json')
      .send({ name: 'test', value: 42 });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('extra', 'added-by-hook');
  });

  it('before hook: is NOT called for routes without x-eov extension', async () => {
    const res = await request(app).get(`${basePath}/hooks/plain`);

    expect(res.status).to.equal(200);
    expect(beforeHookCalled).to.be.false;
  });

  it('before hook: errors thrown by the hook propagate to Express error handler', async () => {
    const originalHandler = eovConf.beforeRequestBodyValidation!['transformRequest'];
    eovConf.beforeRequestBodyValidation!['transformRequest'] = async () => {
      throw new Error('hook threw an error');
    };
    try {
      const res = await request(app)
        .post(`${basePath}/hooks/echo`)
        .set('Content-Type', 'application/json')
        .send({ name: 'test', value: 42 });

      expect(res.status).to.equal(500);
      expect(res.body.message).to.equal('hook threw an error');
    } finally {
      eovConf.beforeRequestBodyValidation!['transformRequest'] = originalHandler;
    }
  });

  it('before hook: spec references a handler name not in the map → 500 InternalServerError', async () => {
    const res = await request(app)
      .post(`${basePath}/hooks/missing-handler`)
      .set('Content-Type', 'application/json')
      .send({ name: 'test' });

    expect(res.status).to.equal(500);
    expect(res.body.message).to.include('nonExistentHandler');
  });

  // ─── afterResponseBodyValidation ───────────────────────────────────────────

  it('after hook: is called for routes with x-eov-after-response-body-validation', async () => {
    const res = await request(app).get(`${basePath}/hooks/items`);

    expect(res.status).to.equal(200);
    expect(afterHookCalled).to.be.true;
    expect(capturedSchema).to.have.property('operationId', 'itemsGet');
  });

  it('after hook: can transform the response body before it is sent', async () => {
    const res = await request(app).get(`${basePath}/hooks/items`);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array').with.length(2);
    expect(res.body[0]).to.deep.include({ id: 1, name: 'item1', transformed: true });
    expect(res.body[1]).to.deep.include({ id: 2, name: 'item2', transformed: true });
  });

  it('after hook: is NOT called for routes without x-eov extension', async () => {
    const res = await request(app).get(`${basePath}/hooks/plain`);

    expect(res.status).to.equal(200);
    expect(afterHookCalled).to.be.false;
  });

  it('after hook: errors thrown by the hook propagate to Express error handler', async () => {
    const originalHandler = eovConf.afterResponseBodyValidation!['transformResponse'];
    eovConf.afterResponseBodyValidation!['transformResponse'] = async () => {
      throw new Error('after hook threw an error');
    };
    try {
      const res = await request(app).get(`${basePath}/hooks/items`);

      expect(res.status).to.equal(500);
    } finally {
      eovConf.afterResponseBodyValidation!['transformResponse'] = originalHandler;
    }
  });

  it('after hook: spec references a handler name not in the map → 500 InternalServerError', async () => {
    const res = await request(app).get(`${basePath}/hooks/missing-after-handler`);

    expect(res.status).to.equal(500);
    expect(res.body.message).to.include('nonExistentAfterHandler');
  });

  // ─── Combined ───────────────────────────────────────────────────────────────

  it('both hooks work together on routes that declare both extensions', async () => {
    const res = await request(app)
      .post(`${basePath}/hooks/both`)
      .set('Content-Type', 'application/json')
      .send({ name: 'test' });

    expect(res.status).to.equal(200);
    expect(beforeHookCalled).to.be.true;
    expect(afterHookCalled).to.be.true;
    // before hook added `extra`, after hook added `transformed`
    expect(res.body).to.have.property('extra', 'added-by-hook');
    expect(res.body).to.have.property('transformed', true);
  });

  it('async hooks (returning Promises) work correctly', async () => {
    const originalHandler = eovConf.afterResponseBodyValidation!['transformResponse'];
    eovConf.afterResponseBodyValidation!['transformResponse'] = async (body) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (Array.isArray(body)) {
        return (body as any[]).map((item) => ({ ...item, asyncTransformed: true }));
      }
      return { ...(body as object), asyncTransformed: true };
    };
    try {
      const res = await request(app).get(`${basePath}/hooks/items`);

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(res.body[0]).to.have.property('asyncTransformed', true);
    } finally {
      eovConf.afterResponseBodyValidation!['transformResponse'] = originalHandler;
    }
  });
});

describe('hooks: no regression when hooks are not configured', () => {
  let app: AppWithServer;
  let basePath: string;

  const eovConf: OpenApiValidatorOpts = {
    apiSpec: path.join('test', 'resources', 'hooks.yaml'),
    validateRequests: true,
    validateResponses: true,
    // No beforeRequestBodyValidation or afterResponseBodyValidation
  };

  before(async () => {
    app = await createApp(eovConf, 3021, undefined, false);
    basePath = app.basePath;

    app.use(
      express
        .Router()
        .post(`${basePath}/hooks/echo`, (req, res) => {
          res.json(req.body);
        })
        .get(`${basePath}/hooks/items`, (req, res) => {
          res.json([{ id: 1, name: 'item1' }]);
        })
        .get(`${basePath}/hooks/plain`, (req, res) => {
          res.json({ message: 'hello' });
        }),
    );

    app.use((err, req, res, next) => {
      res.status(err.status ?? 500).json({
        message: err.message,
        errors: err.errors,
      });
    });
  });

  after(() => {
    app.server.close();
  });

  it('validates requests normally when no hooks are configured', async () => {
    const res = await request(app)
      .post(`${basePath}/hooks/echo`)
      .set('Content-Type', 'application/json')
      .send({ name: 'test', value: 42 });

    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({ name: 'test', value: 42 });
  });

  it('rejects invalid request body when no hooks are configured', async () => {
    const res = await request(app)
      .post(`${basePath}/hooks/echo`)
      .set('Content-Type', 'application/json')
      .send({ name: 'test' }); // missing required 'value'

    expect(res.status).to.equal(400);
  });

  it('validates responses normally when no hooks are configured', async () => {
    const res = await request(app).get(`${basePath}/hooks/items`);

    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal([{ id: 1, name: 'item1' }]);
  });

  it('passes plain routes through without modification when no hooks are configured', async () => {
    const res = await request(app).get(`${basePath}/hooks/plain`);

    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({ message: 'hello' });
  });
});
