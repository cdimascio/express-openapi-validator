# express-openapi-validator

[![](https://travis-ci.com/cdimascio/express-openapi-validator.svg?branch=master)](#) [![](https://img.shields.io/npm/v/express-openapi-validator.svg)](https://www.npmjs.com/package/express-openapi-validator) [![Coverage Status](https://coveralls.io/repos/github/cdimascio/express-openapi-validator/badge.svg)](https://coveralls.io/github/cdimascio/express-openapi-validator) [![](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

An OpenApi validator for ExpressJS that automatically validates API requests using an OpenAPI 3 specification.

<p align="center">
<img src="https://raw.githubusercontent.com/cdimascio/express-openapi-validator/master/assets/express-openapi-validator.png" width="500">
</p>

[express-openapi-validator](https://github.com/cdimascio/express-openapi-validator) is unopinionated and does not impose any  coding convention or project structure. Simply, install the validator onto your express app, point it to your OpenAPI 3 specification, then define and implement routes the way you prefer. See an [example](#example-express-api-server).

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

## Example Express API Server

Try the complete example below:

```javascript
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');
var http = require('http');
var app = express();

// 1. Import the express-openapi-validator library
var OpenApiValidator = require('express-openapi-validator').OpenApiValidator;

app.use(bodyParser.json());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 2. (optionally) Serve the OpenAPI spec
const spec = path.join(__dirname, 'openapi.yaml');
app.use('/spec', express.static(spec));

// 3. Install the OpenApiValidator onto your express app
new OpenApiValidator({
  apiSpecPath: './openapi.yaml',
}).install(app);

// 4. Define routes using Express
app.get('/v1/pets', function(req, res, next) {
  res.json([{ id: 1, name: 'max' }, { id: 2, name: 'mini' }]);
});

app.post('/v1/pets', function(req, res, next) {
  res.json({ name: 'sparky' });
});

app.get('/v1/pets/:id', function(req, res, next) {
  res.json({ id: req.params.id, name: 'sparky' });
});

// 5. Create an Express error handler
app.use((err, req, res, next) => {
  // 6. Customize errors
  res.status(err.status).json({
    errors: err.errors,
  });
});
```

## [Example Express API Server](https://github.com/cdimascio/express-openapi-validator-example) (clone it)

A fully working example lives [here](https://github.com/cdimascio/express-openapi-validator-example)

## Example validation responses

#### Validate a query parameter with a value constraint

`/pets/:id` should be of type integer, express-openapi-validator returns:

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

`/pets?limit=?` should be of type integer with a value greater than 5. It should also require an additional query paramter, `test`, express-openapi-validator returns:

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

`POST /pets` is defined to only accept media type application/json, express-openapi-validator returns:

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

`POST /pets` request body is required to contain the `name` properly, express-openapi-validator returns:

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

## License

[MIT](LICENSE)
