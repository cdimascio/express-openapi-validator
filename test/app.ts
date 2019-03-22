var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');

const { OpenApiMiddleware } = require('../');
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
  // validateApiDoc: true, // the default
  // enableObjectCoercion: true, // the default
  errorTransformer: (a, b) => {
    console.log('---error trans---', a, b);

    return a;
  },
}).install(app);

routes(app);

startServer(app, 3000);

export default app;
