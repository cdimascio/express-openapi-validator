var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');
var http = require('http');
var OpenApiValidator = require('express-openapi-validator').OpenApiValidator;
var app = express();

app.use(bodyParser.json());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

new OpenApiValidator({
  apiSpecPath: '../openapi.yaml',
}).install(app);

app.get('/v1/pets', function(req, res, next) {
  res.json([{ id: 1, name: 'max' }, { id: 2, name: 'mini' }]);
});

app.post('/v1/pets', function(req, res, next) {
  res.json({
    name: 'sparky',
  });
});

app.get('/v1/pets/:id', function(req, res, next) {
  res.json({
    id: req.params.id,
    name: 'sparky',
  });
});

app.get('/v1/pets/:id/attributes', function(req, res, next) {
  res.json({
    id: req.params.id,
    name: 'sparky',
  });
});

// Register error handler!
app.use((err, req, res, next) => {
  // format error
  res.status(err.status).json({
    errors: err.errors,
  });
});

// Register error handler!
app.use((err, req, res, next) => {
  // format error
  res.status(err.status).json({
    errors: err.errors,
  });
});

var server = http.createServer(app);
server.listen(3000);
console.log('Listening on port 3000');

module.exports = app;
