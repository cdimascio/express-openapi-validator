import * as express from 'express';
import * as path from 'path';
import * as cookieParser from 'cookie-parser';
import * as logger from 'morgan';
import { Server } from 'http';

import * as OpenApiValidator  from '../../src';
import { startServer, routes } from './app.common';
import { OpenApiValidatorOpts } from '../../src/framework/types';

interface AppWithServer extends express.Application {
  server: Server;
  basePath: string;
}

export async function createApp(
  opts?: OpenApiValidatorOpts,
  port = 3000,
  customRoutes = (app: AppWithServer) => {},
  useRoutes = true,
  useParsers = true,
): Promise<AppWithServer> {
  const app = express() as unknown as AppWithServer;
  app.basePath = '/v1';

  if (useParsers) {
    app.use(express.json());
    app.use(express.json({ type: 'application/*+json' }));
    app.use(express.json({ type: 'application/*+json*' }));

    app.use(express.text());
    app.use(express.text({ type: 'text/html' }));

    app.use(express.urlencoded({ extended: false }));
  }
  app.use(logger('dev'));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  // Only use the middleware if apiSpec is provided
  if (opts && opts.apiSpec) {
    app.use(OpenApiValidator.middleware(opts));
  }

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
