import * as express from 'express';
import * as path from 'path';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import * as logger from 'morgan';

import * as OpenApiValidator  from '../../src';
import { startServer, routes } from './app.common';
import { OpenApiValidatorOpts } from '../../src/framework/types';

export class JsonResponse {
  public status: number;
  public message: string;
  public data: any;

  constructor(status: number, message: string, data: any) {
    this.status = status;
    this.message = message;
    this.data = data;  
  }
}

export async function createApp(
  opts?: OpenApiValidatorOpts,
  port = 3000,
  customRoutes = (app) => {},
  useRoutes = true,
  useParsers = true,
) {
  var app = express();
  (<any>app).basePath = '/v1';

  if (useParsers) {
    app.use(bodyParser.json());
    app.use(bodyParser.json({ type: 'application/*+json' }));
    app.use(bodyParser.json({ type: 'application/*+json*' }));

    app.use(bodyParser.text());
    app.use(bodyParser.text({ type: 'text/html' }));

    app.use(express.urlencoded({ extended: false }));
  }
  app.use(logger('dev'));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  app.use(OpenApiValidator.middleware(opts));

  // Add custom error handler
  app.use((err, req, res, next) => {
    if (err instanceof JsonResponse) {
      res.status(err.status);
      res.json(JSON.parse(JSON.stringify(err, null, 2)));
    } else {
      next(err);
    }
  });  

  if (useRoutes) {
    // register common routes
    routes(app);
  }

  // register custom routes
  customRoutes(app);

  if (useRoutes) {
    // Register error handler
    app.use((err, req, res, next) => {
      // console.error(err);
      res.status(err.status ?? 500).json({
        message: err.message,
        errors: err.errors,
      });
    });
  }

  const server = await startServer(app, port);
  const shutDown = () => {
    console.log('Received kill signal, shutting down gracefully');
    server.close(() => {
      console.log('Closed out remaining connections');
      process.exit(0);
    });

    setTimeout(() => {
      console.error(
        'Could not close connections in time, forcefully shutting down',
      );
      process.exit(1);
    }, 10000);
  };
  process.on('SIGTERM', shutDown);
  process.on('SIGINT', shutDown);

  // export default app;
  return app;
}
