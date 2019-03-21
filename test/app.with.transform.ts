var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');
const http = require('http');
const { OpenApiMiddleware } = require('../');

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

app.get('/v1/pets', function(req, res, next) {
  console.log('at /v1/pets here');
  res.json({
    test: 'hi',
  });
});

app.post('/v1/pets', function(req, res, next) {
  res.json({
    test: 'hi',
  });
});

app.get('/v1/vets/:id', function(req, res, next) {
  console.log('---- get /pets/:id', req.params);
  // here
  res.json({
    id: req.params.id,
  });
});

app.get('/v1/pets/:id', function(req, res, next) {
  console.log('---- get /pets/:id', req.params);
  // here
  res.json({
    id: req.params.id,
  });
});

export const server = http.createServer(app);
const port = 3001;
server.listen(port);
console.log(`Listening on port ${port}`);

export default app;
