# 🦋 express-openapi-validator

[![](https://travis-ci.org/cdimascio/express-openapi-validator.svg?branch=master)](#) [![](https://img.shields.io/npm/v/express-openapi-validator.svg)](https://www.npmjs.com/package/express-openapi-validator) [![](https://img.shields.io/npm/dm/express-openapi-validator?color=blue)](https://www.npmjs.com/package/express-openapi-validator) [![All Contributors](https://img.shields.io/badge/all_contributors-54-darkcyan.svg?style=flat)](#contributors) [![Coverage Status](https://coveralls.io/repos/github/cdimascio/express-openapi-validator/badge.svg?branch=master)](https://coveralls.io/github/cdimascio/express-openapi-validator?branch=master) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/1570a06f609345ddb237114bbd6ceed7)](https://www.codacy.com/manual/cdimascio/express-openapi-validator?utm_source=github.com&utm_medium=referral&utm_content=cdimascio/express-openapi-validator&utm_campaign=Badge_Grade) [![](https://img.shields.io/gitter/room/cdimascio-oss/community?color=%23eb205a)](https://gitter.im/cdimascio-oss/community) [![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/cdimascio/express-openapi-validator) [![](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

**An OpenApi validator for ExpressJS** that automatically validates **API** _**requests**_ and _**responses**_ using an **OpenAPI 3** specification.

<p align="center">
<img src="https://raw.githubusercontent.com/cdimascio/express-openapi-validator/master/assets/express-openapi-validator-logo-v2.png" width="600">
</p>

[🦋express-openapi-validator](https://github.com/cdimascio/express-openapi-validator) is an unopinionated library that integrates with new and existing API applications. express-openapi-validator lets you write code the way you want; it does not impose any coding convention or project layout. Simply, install the validator onto your express app, point it to your OpenAPI 3 specification, then define and implement routes the way you prefer. See an [example](#example-express-api-server).

**Features:**

- ✔️ request validation
- ✔️ response validation (json only)
- 👮 security validation / custom security functions
- 👽 3rd party / custom formats / custom data serialization-deserialization
- 🧵 optionally auto-map OpenAPI endpoints to Express handler functions
- ✂️ **\$ref** support; split specs over multiple files
- 🎈 file upload

[![GitHub stars](https://img.shields.io/github/stars/cdimascio/express-openapi-validator.svg?style=social&label=Star&maxAge=2592000)](https://GitHub.com/cdimascio/express-openapi-validator/stargazers/) [![Twitter URL](https://img.shields.io/twitter/url/https/github.com/cdimascio/express-openapi-validator.svg?style=social)](https://twitter.com/intent/tweet?text=Check%20out%20express-openapi-validator%20by%20%40CarmineDiMascio%20https%3A%2F%2Fgithub.com%2Fcdimascio%2Fexpress-openapi-validator%20%F0%9F%91%8D)

[NestJS](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/9-nestjs)
[Koa](https://github.com/cdimascio/express-openapi-validator/tree/lerna-fastify/packages/koa-openapi-validator) and [Fastify](https://github.com/cdimascio/express-openapi-validator/tree/lerna-fastify/packages/fastify-openapi-validator) now available! 🚀

## Install

```shell
npm install express-openapi-validator
```

## Usage

1. Require/import the openapi validator

```javascript
const OpenApiValidator = require('express-openapi-validator');
```

or

```javascript
import * as OpenApiValidator from 'express-openapi-validator';
```

2. Install the middleware

```javascript
app.use(
  OpenApiValidator.middleware({
    apiSpec: './openapi.yaml',
    validateRequests: true, // (default)
    validateResponses: true, // false by default
  }),
);
```

3. Register an error handler

```javascript
app.use((err, req, res, next) => {
  // format error
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
  });
});
```

_**Important:** Ensure express is configured with all relevant body parsers. Body parser middleware functions must be specified prior to any validated routes. See an [example](#example-express-api-server)_.

## Upgrading from 3.x

In v4.x.x, the validator is installed as standard connect middleware using `app.use(...) and/or router.use(...)` ([example](https://github.com/cdimascio/express-openapi-validator/blob/v4/README.md#Example-Express-API-Server)). This differs from the v3.x.x the installation which required the `install` method(s). The `install` methods no longer exist in v4.

## Usage (options)

See [Advanced Usage](#Advanced-Usage) options to:

- inline api specs as JSON.
- configure request/response validation options
- customize authentication with security validation `handlers`.
- use OpenAPI 3.0.x 3rd party and custom formats.
- tweak the file upload configuration.
- ignore routes
- and more...

## [Example Express API Server](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/1-standard)

The following demonstrates how to use express-openapi-validator to auto validate requests and responses. It also includes file upload!

See the complete [source code](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/1-standard) and [OpenAPI spec](https://github.com/cdimascio/express-openapi-validator/blob/master/examples/1-standard/api.yaml) for the example below:

```javascript
const express = require('express');
const path = require('path');
const http = require('http');
const app = express();

// 1. Import the express-openapi-validator library
const OpenApiValidator = require('express-openapi-validator');

// 2. Set up body parsers for the request body types you expect
//    Must be specified prior to endpoints in 5.
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: false }));

// 3. (optionally) Serve the OpenAPI spec
const spec = path.join(__dirname, 'api.yaml');
app.use('/spec', express.static(spec));

// 4. Install the OpenApiValidator onto your express app
app.use(
  OpenApiValidator.middleware({
    apiSpec: './api.yaml',
    validateResponses: true, // <-- to validate responses
  }),
);

// 5. Define routes using Express
app.get('/v1/pets', function (req, res, next) {
  res.json([
    { id: 1, type: 'cat', name: 'max' },
    { id: 2, type: 'cat', name: 'mini' },
  ]);
});

app.post('/v1/pets', function (req, res, next) {
  res.json({ name: 'sparky', type: 'dog' });
});

app.get('/v1/pets/:id', function (req, res, next) {
  res.json({ id: req.params.id, type: 'dog', name: 'sparky' });
});

// 5a. Define route(s) to upload file(s)
app.post('/v1/pets/:id/photos', function (req, res, next) {
  // files are found in req.files
  // non-file multipart params can be found as such: req.body['my-param']
  res.json({
    files_metadata: req.files.map((f) => ({
      originalname: f.originalname,
      encoding: f.encoding,
      mimetype: f.mimetype,
      // Buffer of file conents
      buffer: f.buffer,
    })),
  });
});

// 6. Create an Express error handler
app.use((err, req, res, next) => {
  // 7. Customize errors
  console.error(err); // dump error to console for debug
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
  });
});

http.createServer(app).listen(3000);
```

## [Example Express API Server: with operationHandlers](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/3-eov-operations)

Don't want to manually map your OpenAPI endpoints to Express handler functions? express-openapi-validator can do it for you, automatically!

Use express-openapi-validator's OpenAPI `x-eov-operation-*` vendor extensions. See a full example with [source code](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/3-eov-operations) and an [OpenAPI spec](https://github.com/cdimascio/express-openapi-validator/blob/master/examples/3-eov-operations/api.yaml#L39)

**Here's the gist**

- First, specify the `operationHandlers` option to set the base directory that contains your operation handler files.

```javascript
app.use(
  OpenApiValidator.middleware({
    apiSpec,
    operationHandlers: path.join(__dirname),
  }),
);
```

- Next, use the `x-eov-operation-id` OpenAPI vendor extension or `operationId` to specify the id of operation handler to invoke.

```yaml
/ping:
  get:
    # operationId: ping
    x-eov-operation-id: ping
```

- Next, use the `x-eov-operation-handler` OpenAPI vendor extension to specify a path (relative to `operationHandlers`) to the module that contains the handler for this operation.

```yaml
/ping:
  get:
    x-eov-operation-id: ping
    x-eov-operation-handler: routes/ping # no .js or .ts extension
```

- Finally, create the express handler module e.g. `routes/ping.js`

```javascript
module.exports = {
  // the express handler implementation for ping
  ping: (req, res) => res.status(200).send('pong'),
};
```

**Note:** A file may contain _one_ or _many_ handlers.

Below are some code snippets:

**app.js**

```javascript
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const logger = require('morgan');
const http = require('http');
const OpenApiValidator = require('express-openapi-validator');

const port = 3000;
const app = express();
const apiSpec = path.join(__dirname, 'api.yaml');

// 1. Install bodyParsers for the request types your API will support
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());
app.use(bodyParser.json());

app.use(logger('dev'));

app.use('/spec', express.static(apiSpec));

//  2. Install the OpenApiValidator on your express app
app.use(
  OpenApiValidator.middleware({
    apiSpec,
    validateResponses: true, // default false
    // 3. Provide the base path to the operation handlers directory
    operationHandlers: path.join(__dirname), // default false
  }),
);

// 4. Woah sweet! With auto-wired operation handlers, I don't have to declare my routes!
//    See api.yaml for x-eov-* vendor extensions

// 5. Create a custom error handler
app.use((err, req, res, next) => {
  // format errors
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
  });
});

http.createServer(app).listen(port);
console.log(`Listening on port ${port}`);

module.exports = app;
```

**api.yaml**

```yaml
/ping:
  get:
    description: |
      ping then pong!
    # OpenAPI's operationId may be used to to specify the operation id
    operationId: ping
    # x-eov-operation-id may be used to specify the operation id
    # Used when operationId is omitted. Overrides operationId when both are specified
    x-eov-operation-id: ping
    # specifies the path to the operation handler.
    # the path is relative to the operationHandlers option
    # e.g. operations/base/path/routes/ping.js
    x-eov-operation-handler: routes/ping
    responses:
      '200':
        description: OK
        # ...
```

**ping.js**

```javascript
module.exports = {
  // ping must match operationId or x-eov-operation-id above
  // note that x-eov-operation-id overrides operationId
  ping: (req, res) => res.status(200).send('pong'),
};
```

## API Validation Response Examples

#### Validates a query parameter with a value constraint

```shell
curl -s http://localhost:3000/v1/pets/as |jq
{
  "message": "request.params.id should be integer",
  "errors": [
    {
      "path": ".params.id",
      "message": "should be integer",
      "errorCode": "type.openapi.validation"
    }
  ]
}
```

#### Validates a query parameter with a range constraint

```shell
 curl -s 'http://localhost:3000/v1/pets?limit=25' |jq
{
  "message": "request.query should have required property 'type', request.query.limit should be <= 20",
  "errors": [
    {
      "path": ".query.type",
      "message": "should have required property 'type'",
      "errorCode": "required.openapi.validation"
    },
    {
      "path": ".query.limit",
      "message": "should be <= 20",
      "errorCode": "maximum.openapi.validation"
    }
  ]
}
```

#### Validates securities e.g. API Key

```shell
 curl -s --request POST \
  --url http://localhost:3000/v1/pets \
  --data '{}' |jq
{
  "message": "'X-API-Key' header required",
  "errors": [
    {
      "path": "/v1/pets",
      "message": "'X-API-Key' header required"
    }
  ]
}
```

Providing the header passes OpenAPI validation.

**Note:** that your Express middleware or endpoint logic can then provide additional checks.

```shell
curl -XPOST http://localhost:3000/v1/pets \
  --header 'X-Api-Key: XXXXX' \
  --header 'content-type: application/json' \
  -d '{"name": "spot"}' | jq

{
  "id": 4,
  "name": "spot"
}
```

#### Validates content-type

```shell
curl -s --request POST \
  --url http://localhost:3000/v1/pets \
  --header 'content-type: application/xml' \
  --header 'x-api-key: XXXX' \
  --data '{
        "name": "test"
}' |jq
  "message": "unsupported media type application/xml",
  "errors": [
    {
      "path": "/v1/pets",
      "message": "unsupported media type application/xml"
    }
  ]
}
```

#### Validates a POST request body

```shell
curl -s --request POST \
  --url http://localhost:3000/v1/pets \
  --header 'content-type: application/json' \
  --header 'x-api-key: XXXX' \
  --data '{}'|jq
{
  "message": "request.body should have required property 'name'",
  "errors": [
    {
      "path": ".body.name",
      "message": "should have required property 'name'",
      "errorCode": "required.openapi.validation"
    }
  ]
}
```

#### File Upload (out of the box)

```shell
curl -XPOST http://localhost:3000/v1/pets/10/photos -F file=@app.js|jq
{
  "files_metadata": [
    {
      "originalname": "app.js",
      "encoding": "7bit",
      "mimetype": "application/octet-stream"
    }
  ]
}
```

#### Validates responses (optional)

Errors in response validation return `500`, not of `400`

`/v1/pets/99` will return a response that does not match the spec

```
 curl -s 'http://localhost:3000/v1/pets/99' |jq
{
  "message": ".response should have required property 'name', .response should have required property 'id'",
  "errors": [
    {
      "path": ".response.name",
      "message": "should have required property 'name'",
      "errorCode": "required.openapi.validation"
    },
    {
      "path": ".response.id",
      "message": "should have required property 'id'",
      "errorCode": "required.openapi.validation"
    }
  ]
}
```

### _...and much more. Try it out!_

### Response status codes

express-openapi-validator returns the following error codes depending on the situation.

#### Request validation (validateRequests=true)

| status                     | when                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `400` (bad request)        | a validation error is encountered                                                                 |
| `401` (unauthorized)       | a security / authentication errors is encountered e.g. missing api-key, Authorization header, etc |
| `404` (not found)          | a path is not found i.e. not declared in the API spec                                             |
| `405` (method not allowed) | a path is declared in the API spec, but a no schema is provided for the method                    |

#### Response validation (validateResponses=true)

| status                        | when                                      |
| ----------------------------- | ----------------------------------------- |
| `500` (internal server error) | any error is encountered by the validator |

## Advanced Usage

### OpenApiValidator Middleware Options

express-openapi validator provides a good deal of flexibility via its options.

Options are provided via the options object. Options take the following form:

```javascript
OpenApiValidator.middleware({
  apiSpec: './openapi.yaml',
  validateRequests: true,
  validateResponses: true,
  validateApiSpec: true,
  validateSecurity: {
    handlers: {
      ApiKeyAuth: (req, scopes, schema) => {
        throw { status: 401, message: 'sorry' }
      }
    }
  },
  validateFormats: 'fast',
  formats: [{
    name: 'my-custom-format',
    type: 'string' | 'number',
    validate: (value: any) => boolean,
  }],
  unknownFormats: ['phone-number', 'uuid'],
  serDes: [{
    OpenApiValidator.serdes.dateTime,
    OpenApiValidator.serdes.date,
    {
      format: 'mongo-objectid',
      deserialize: (s) => new ObjectID(s),
      serialize: (o) => o.toString(),
    },
  }],
  operationHandlers: false | 'operations/base/path' | { ... },
  ignorePaths: /.*\/pets$/,
  fileUploader: { ... } | true | false,
  $refParser: {
    mode: 'bundle'
  },
});
```

### ▪️ apiSpec (required)

Specifies the path to an OpenAPI 3 specification or a JSON object representing the OpenAPI 3 specification

```javascript
apiSpec: './path/to/my-openapi-spec.yaml';
```

or

```javascript
  apiSpec: {
  openapi: '3.0.1',
  info: {...},
  servers: [...],
  paths: {...},
  components: {
    responses: {...},
    schemas: {...}
  }
}
```

### ▪️ validateRequests (optional)

Determines whether the validator should validate requests.

- `true` (**default**) - validate requests.
- `false` - do not validate requests.
- `{ ... }` - validate requests with options

  **allowUnknownQueryParameters:**

  - `true` - enables unknown/undeclared query parameters to pass validation
  - `false` - (**default**) fail validation if an unknown query parameter is present

  For example:

  ```javascript
  validateRequests: {
    allowUnknownQueryParameters: true;
  }
  ```

  `allowUnknownQueryParameters` is set for the entire validator. It can be overwritten per-operation using
  a custom property `x-allow-unknown-query-parameters`.

  For example to allow unknown query parameters on ONLY a single endpoint:

  ```yaml
  paths:
    /allow_unknown:
      get:
        x-allow-unknown-query-parameters: true
        parameters:
          - name: value
            in: query
            schema:
              type: string
        responses:
          200:
            description: success
  ```

  **coerceTypes:**

  Determines whether the validator will coerce the request body. Request query and path params, headers, cookies are coerced by default and this setting does not affect that.

  Options:

  - `true` - coerce scalar data types.
  - `false` - (**default**) do not coerce types. (more strict, safer)
  - `"array"` - in addition to coercions between scalar types, coerce scalar data to an array with one element and vice versa (as required by the schema).

  For example:

  ```javascript
  validateRequests: {
    coerceTypes: true;
  }
  ```

  **removeAdditional:**

  Determines whether to keep or remove additional properties in request body or to fail validation if schema has `additionalProperties` set to `false`. For further details, refer to [AJV documentation](https://ajv.js.org/docs/validation.html#removing-additional-properties)

  - `false` (**default**) - not to remove additional properties
  - `"all"` - all additional properties are removed, regardless of additionalProperties keyword in schema (and no validation is made for them).
  - `true` - only additional properties with additionalProperties keyword equal to false are removed.
  - `"failing"` - additional properties that fail request schema validation will be removed (where additionalProperties keyword is false or schema).

  For example:

  ```javascript
  validateRequests: {
    removeAdditional: true;
  }
  ```

### ▪️ validateResponses (optional)

Determines whether the validator should validate responses. Also accepts response validation options.

- `true` - validate responses in 'strict' mode i.e. responses MUST match the schema.
- `false` (**default**) - do not validate responses
- `{ ... }` - validate responses with options

  **removeAdditional:**

  - `"failing"` - additional properties that fail schema validation are automatically removed from the response.

  **coerceTypes:**

  - `true` - coerce scalar data types.
  - `false` - (**default**) do not coerce types. (almost always the desired behavior)
  - `"array"` - in addition to coercions between scalar types, coerce scalar data to an array with one element and vice versa (as required by the schema).

  For example:

  ```javascript
  validateResponses: {
    removeAdditional: 'failing';
  }
  ```

  **onError:**

  A function that will be invoked on response validation error, instead of the default handling. Useful if you want to log an error or emit a metric, but don't want to actually fail the request. Receives the validation error, the offending response body, and the express request object.

  For example:

  ```
  validateResponses: {
    onError: (error, body, req) => {
      console.log(`Response body fails validation: `, error);
      console.log(`Emitted from:`, req.originalUrl);
      console.debug(body);
    }
  }
  ```

### ▪️ validateSecurity (optional)

Determines whether the validator should validate securities e.g. apikey, basic, oauth2, openid, etc

- `true` (**default**) - validate security
- `false` - do not validate security
- `{ ... }` - validate security with `handlers`. See [Security handlers](#security-handlers) doc.

  **handlers:**

  For example:

  ```javascript
  validateSecurity: {
    handlers: {
      ApiKeyAuth: function(req, scopes, schema) {
        console.log('apikey handler throws custom error', scopes, schema);
        throw Error('my message');
      },
    }
  }
  ```

### ▪️ validateApiSpec (optional)

Determines whether the validator should validate the OpenAPI specification. Useful if you are certain that the api spec is syntactically correct and want to bypass this check.

*Warning:* Be certain your spec is valid. And be sure you know what you're doing! express-openapi-validator _*expects*_ a valid spec. If incorrect, the validator will behave erratically and/or throw Javascript errors.

- `true` (**default**) - validate the OpenAPI specification.
- `false` - do not validate the OpenAPI specification.

### ▪️ formats (optional)

Defines a list of custom formats.

- `[{ ... }]` - array of custom format objects. Each object must have the following properties:
  - name: string (required) - the format name
  - validate: (v: any) => boolean (required) - the validation function
  - type: 'string' | 'number' (optional) - the format's type

e.g.

```javascript
formats: [
  {
    name: 'my-three-digit-format',
    type: 'number',
    // validate returns true the number has 3 digits, false otherwise
    validate: (v) => /^\d{3}$/.test(v.toString()),
  },
  {
    name: 'my-three-letter-format',
    type: 'string',
    // validate returns true the string has 3 letters, false otherwise
    validate: (v) => /^[A-Za-z]{3}$/.test(v),
  },
];
```

Then use it in a spec e.g.

```yaml
my_property:
  type: string
  format: my-three-letter-format'
```

### ▪️ validateFormats (optional)

Specifies the strictness of validation of string formats.

- `"fast"` (**default**) - only validate syntax, but not semantics. E.g. `2010-13-30T23:12:35Z` will pass validation even though it contains month 13.
- `"full"` - validate both syntax and semantics. Illegal dates will not pass.
- `false` - do not validate formats at all.

### ▪️ unknownFormats (optional)

Defines how the validator should behave if an unknown or custom format is encountered.

- `true` **(default)** - When an unknown format is encountered, the validator will report a 400 error.
- `[string]` **_(recommended for unknown formats)_** - An array of unknown format names that will be ignored by the validator. This option can be used to allow usage of third party schemas with format(s), but still fail if another unknown format is used.
  e.g.

  ```javascript
  unknownFormats: ['phone-number', 'uuid'];
  ```

- `"ignore"` - to log warning during schema compilation and always pass validation. This option is not recommended, as it allows to mistype format name and it won't be validated without any error message.

### ▪️ serDes (optional)

Defines custom serialization and deserialization behavior for schemas of type `string` that declare a `format`. By default, `Date` objects are serialized as `string` when a schema's `type` is `string` and `format` is `date` or `date-time`.

e.g.

```javascript
// If `serDes` is not specified, the following behavior is default
serDes: [{
  OpenApiValidator.serdes.dateTime.serializer,
  OpenApiValidator.serdes.date.serializer,
}],
```

To create custom serializers and/or deserializers, define:

- `format` (required) - a custom 'unknown' format that triggers the serializer and/or deserializer
- `deserialize` (optional) - upon receiving a request, transform a string property to an object. Deserialization occurs _after_ request schema validation.
- `serialize` (optional) - before sending a response, transform an object to string. Serialization occurs _after_ response schema validation

e.g.

```javascript
serDes: [{
   // installs dateTime serializer and deserializer
  OpenApiValidator.serdes.dateTime,
  // installs date serializer and deserializer
  OpenApiValidator.serdes.date,
  // custom serializer and deserializer for the custom format, mongo-objectid
  {
    format: 'mongo-objectid',
    deserialize: (s) => new ObjectID(s),
    serialize: (o) => o.toString(),
  }
}],
```

The mongo serializers will trigger on the following schema:

```yaml
type: string
format: mongo-objectid
```

See [mongo-serdes-js](https://github.com/pilerou/mongo-serdes-js) for additional (de)serializers including MongoDB `ObjectID`, `UUID`, ...

### ▪️ operationHandlers (optional)

Defines the base directory for operation handlers. This is used in conjunction with express-openapi-validator's OpenAPI vendor extensions, `x-eov-operation-id`, `x-eov-operation-handler` and OpenAPI's `operationId`. See [example](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/3-eov-operations).

Additionally, if you want to change how modules are resolved e.g. use dot delimited operation ids e.g. `path.to.module.myFunction`, you may optionally add a custom `resolver`. See [documentation and example](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/5-custom-operation-resolver)

- `string` - the base directory containing operation handlers
- `false` - (default) disable auto wired operation handlers
- `{ ... }` - specifies a base directory and optionally a custom resolver

  **handlers:**

  For example:

  ```javascript
  operationHandlers: {
    basePath: __dirname,
    resolver: function (modulePath, route): express.RequestHandler {
      ///...
    }
  }
  ```

```
operationHandlers: 'operations/base/path'
```

**Note** that the `x-eov-operation-handler` OpenAPI vendor extension specifies a path relative to `operationHandlers`. Thus if `operationHandlers` is `/handlers` and an `x-eov-operation-handler` has path `routes/ping`, then the handler file `/handlers/routes/ping.js` (or `ts`) is used.

Complete example [here](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/3-eov-operations)

**api.yaml**

```yaml
/ping:
  get:
    description: |
      ping then pong!
    # OpenAPI's operationId may be used to to specify the operation id
    operationId: ping
    # x-eov-operation-id may be used to specify the operation id
    # Used when operationId is omitted. Overrides operationId when both are specified
    x-eov-operation-id: ping
    # specifies the path to the operation handler.
    # the path is relative to the operationHandlers option
    # e.g. operations/base/path/routes/ping.js
    x-eov-operation-handler: routes/ping
    responses:
      '200':
        description: OK
        # ...
```

**routes/ping.js**

`x-eov-operation-handler` specifies the path to this handlers file, `ping.js`

`x-eov-operation-id` (or `operationId`) specifies operation handler's key e.g. `ping`

```javascript
module.exports = {
  ping: (req, res) => res.status(200).send('pong'),
};
```

### ▪️ ignorePaths (optional)

Defines a regular expression or function that determines whether a path(s) should be ignored. If it's a regular expression, any path that matches the regular expression will be ignored by the validator. If it's a function, it will ignore any paths that returns a truthy value.

The following ignores any path that ends in `/pets` e.g. `/v1/pets`.
As a regular expression:

```
ignorePaths: /.*\/pets$/
```

or as a function:

```
ignorePaths: (path) => path.endsWith('/pets')
```

### ▪️ fileUploader (optional)

Specifies the options to passthrough to multer. express-openapi-validator uses multer to handle file uploads. see [multer opts](https://github.com/expressjs/multer)

- `true` (**default**) - enables multer and provides simple file(s) upload capabilities
- `false` - disables file upload capability. Upload capabilities may be provided by the user
- `{...}` - multer options to be passed-through to multer. see [multer opts](https://github.com/expressjs/multer) for possible options

  e.g.

  ```javascript
  fileUploader: {
    dest: 'uploads/';
  }
  ```

### ▪️ \$refParser.mode (optional)

Determines how JSON schema references are resolved by the internal [json-schema-ref-parser](https://github.com/APIDevTools/json-schema-ref-parser). Generally, the default mode, `bundle` is sufficient, however if you use [escape characters in \$refs](https://swagger.io/docs/specification/using-ref/), `dereference` is necessary.

- `bundle` **(default)** - Bundles all referenced files/URLs into a single schema that only has internal $ref pointers. This eliminates the risk of circular references, but does not handle escaped characters in $refs.
- `dereference` - Dereferences all $ref pointers in the JSON Schema, replacing each reference with its resolved value. Introduces risk of circular $refs. Handles [escape characters in \$refs](https://swagger.io/docs/specification/using-ref/))

See this [issue](https://github.com/APIDevTools/json-schema-ref-parser/issues/101#issuecomment-421755168) for more information.

e.g.

```javascript
$refParser: {
  mode: 'bundle';
}
```

### ▪️ coerceTypes (optional) - _deprecated_

Determines whether the validator should coerce value types to match the those defined in the OpenAPI spec. This option applies **only** to path params, query strings, headers, and cookies. _It is **highly unlikely** that you will want to disable this. As such this option is deprecated and will be removed in the next major version_

- `true` (**default**) - coerce scalar data types.
- `"array"` - in addition to coercions between scalar types, coerce scalar data to an array with one element and vice versa (as required by the schema).

## The Base URL

The validator will only validate requests, securities, and responses that are under
the server's [base URL](https://spec.openapis.org/oas/v3.0.0.html#serverVariableObject).

This is useful for those times when the API and frontend are being served by the same
application. ([More detail about the base URL](https://swagger.io/docs/specification/api-host-and-base-path/).)

```yaml
servers:
  - url: https://api.example.com/v1
```

The validation applies to all paths defined under this base URL. Routes in your app
that are \_not_se URL—such as pages—will not be validated.

| URL                                  | Validated?                 |
| :----------------------------------- | :------------------------- |
| `https://api.example.com/v1/users`   | :white_check_mark:         |
| `https://api.example.com/index.html` | no; not under the base URL |

In some cases, it may be necessary to _**skip validation** for paths **under the base url**_. To do this, use the [`ignorePaths`](#ignorepaths) option.

## Security handlers

> **Note:** security `handlers` are an optional component. security `handlers` provide a convenience, whereby the request, declared scopes, and the security schema itself are provided as parameters to each security `handlers` callback that you define. The code you write in each callback can then perform authentication and authorization checks. **_Note that the same can be achieved using standard Express middleware_. The difference** is that security `handlers` provide you the OpenAPI schema data described in your specification\_. Ultimately, this means, you don't have to duplicate that information in your code.

> All in all, security `handlers` are purely optional and are provided as a convenience.

Security handlers specify a set of custom security handlers to be used to validate security i.e. authentication and authorization. If a security `handlers` object is specified, a handler must be defined for **_all_** securities. If security `handlers are **_not_** specified, a default handler is always used. The default handler will validate against the OpenAPI spec, then call the next middleware.

If security `handlers` are specified, the validator will validate against the OpenAPI spec, then call the security handler providing it the Express request, the security scopes, and the security schema object.

- security `handlers` is an object that maps security keys to security handler functions. Each security key must correspond to `securityScheme` name.
  The `validateSecurity.handlers` object signature is as follows:

  ```typescript
  {
    validateSecurity: {
      handlers: {
        [securityKey]: function(
          req: Express.Request,
          scopes: string[],
          schema: SecuritySchemeObject
        ): void,
      }
    }
  }
  ```

  [SecuritySchemeObject](https://github.com/cdimascio/express-openapi-validator/blob/master/src/framework/types.ts#L269)

  **For example:**

  ```javascript
  validateSecurity: {
    handlers: {
      ApiKeyAuth: function(req, scopes, schema) {
        console.log('apikey handler throws custom error', scopes, schema);
        throw Error('my message');
      },
    }
  }
  ```

The _express-openapi-validator_ performs a basic validation pass prior to delegating to security handlers. If basic validation passes, security handler function(s) are invoked.

In order to signal an auth failure, the security handler function **must** either:

1. `throw { status: 403, message: 'forbidden' }`
2. `throw Error('optional message')`
3. `return false`
4. return a promise which resolves to `false` e.g `Promise.resolve(false)`
5. return a promise rejection e.g.
   - `Promise.reject({ status: 401, message: 'yikes' });`
   - `Promise.reject(Error('optional 'message')`
   - `Promise.reject(false)`

Note: error status `401` is returned, unless option `i.` above is used

**Some examples:**

```javascript
validateSecurity: {
  handlers: {
    ApiKeyAuth: (req, scopes, schema) => {
      throw Error('my message');
    },
    OpenID: async (req, scopes, schema) => {
      throw { status: 403, message: 'forbidden' }
    },
    BasicAuth: (req, scopes, schema) => {
      return Promise.resolve(false);
    },
    ...
  }
}
```

In order to grant authz, the handler function **must** either:

- `return true`
- return a promise which resolves to `true`

**Some examples**

```javascript
validateSecurity: {
  handlers: {
    ApiKeyAuth: (req, scopes, schema) => {
      return true;
    },
    BearerAuth: async (req, scopes, schema) => {
      return true;
    },
    ...
  }
}
```

Each security `handlers`' `securityKey` must match a `components/securitySchemes` property

```yaml
components:
  securitySchemes:
    ApiKeyAuth: # <-- Note this name must be used as the name handler function property
      type: apiKey
      in: header
      name: X-API-Key
```

See [OpenAPI 3](https://swagger.io/docs/specification/authentication/) authentication for `securityScheme` and `security` documentation
See [examples](https://github.com/cdimascio/express-openapi-validator/blob/master/test/security.handlers.spec.ts#L21) from unit tests

## Example: Multiple Validators and API specs

It may be useful to serve multiple APIs with separate specs via single service. An example might be an API that serves both `v1` and `v2` from the same service. The sample code below shows how one might accomplish this.

See complete [example](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/2-standard-multiple-api-specs)

```javascript
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const OpenApiValidator = require('express-openapi-validator');

app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());
app.use(bodyParser.json());

const versions = [1, 2];

for (const v of versions) {
  const apiSpec = path.join(__dirname, `api.v${v}.yaml`);
  app.use(
    OpenApiValidator.middleware({
      apiSpec,
    }),
  );

  routes(app, v);
}

http.createServer(app).listen(3000);
console.log('Listening on port 3000');

function routes(app, v) {
  if (v === 1) routesV1(app);
  if (v === 2) routesV2(app);
}

function routesV1(app) {
  const v = '/v1';
  app.post(`${v}/pets`, (req, res, next) => {
    res.json({ ...req.body });
  });
  app.get(`${v}/pets`, (req, res, next) => {
    res.json([
      {
        id: 1,
        name: 'happy',
        type: 'cat',
      },
    ]);
  });

  app.use((err, req, res, next) => {
    // format error
    res.status(err.status || 500).json({
      message: err.message,
      errors: err.errors,
    });
  });
}

function routesV2(app) {
  const v = '/v2';
  app.get(`${v}/pets`, (req, res, next) => {
    res.json([
      {
        pet_id: 1,
        pet_name: 'happy',
        pet_type: 'kitty',
      },
    ]);
  });
  app.post(`${v}/pets`, (req, res, next) => {
    res.json({ ...req.body });
  });

  app.use((err, req, res, next) => {
    // format error
    res.status(err.status || 500).json({
      message: err.message,
      errors: err.errors,
    });
  });
}

module.exports = app;
```

## FAQ

**Q:** How do I match paths, like those described in RFC-6570?

**A:** OpenAPI 3.0 does not support RFC-6570. That said, we provide a minimalistic mechanism that conforms syntactically to OpenAPI 3 and accomplishes a common use case. For example, matching file paths and storing the matched path in `req.params`

Using the following OpenAPI 3.x definition

```yaml
/files/{path}*:
  get:
    parameters:
      - name: path
        in: path
        required: true
        schema:
          type: string
```

With the following Express route definition

```javascript
  app.get(`/files/:path(*)`, (req, res) => { /* do stuff */ }`
```

A path like `/files/some/long/path` will pass validation. The Express `req.params.path` property will hold the value `some/long/path`.

**Q:** Can I use discriminators with `oneOf` and `anyOf`?

**A:**
Currently, there is support for top level discriminators. See [top-level discriminator example](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/8-top-level-discriminator)

**Q:** What happened to the `securityHandlers` property?

**A:** In v3, `securityHandlers` have been replaced by `validateSecurity.handlers`. To use v3 security handlers, move your existing security handlers to the new property. No other change is required. Note that the v2 `securityHandlers` property is supported in v3, but deprecated

**Q**: What happened to the `multerOpts` property?

**A**: In v3, `multerOpts` have been replaced by `fileUploader`. In order to use the v3 `fileUploader`, move your multer options to `fileUploader` No other change is required. Note that the v2 `multerOpts` property is supported in v3, but deprecated

**Q:** I can disallow unknown query parameters with `allowUnknownQueryParameters: false`. How can disallow unknown body parameters?

**A:** Add `additionalProperties: false` when [describing](https://swagger.io/docs/specification/data-models/keywords/) e.g a `requestBody` to ensure that additional properties are not allowed. For example:

```yaml
Pet:
additionalProperties: false
required:
  - name
properties:
  name:
    type: string
  type:
    type: string
```

**Q:** Can I use `express-openapi-validator` with `swagger-ui-express`?

**A:** Yes. Be sure to `use` the `swagger-ui-express` serve middleware prior to installing `OpenApiValidator`. This will ensure that `swagger-ui-express` is able to fully prepare the spec before before OpenApiValidator attempts to use it. For example:

```javascript
const swaggerUi = require('swagger-ui-express')
const OpenApiValidator = require('express-openapi-validator')

...

app.use('/', swaggerUi.serve, swaggerUi.setup(documentation))

app.use(OpenApiValidator.middleware({
  apiSpec, // api spec JSON object
  //... other options
  }
}))
```

**Q:** I have a handler function defined on an `express.Router`. If i call `req.params` each param value has type `string`. If i define same handler function on an `express.Application`, each value in `req.params` is already coerced to the type declare in my spec. Why not coerce theseF values on an `express.Router`?

**A:** First, it's important to note that this behavior does not impact validation. The validator will validate against the type defined in your spec.

In order to modify the `req.params`, express requires that a param handler be registered e.g. `app.param(...)` or `router.param(...)`. Since `app` is available to middleware functions, the validator registers an `app.param` handler to coerce and modify the values of `req.params` to their declared types. Unfortunately, express does not provide a means to determine the current router from a middleware function, hence the validator is unable to register the same param handler on an express router. Ultimately, this means if your handler function is defined on `app`, the values of `req.params` will be coerced to their declared types. If your handler function is declare on an `express.Router`, the values of `req.params` values will be of type `string` (You must coerce them e.g. `parseInt(req.params.id)`).

## Related Projects

- [koa-openapi-validator](https://github.com/cdimascio/express-openapi-validator/tree/lerna-fastify/packages/koa-openapi-validator)
- [fastify-openapi-validator](https://github.com/cdimascio/express-openapi-validator/tree/lerna-fastify/packages/fastify-openapi-validator)

\_Note: koa and fastify does not (yet) support response validation or operation handlers

## Contributors ✨

Contributions welcome! Here's how to [contribute](CONTRIBUTING.md).

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="http://www.twitter.com/carminedimascio"><img src="https://avatars1.githubusercontent.com/u/4706618?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Carmine DiMascio</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=cdimascio" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=cdimascio" title="Tests">⚠️</a> <a href="#infra-cdimascio" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    <td align="center"><a href="http://litr.cc/"><img src="https://avatars2.githubusercontent.com/u/4166193?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Sheldhur Mornor</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=sheldhur" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=sheldhur" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/trebler"><img src="https://avatars2.githubusercontent.com/u/5610569?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Andrey Trebler</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=trebler" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=trebler" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/richdouglasevans"><img src="https://avatars1.githubusercontent.com/u/1855109?v=4?s=100" width="100px;" alt=""/><br /><sub><b>richdouglasevans</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=richdouglasevans" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/medolino"><img src="https://avatars2.githubusercontent.com/u/3725402?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Miran Setinc</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=medolino" title="Code">💻</a></td>
    <td align="center"><a href="http://frankcalise.com"><img src="https://avatars0.githubusercontent.com/u/374022?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Frank Calise</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=frankcalise" title="Code">💻</a></td>
    <td align="center"><a href="https://il.linkedin.com/in/gonendukas"><img src="https://avatars1.githubusercontent.com/u/1597854?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Gonen Dukas</b></sub></a><br /><a href="#ideas-gonenduk" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=gonenduk" title="Tests">⚠️</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://rysta.io"><img src="https://avatars0.githubusercontent.com/u/4029642?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Sven Eliasson</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=comino" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=comino" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/SpencerLawrenceBrown"><img src="https://avatars3.githubusercontent.com/u/7729907?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Spencer Brown</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=SpencerLawrenceBrown" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=SpencerLawrenceBrown" title="Tests">⚠️</a></td>
    <td align="center"><a href="http://www.mixingpixels.com"><img src="https://avatars2.githubusercontent.com/u/4136503?v=4?s=100" width="100px;" alt=""/><br /><sub><b>José Neves</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=rafalneves" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/mk811"><img src="https://avatars1.githubusercontent.com/u/32785388?v=4?s=100" width="100px;" alt=""/><br /><sub><b>mk811</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=mk811" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=mk811" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/HugoMario"><img src="https://avatars1.githubusercontent.com/u/3266608?v=4?s=100" width="100px;" alt=""/><br /><sub><b>HugoMario</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=HugoMario" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=HugoMario" title="Tests">⚠️</a></td>
    <td align="center"><a href="http://row1.ca"><img src="https://avatars3.githubusercontent.com/u/913249?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Rowan Cockett</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=rowanc1" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/jy95"><img src="https://avatars0.githubusercontent.com/u/9306961?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Jacques Yakoub</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=jy95" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/ckeboss"><img src="https://avatars1.githubusercontent.com/u/723809?v=4?s=100" width="100px;" alt=""/><br /><sub><b>ckeboss</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=ckeboss" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=ckeboss" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/JacobLey"><img src="https://avatars0.githubusercontent.com/u/37151850?v=4?s=100" width="100px;" alt=""/><br /><sub><b>JacobLey</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=JacobLey" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=JacobLey" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/vdmitriy"><img src="https://avatars0.githubusercontent.com/u/2050542?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Dmitriy Voeykov</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=vdmitriy" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=vdmitriy" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/foway0"><img src="https://avatars3.githubusercontent.com/u/30143508?v=4?s=100" width="100px;" alt=""/><br /><sub><b>GARAMKIM</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=foway0" title="Code">💻</a> <a href="#ideas-foway0" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/mathewmeconry"><img src="https://avatars0.githubusercontent.com/u/4057473?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Mathias Scherer</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=mathewmeconry" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/mirekgw"><img src="https://avatars1.githubusercontent.com/u/61246716?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Mirek</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=mirekgw" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Emmeral"><img src="https://avatars1.githubusercontent.com/u/35600952?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Florian Beutel</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=Emmeral" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/jakubskopal"><img src="https://avatars2.githubusercontent.com/u/8149011?v=4?s=100" width="100px;" alt=""/><br /><sub><b>jakubskopal</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=jakubskopal" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=jakubskopal" title="Tests">⚠️</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=jakubskopal" title="Documentation">📖</a></td>
    <td align="center"><a href="http://www.deetoo.co.uk"><img src="https://avatars3.githubusercontent.com/u/3101390?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Jordan Dobrev</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=jordandobrev" title="Tests">⚠️</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=jordandobrev" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/efabris"><img src="https://avatars2.githubusercontent.com/u/9377503?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Enrico Fabris</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=efabris" title="Code">💻</a></td>
    <td align="center"><a href="https://mdwheele.github.io"><img src="https://avatars1.githubusercontent.com/u/2453394?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Dustin Wheeler</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=mdwheele" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=mdwheele" title="Documentation">📖</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=mdwheele" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://tmcarmichael.com"><img src="https://avatars1.githubusercontent.com/u/23545336?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Thomas Carmichael</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=tmcarmichael" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/Jakesterwars"><img src="https://avatars1.githubusercontent.com/u/27702288?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Jakesterwars</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=Jakesterwars" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/xtrycatchx"><img src="https://avatars2.githubusercontent.com/u/1135580?v=4?s=100" width="100px;" alt=""/><br /><sub><b>xtrycatchx</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=xtrycatchx" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/codinggosu"><img src="https://avatars0.githubusercontent.com/u/16798331?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Lee Dong Joo</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=codinggosu" title="Documentation">📖</a></td>
    <td align="center"><a href="http://dmitrychekanov.com"><img src="https://avatars3.githubusercontent.com/u/45722?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Dmitry Chekanov</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=dchekanov" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=dchekanov" title="Tests">⚠️</a></td>
    <td align="center"><a href="http://dystopian.dev"><img src="https://avatars2.githubusercontent.com/u/12427840?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Redhart Azul</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=dystopiandev" title="Code">💻</a></td>
    <td align="center"><a href="http://zeekat.nl"><img src="https://avatars1.githubusercontent.com/u/24154?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Joost Diepenmaat</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=joodie" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=joodie" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/DomParfitt"><img src="https://avatars2.githubusercontent.com/u/11363907?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Dom Parfitt</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=DomParfitt" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=DomParfitt" title="Tests">⚠️</a></td>
    <td align="center"><a href="http://xuguang.info"><img src="https://avatars1.githubusercontent.com/u/1443518?v=4?s=100" width="100px;" alt=""/><br /><sub><b>xg1990</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=xg1990" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/ownagedj"><img src="https://avatars2.githubusercontent.com/u/5887702?v=4?s=100" width="100px;" alt=""/><br /><sub><b>ownagedj</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=ownagedj" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=ownagedj" title="Tests">⚠️</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/dprgarner"><img src="https://avatars2.githubusercontent.com/u/11389185?v=4?s=100" width="100px;" alt=""/><br /><sub><b>David Garner</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=dprgarner" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/balazssoltesz"><img src="https://avatars0.githubusercontent.com/u/52117200?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Balazs Soltesz</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=balazssoltesz" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=balazssoltesz" title="Tests">⚠️</a></td>
    <td align="center"><a href="http://www.christiaannieuwlaat.nl"><img src="https://avatars1.githubusercontent.com/u/3034281?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Christiaan Nieuwlaat</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=krizzje" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/ex1st"><img src="https://avatars1.githubusercontent.com/u/7733915?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Ilya</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=ex1st" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=ex1st" title="Tests">⚠️</a></td>
    <td align="center"><a href="http://aviskase.com"><img src="https://avatars1.githubusercontent.com/u/3819473?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Yuliya Bagriy</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=aviskase" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=aviskase" title="Tests">⚠️</a></td>
    <td align="center"><a href="http://ks.priv.no/"><img src="https://avatars2.githubusercontent.com/u/1738636?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Kristjan Siimson</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=siimsoni" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=siimsoni" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/LEI"><img src="https://avatars2.githubusercontent.com/u/4112243?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Guillaume</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=LEI" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=LEI" title="Tests">⚠️</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://www.linkedin.com/in/volodymyr-kolesnykov"><img src="https://avatars1.githubusercontent.com/u/7810770?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Volodymyr Kolesnykov</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=sjinks" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=sjinks" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/pilerou"><img src="https://avatars2.githubusercontent.com/u/664865?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Pierre Le Roux</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=pilerou" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=pilerou" title="Tests">⚠️</a> <a href="#ideas-pilerou" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://www.spincast.org"><img src="https://avatars2.githubusercontent.com/u/1643012?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Electro Type</b></sub></a><br /><a href="#ideas-electrotype" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/aaronluman"><img src="https://avatars.githubusercontent.com/u/1248177?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Aaron Luman</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=aaronluman" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=aaronluman" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://0xcafeadd1c7.github.io/"><img src="https://avatars.githubusercontent.com/u/2291747?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Aymeric Robini</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=0xCAFEADD1C7" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=0xCAFEADD1C7" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/lyndoh"><img src="https://avatars.githubusercontent.com/u/20314316?v=4?s=100" width="100px;" alt=""/><br /><sub><b>lyndoh</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=lyndoh" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=lyndoh" title="Tests">⚠️</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## Community articles, blogs, and tutorials

_Seeking content creators..._

Have you written an article, blog, or tutorial that uses `express-openapi-validator`?

Please post your links [here](https://github.com/cdimascio/express-openapi-validator/issues/316)

We plan to publicize a variety of links here.

## License

[MIT](LICENSE)

<a href="https://www.buymeacoffee.com/m97tA5c" target="_blank"><img src="https://bmc-cdn.nyc3.digitaloceanspaces.com/BMC-button-images/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: auto !important;width: auto !important;" ></a>
