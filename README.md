# express-middleware-openapi

![](https://travis-ci.org/cdimascio/express-middleware-openapi.svg?branch=master) [![Coverage Status](https://coveralls.io/repos/github/cdimascio/express-middleware-openapi/badge.svg?branch=master)](https://coveralls.io/github/cdimascio/express-middleware-openapi?branch=master) ![](https://img.shields.io/badge/license-MIT-blue.svg)

ExpressJs middleware that automatically validates API requests using an OpenAPI 3.0 specification,

Try on the [sample project](https://github.com/cdimascio/express-middleware-openapi-example)

## Install

Try this pre-release alpha version:

```shell
npm i express-middleware-openapi
```

## Usage

see [app.js](example/app.js) for a complete example.

### Basic

```javascript
new OpenApiMiddleware({
  apiSpecPath: './openapi.yaml',
}).install(app);
```

(see complete [example](#example))

### Advanced

```javascript
new OpenApiMiddleware({
  apiSpecPath: './openapi.yaml',
  // default is true
  // validates the openapi spec, throws if invalid
  validateApiDoc: true,
  // default is true
  // attempts to coerce a value's type to that defined in the openapi spec
  enableObjectCoercion: true,
  // default is undefined
  // provide a custom error transform to customize how errors are shaped
  errorTransform: validationResult => ({
    // the http status code to return
    statusCode: validationResult.status,
    // the custom error object to return
    error: {
      code: validationResult.status,
      message: validationResult.errors[0].message,
    },
  }),
}).install(app);
```

## Example

Try the complete example below:

```javascript
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');
var http = require('http');
var OpenApiMiddleware = require('express-middleware-openapi').OpenApiMiddleware;
var app = express();

app.use(bodyParser.json());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

new OpenApiMiddleware({
  apiSpecPath: './openapi.yaml',
  enableObjectCoercion: true, // will be default
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

var server = http.createServer(app);
server.listen(3000);
console.log('Listening on port 3000');

module.exports = app;
```

## [Example Project](https://github.com/cdimascio/express-middleware-openapi-example) 

A full working example lives [here](https://github.com/cdimascio/express-middleware-openapi-example)
