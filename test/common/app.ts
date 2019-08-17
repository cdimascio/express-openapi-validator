import * as express from 'express';
import * as path from 'path';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import * as logger from 'morgan';

import { OpenApiValidator } from '../../src';
import { startServer, routes } from './app.common';

export async function createApp(opts?: any, port: number = 3000) {
  var app = express();

  app.use(bodyParser.json());
  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  new OpenApiValidator(opts).install(app);

  routes(app);

  // Register error handler
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      errors: err.errors,
    });
  });

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
