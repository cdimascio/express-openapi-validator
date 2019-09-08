# express-openapi-validator

[![](https://travis-ci.org/cdimascio/express-openapi-validator.svg?branch=master)](#) [![](https://img.shields.io/npm/v/express-openapi-validator.svg)](https://www.npmjs.com/package/express-openapi-validator) ![](https://img.shields.io/npm/dm/express-openapi-validator.svg) [![Coverage Status](https://coveralls.io/repos/github/cdimascio/express-openapi-validator/badge.svg)](https://coveralls.io/github/cdimascio/express-openapi-validator) [![All Contributors](https://img.shields.io/badge/all_contributors-3-orange.svg?style=flat-square)](#contributors) [![](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

An OpenApi validator for ExpressJS that automatically validates API requests using an OpenAPI 3 specification.

<p align="center">
<img src="https://raw.githubusercontent.com/cdimascio/express-openapi-validator/master/assets/express-openapi-validator.png" width="500">
</p>

[express-openapi-validator](https://github.com/cdimascio/express-openapi-validator) is unopinionated and does not impose any coding convention or project structure. Simply, install the validator onto your express app, point it to your OpenAPI 3 specification, then define and implement routes the way you prefer. See an [example](#example-express-api-server).

[![GitHub stars](https://img.shields.io/github/stars/cdimascio/express-openapi-validator.svg?style=social&label=Star&maxAge=2592000)](https://GitHub.com/cdimascio/express-openapi-validator/stargazers/) [![Twitter URL](https://img.shields.io/twitter/url/https/github.com/cdimascio/express-openapi-validator.svg?style=social)](https://twitter.com/intent/tweet?text=Check%20out%20express-openapi-validator%20by%20%40CarmineDiMascio%20https%3A%2F%2Fgithub.com%2Fcdimascio%2Fexpress-openapi-validator%20%F0%9F%91%8D)

## Install

```shell
npm i express-openapi-validator
```

## Usage

Install the openapi validator

```javascript
new OpenApiValidator({
  apiSpec: './test/resources/openapi.yaml',
}).install(app);
```

Then, register an error handler to customize errors

```javascript
app.use((err, req, res, next) => {
  // format error
  res.status(err.status).json({
    message: err.message,
    errors: err.errors,
  });
});
```

#### Alternatively...

The `apiSpec` option may be specified as the spec object itself, rather than a path e.g.

```javascript
const apiSpec = {
  openapi: "3.0.1",
  info: {...},
  servers: [...],
  paths: {...},
  components: {
    responses: {...},
    schemas: {...}
  }
}

new OpenApiValidator({ apiSpec }).install(app);
```

## Options

```javascript
new OpenApiValidator(options).install(app);
```

**`apiSpec:`** a string value specifying the path to the OpenAPI 3.0.x spec or a JSON object representing an OpenAPI spec.

**`coerceTypes:`** change data type of data to match type keyword. See the example in Coercing data types and coercion rules. Option values:

- false (default) - no type coercion.
- true - coerce scalar data types.
- "array" - in addition to coercions between scalar types, coerce scalar data to an array with one element and vice versa (as required by the schema).

**`multerOpts:`** the [multer opts](https://github.com/expressjs/multer) to passthrough to multer


## Example Express API Server

Try the complete example below:
(_it includes file upload as well!_)

```javascript
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const logger = require('morgan');
const http = require('http');
const app = express();

// 1. Import the express-openapi-validator library
const OpenApiValidator = require('express-openapi-validator').OpenApiValidator;

app.use(bodyParser.json());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 2. (optionally) Serve the OpenAPI spec
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

// 4. Define route(s) to upload file(s)
app.post('/v1/pets/:id/photos', function(req, res, next) {
  // files are found in req.files
  // non-file multipart params can be found as such: req.body['my-param']

  res.json({
    files_metadata: req.files.map(f => ({
      originalname: f.originalname,
      encoding: f.encoding,
      mimetype: f.mimetype,
      // Buffer of file conents
      buffer: f.buffer,
    })),
  });
});

// 5. Create an Express error handler
app.use((err, req, res, next) => {
  // 6. Customize errors
  res.status(err.status).json({
    message: err.message,
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
curl -s http://localhost:3000/v1/pets/as |jq
{
  "errors": [
    {
      "path": ".params.id",
      "message": "should be integer",
      "errorCode": "type.openapi.validation"
    }
  ]
}
```

#### Validate a query parameter with a range constraint

`/pets?limit=?` should be of type integer with a value greater than 5. It should also require an additional query paramter, `test`, express-openapi-validator returns:

```shell
curl -s http://localhost:3000/v1/pets?limit=1 |jq
{
  "errors": [
    {
      "path": ".query.limit",
      "message": "should be >= 5",
      "errorCode": "minimum.openapi.validation"
    },
    {
      "path": ".query.test",
      "message": "should have required property 'test'",
      "errorCode": "required.openapi.validation"
    }
  ]
}
```

#### Validate the query parameter's value type

`POST /pets` is defined to only accept media type application/json, express-openapi-validator returns:

```shell
curl -s --request POST \
  --url http://localhost:3000/v1/pets \
  --header 'content-type: application/xml' \
  --data '{
        "name": "test"
}' |jq
{
  "errors": [
    {
      "path": "/v1/pets",
      "message": "unsupported media type application/xml"
    }
  ]
}
```

#### Validate a POST body to ensure required parameters are present

`POST /pets` request body is required to contain the `name` properly, express-openapi-validator returns:

```shell
curl -s --request POST \
  --url http://localhost:3000/v1/pets \
  --header 'content-type: application/json' \
  --data '{}' |jq
{
  "errors": [
    {
      "path": ".query.name",
      "message": "should have required property 'name'",
      "errorCode": "required.openapi.validation"
    }
  ]
}
```

#### Validate a POST multipart/form-data request

```shell
curl -s -XPOST http://localhost:3000/v1/pets/10/photos -F fileZZ=@app.js | jq
{
  "errors": [
    {
      "path": "file",
      "message": "should have required property 'file'",
      "errorCode": "required.openapi.validation"
    }
  ]
}
```

#### ...and much more. Try it out!

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->
<table>
  <tr>
    <td align="center"><a href="http://www.twitter.com/carminedimascio"><img src="https://avatars1.githubusercontent.com/u/4706618?v=4" width="100px;" alt="Carmine DiMascio"/><br /><sub><b>Carmine DiMascio</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=cdimascio" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=cdimascio" title="Tests">⚠️</a> <a href="#infra-cdimascio" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    <td align="center"><a href="http://litr.cc/"><img src="https://avatars2.githubusercontent.com/u/4166193?v=4" width="100px;" alt="Sheldhur Mornor"/><br /><sub><b>Sheldhur Mornor</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=sheldhur" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=sheldhur" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/trebler"><img src="https://avatars2.githubusercontent.com/u/5610569?v=4" width="100px;" alt="Andrey Trebler"/><br /><sub><b>Andrey Trebler</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=trebler" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=trebler" title="Tests">⚠️</a></td>
  </tr>
</table>

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## License

[MIT](LICENSE)
