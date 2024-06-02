import * as express from 'express';
import { Server } from 'http';
import * as request from 'supertest';
import * as OpenApiValidator from '../src';
import { OpenAPIV3 } from '../src/framework/types';
import { startServer } from './common/app.common';
import { deepStrictEqual } from 'assert';
import * as path from 'path';


const apiSpecPath = path.join('test', 'resources', '699.yaml');

const date = new Date()
describe('issue #821 - serialization inside addiotionalProperties', () => {
  it('serializa both outer and inner date in addiotionalProperties', async () => {

    const app = await createApp(apiSpecPath);
    await request(app).get('/test').expect(200, 
      {
        outer_date: date.toISOString(),
        other_info: {
          something: {
            inner_date: date.toISOString()
          }
        }
      }      
    );
    app.server!.close();
  });
});

async function createApp(
  apiSpec: OpenAPIV3.Document | string,
): Promise<express.Express & { server?: Server }> {
  const app = express();

  app.use(
    OpenApiValidator.middleware({
      apiSpec: apiSpecPath,
      validateRequests: true,
      validateResponses: true,
    }),
  );
  app.get('/test', (req, res) => {
    return res.status(200).json({
      outer_date: date,
      other_info: {
        something: {
          inner_date: date
        }
      }
    })

  })

  app.use((err, req, res, next) => {
    console.error(err); // dump error to console for debug
    res.status(err.status || 500).json({
      message: err.message,
      errors: err.errors,
    });
  });

  await startServer(app, 3001);
  return app;
}


