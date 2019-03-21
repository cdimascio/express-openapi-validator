# express-middleware-openapi

![](https://travis-ci.org/cdimascio/express-middleware-openapi.svg?branch=master) ![](https://img.shields.io/badge/license-MIT-blue.svg)

ExpressJs middleware that automatically validates API requests using an OpenAPI 3.0 specification,

<p align="center">
  <br>
🚧👷<i>under construction</i> 🚧👷
</p>

## Install

Try this pre-release alpha version:

```shell
npm i express-middleware-openapi
```

## Usage

see [app.ts](test/app.ts) for an example.

```javascript
new OpenApiMiddleware({
  apiSpecPath: './openapi.yaml',
  validateApiDoc: true, // default
  enableObjectCoercion: true, // should be default
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
  validateApiDoc: true, // is the default
  enableObjectCoercion: true, // should be default
  errorTransformer: (a, b) => {
    console.log('---error trans---', a, b);

    return a;
  },
}).install(app);

app.get('/v1/pets', function(req, res, next) {
  res.json([
    { id: 1, name: 'max' },
    { id: 2, name: 'mini' },
  ]);
});

app.post('/v1/pets', function(req, res, next) {
  res.json({
    name: 'sparky',
  });
});

app.get('/v1/pets/:id', function(req, res, next) {
  res.json({
    id: req.params.id,
    name: 'sparky'
  });
});

var server = http.createServer(app);
server.listen(3000);
console.log('Listening on port 3000');

module.exports = app;
```
