import * as express from 'express';
import * as path from 'path';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import * as logger from 'morgan';

import { OpenApiValidator } from '../src';
import { startServer, routes } from './app.common';

var app = express();

app.use(bodyParser.json());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

new OpenApiValidator({
  apiSpecPath: './openapi.yaml',
}).install(app);

routes(app);

// Register error handler
app.use((err, req, res, next) => {
  res.status(err.status).json({
    errors: err.errors,
  });
});

startServer(app, 3000);

export default app;
