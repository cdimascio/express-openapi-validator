# express-openapi-validator

![](https://travis-ci.com/cdimascio/express-middleware-openapi.svg?branch=master) ![](https://img.shields.io/npm/v/express-openapi-validator.svg) [![Coverage Status](https://coveralls.io/repos/github/cdimascio/express-middleware-openapi/badge.svg?branch=master)](https://coveralls.io/github/cdimascio/express-middleware-openapi?branch=master) ![](https://img.shields.io/badge/license-MIT-blue.svg)

An OpenApi validator for ExpressJS that automatically validates API requests using an OpenAPI 3.0 specification.

<p align="center">
<img src="https://raw.githubusercontent.com/cdimascio/express-openapi-validator/master/assets/express-openapi-validator.png" width="500">
</p>
## Install

```shell
npm i express-openapi-validator
```

## Usage

Install the openapi validator

```javascript
new OpenApiValidator({
  apiSpecPath: './openapi.yaml',
}).install(app);
```

Then, register an error handler to customize errors

```javascript
app.use((err, req, res, next) => {
  // format error
  res.status(err.status).json({
    errors: err.errors,
  });
});
```

(see complete [example](#example))

## Example API Server

Try the complete example below:

```javascript
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
  apiSpecPath: './openapi.yaml',
}).install(app);

app.get('/v1/pets', function(req, res, next) {
  res.json([{ id: 1, name: 'max' }, { id: 2, name: 'mini' }]);
});

app.post('/v1/pets', function(req, res, next) {
  res.json({ name: 'sparky' });
});

app.get('/v1/pets/:id', function(req, res, next) {
  res.json({ id: req.params.id, name: 'sparky' });
});

// Register error handler
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
```

## [Example API Server (Full Project Source)](https://github.com/cdimascio/express-middleware-openapi-example)

A fully working example lives [here](https://github.com/cdimascio/express-middleware-openapi-example)

## Example validation responses

#### Validate a query parameter with a value constraint

```shell
curl http://localhost:3000/v1/pets/as |jq
{
  "errors": [
    {
      "path": "id",
      "errorCode": "type.openapi.validation",
      "message": "should be integer",
      "location": "path"
    }
  ]
}
```

#### Validate a query parameter with a range constraint

```shell
curl http://localhost:3000/v1/pets?limit=1 |jq
{
  "errors": [
    {
      "path": "limit",
      "errorCode": "minimum.openapi.validation",
      "message": "should be >= 5",
      "location": "query"
    },
    {
      "path": "test",
      "errorCode": "required.openapi.validation",
      "message": "should have required property 'test'",
      "location": "query"
    }
  ]
}
```

#### Validate the query parameter's value type

```shell
curl --request POST \
  --url http://localhost:3000/v1/pets \
  --header 'content-type: application/xml' \
  --data '{
        "name": "test"
}' |jq
{
  "errors": [
    {
      "message": "Unsupported Content-Type application/xml"
    }
  ]
}
```

#### Validate a POST body to ensure required parameters are present

```shell
λ  my-test curl --request POST \
  --url http://localhost:3000/v1/pets \
  --header 'content-type: application/json' \
  --data '{
}'|jq
  "errors": [
    {
      "path": "name",
      "errorCode": "required.openapi.validation",
      "message": "should have required property 'name'",
      "location": "body"
    }
  ]
}
```

#### ...and much more. Try it out!
