import * as request from 'supertest';
import { createApp } from '../common/app';
import { join } from 'path';

describe('server variable - OpenAPI 3.1', () => {
  it('returns 500 when server variable has no default property', async () => {
    const apiSpec = join(
      'test',
      'openapi_3.1',
      'resources',
      'server_variable_no_default.yaml',
    );
    const app = (await createApp(
      { apiSpec, validateRequests: true, validateResponses: true },
      3005,
      undefined,
      false,
    )) as any;

    await request(app).get(`${app.basePath}`).expect(500);

    app.server.close();
  });
});
