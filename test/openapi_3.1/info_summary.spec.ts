import * as request from 'supertest';
import { createApp } from "../common/app";
import { join } from "path";

describe('summary support - OpenAPI 3.1', () => {
  let app;

  before(async () => {
    const apiSpec = join('test', 'openapi_3.1', 'resources', 'info_summary.yaml');
    app = await createApp(
      { apiSpec, validateRequests: true },
      3005,
      undefined,
      false,
    );
  });

  after(() => {
    app.server.close();
  });

  it('should support an API that has an info with a summary defined', () => {
    // The endpoint is not made available by the provider API, so the request will return 404
    // This test ensures that the request flow happens normally without any interruptions
    return request(app)
      .get(`${app.basePath}/webhook`)
      .expect(404);
  });

})