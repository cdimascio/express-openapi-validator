var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');

const { OpenApiMiddleware } = require('../src');
const { startServer, routes } = require('./app.common');

var app = express();

app.use(bodyParser.json());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

new OpenApiMiddleware({
  apiSpecPath: './openapi.yaml',
  validateApiDoc: true, // is the default
  enableObjectCoercion: true, // should be default
  errorTransform: v => {
    return {
      statusCode: v.status,
      error: {
        code: v.status,
        message: v.errors[0].message,
      },
    };
  },
}).install(app);

routes(app);

startServer(app, 3001);

export default app;
