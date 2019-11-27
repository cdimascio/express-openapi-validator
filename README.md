# express-openapi-validator

[![](https://travis-ci.org/cdimascio/express-openapi-validator.svg?branch=master)](#) [![](https://img.shields.io/npm/v/express-openapi-validator.svg)](https://www.npmjs.com/package/express-openapi-validator) ![](https://img.shields.io/npm/dm/express-openapi-validator.svg) [![Coverage Status](https://coveralls.io/repos/github/cdimascio/express-openapi-validator/badge.svg?branch=master)](https://coveralls.io/github/cdimascio/express-openapi-validator?branch=master) [![All Contributors](https://img.shields.io/badge/all_contributors-13-orange.svg?style=flat-square)](#contributors) [![Greenkeeper badge](https://badges.greenkeeper.io/cdimascio/express-openapi-validator.svg)](https://greenkeeper.io/) [![](https://img.shields.io/gitter/room/cdimascio-oss/community?color=%23eb205a)](https://gitter.im/cdimascio-oss/community) [![](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

**An OpenApi validator for ExpressJS** that automatically validates **API** _**requests**_ and _**responses**_ using an **OpenAPI 3** specification.

<p align="center">
<img src="https://raw.githubusercontent.com/cdimascio/express-openapi-validator/master/assets/express-openapi-validator.png" width="500">
</p>

[express-openapi-validator](https://github.com/cdimascio/express-openapi-validator) is an unopinionated library that integrates with new and existing API applications. express-openapi-validator lets you write code the way you want; it does not impose any coding convention or project layout. Simply, install the validator onto your express app, point it to your OpenAPI 3 specification, then define and implement routes the way you prefer. See an [example](#example-express-api-server).

**Features:**

- ✔️ request validation
- ✔️ response validation 
- 👮 security validation / custom security functions
- 👽 3rd party / custom formats 
- ✂️  **$ref** support; split specs over multiple files
- 🎈 file upload


[![GitHub stars](https://img.shields.io/github/stars/cdimascio/express-openapi-validator.svg?style=social&label=Star&maxAge=2592000)](https://GitHub.com/cdimascio/express-openapi-validator/stargazers/) [![Twitter URL](https://img.shields.io/twitter/url/https/github.com/cdimascio/express-openapi-validator.svg?style=social)](https://twitter.com/intent/tweet?text=Check%20out%20express-openapi-validator%20by%20%40CarmineDiMascio%20https%3A%2F%2Fgithub.com%2Fcdimascio%2Fexpress-openapi-validator%20%F0%9F%91%8D)

## Install

```shell
npm i express-openapi-validator
```

## Usage

1. Install the openapi validator

```javascript
new OpenApiValidator({
  apiSpec: './test/resources/openapi.yaml',
  validateRequests: true, // (default)
  validateResponses: true, // false by default
}).install(app);
```

2. Register an error handler

```javascript
app.use((err, req, res, next) => {
  // format error
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
  });
});
```

_**Note:** Ensure express is configured with all relevant body parsers. body parser middleware functions must be specified prior to any validated routes. See an [example](#example-express-api-server)_.

## Usage (options)

See [Advanced Usage](#Advanced-Usage) options to:

- inline api specs as JSON.
- configure request/response validation options
- tweak the file upload configuration.
- customize authentication with `securityHandlers`.
- use OpenAPI 3.0.x 3rd party and custom formats.
- and more...


## [Example Express API Server](https://github.com/cdimascio/express-openapi-validator/tree/master/example)

The following demonstrates how to use express-openapi-validator to auto validate requests and responses. It also includes file upload!

See the complete [source code](https://github.com/cdimascio/express-openapi-validator/tree/master/example) for the example below:


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

// 2. Set up body parsers for the request body types you expect
//    Must be specified prior to endpoints in 5.
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(bodyParser.urlencoded());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 3. (optionally) Serve the OpenAPI spec
app.use('/spec', express.static(spec));

// 4. Install the OpenApiValidator onto your express app
new OpenApiValidator({
  apiSpec: './openapi.yaml',
  // securityHandlers: { ... }, // <-- if using security
  // validateResponses: true, // <-- to validate responses
  // unknownFormats: ['my-format'] // <-- to provide custom formats
}).install(app);

// 5. Define routes using Express
app.get('/v1/pets', function(req, res, next) {
  res.json([{ id: 1, name: 'max' }, { id: 2, name: 'mini' }]);
});

app.post('/v1/pets', function(req, res, next) {
  res.json({ name: 'sparky' });
});

app.get('/v1/pets/:id', function(req, res, next) {
  res.json({ id: req.params.id, name: 'sparky' });
});

// 5a. Define route(s) to upload file(s)
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

// 6. Create an Express error handler
app.use((err, req, res, next) => {
  // 7. Customize errors
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
  });
});
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

## Advanced Usage
### OpenApiValidator Options

express-openapi validator provides a good deal of flexibility via its options.

Options are provided via the options object. Options take the following form:

```javascript
new OpenApiValidator(options).install({
  apiSpec: './openapi.yaml',
  validateRequests: true,
  validateResponses: true,
  ignorePaths: /.*\/pets$/
  unknownFormats: ['phone-number', 'uuid'],
  multerOpts: { ... },
  securityHandlers: {
    ApiKeyAuth: (req, scopes, schema) => {
      throw { status: 401, message: 'sorry' }
    }
  }
});
```


### ▪️ apiSpec (required)

Specifies the path to an OpenAPI 3 specification or a JSON object representing the OpenAPI 3 specificiation

```javascript
apiSpec: './path/to/my-openapi-spec.yaml'
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

- `true` (**default**) -  validate requests.
- `false` - do not validate requests.
- `{ ... }` - validate requests with options

	**allowUnknownQueryParameters:**
	
	- `true` - enables unknown/undeclared query parameters to pass validation
	- `false` - (**default**) fail validation if an unknown query parameter is present
	
	For example:
	
	```javascript
	validateRequests: {
	  allowUnknownQueryParameters: true
	}
	```

### ▪️ validateResponses (optional)

Determines whether the validator should validate responses. Also accepts response validation options.

- `true` - validate responses in 'strict' mode i.e. responses MUST match the schema. 
- `false` (**default**) -  do not validate responses
- `{ ... }` - validate responses with options

	**removeAdditional:**
	
	- `"failing"` - additional properties that fail schema validation are automatically removed from the response.
	
	For example:
	
	```javascript
	validateResponses: {
	  removeAdditional: 'failing'
	}
	```

### ▪️ ignorePaths (optional)

Defines a regular expression that determines whether a path(s) should be ignored. Any path which matches the regular expression will not be validated.

The following ignores any path that ends in `/pets`

```
ignorePaths: /.*\/pets$/
```


### ▪️ unknownFormats (optional)

Defines how the validator should behave if an unknown or custom format is encountered.

- `true` **(default)** - When an unknown format is encountered, the validator will report a 400 error.
- `[string]` **_(recommended for unknown formats)_** - An array of unknown format names that will be ignored by the validator. This option can be used to allow usage of third party schemas with format(s), but still fail if another unknown format is used. 
	
	e.g.
	
  ```javascript
  unknownFormats: ['phone-number', 'uuid']
  ```

- `"ignore"` - to log warning during schema compilation and always pass validation. This option is not recommended, as it allows to mistype format name and it won't be validated without any error message.

### ▪️ multerOpts (optional)

Specifies the options to passthrough to multer. express-openapi-validator uses multer to handle file uploads. see [multer opts](https://github.com/expressjs/multer)

### ▪️ coerceTypes (optional)

Determines whether the validator should coerce value types to match the type defined in the OpenAPI spec.  

- `true` (**default**) - coerce scalar data types.
- `false` - no type coercion.
- `"array"` - in addition to coercions between scalar types, coerce scalar data to an array with one element and vice versa (as required by the schema).

### ▪️ securityHandlers (optional)

>**Note:** `securityHandlers` are an optional component. `securityHandlers` provide a convenience, whereby the request, declared scopes, and the security schema itself are provided as parameters to each `securityHandlers` callback that you define. The code you write in each callback can then perform authentication and authorization checks. **_Note that the same can be achieved using standard Express middleware_. The difference** is that `securityHandlers` provide you the OpenAPI schema data described in your specification_. Ulimately, this means, you don't have to duplicate that information in your code. 

>All in all, `securityHandlers` are purely optional and are provided as a convenience.


Security handlers specify a set of custom security handlers to be used to validate security i.e. authentication and authorization. If a `securityHandlers` object is specified, a handler must be defined for **_all_** securities. If `securityHandlers are **_not_** specified, a default handler is always used. The default handler will validate against the OpenAPI spec, then call the next middleware.

If `securityHandlers` are specified, the validator will validate against the OpenAPI spec, then call the security handler providing it the Express request, the security scopes, and the security schema object. 

- `securityHandlers` is an object that maps security keys to security handler functions. Each security key must correspond to `securityScheme` name.
  The `securityHandlers` object signature is as follows:

  ```typescript
  {
    securityHandlers: {
      [securityKey]: function(
        req: Express.Request,
        scopes: string[],
        schema: SecuritySchemeObject
      ): void,
    }
  }
  ```

  [SecuritySchemeObject](https://github.com/cdimascio/express-openapi-validator/blob/master/src/framework/types.ts#L269)

  **For example:**

  ```javascript
  securityHandlers: {
    ApiKeyAuth: function(req, scopes, schema) {
      console.log('apikey handler throws custom error', scopes, schema);
      throw Error('my message');
    },
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
  securityHandlers: {
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
  ```

    In order to grant authz, the handler function **must** either:
    
    - `return true`
    - return a promise which resolves to `true`

    **Some examples**

    ```javascript
    securityHandlers: {
      ApiKeyAuth: (req, scopes, schema) => {
        return true;
      },
      BearerAuth: async (req, scopes, schema) => {
        return true;
      },
      ...
    }
    ```

    Each `securityHandlers` `securityKey` must match a `components/securitySchemes` property

    ```yaml
    components:
      securitySchemes:
        ApiKeyAuth: # <-- Note this name must be used as the name handler function property
          type: apiKey
          in: header
          name: X-API-Key
     ```

    See [OpenAPI 3](https://swagger.io/docs/specification/authentication/) authentication for `securityScheme` and `security` documentation

    See [examples](https://github.com/cdimascio/express-openapi-validator/blob/security/test/security.spec.ts#L17) from unit tests


## The Base URL

The validator will only validate requests — and (optionally) responses — that are under
the server's [base URL](https://spec.openapis.org/oas/v3.0.0.html#serverVariableObject).

This is useful for those times when the API and frontend are being served by the same
application. ([More detail about the base URL](https://swagger.io/docs/specification/api-host-and-base-path/).)

```yaml
servers:
  - url: https://api.example.com/v1
```

The validation applies to all paths defined under this base URL. Routes in your app
that are _not_ under the base URL—such as pages—will not be validated.

| URL                                  | Validated?                 |
| :----------------------------------- | :------------------------- |
| `https://api.example.com/v1/users`   | :white_check_mark:         |
| `https://api.example.com/index.html` | no; not under the base URL |

_**Note** that in some cases, it may be necessary to skip validation for paths under the base url. To do this, use the `ignorePaths` option._

## FAQ


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
  const OpenApiValidator = require('express-openapi-validator').OpenApiValidator
  
  ...
  
  app.use('/', swaggerUi.serve, swaggerUi.setup(documentation))

  new OpenApiValidator({
    apiSpec, // api spec JSON object
    //... other options
    }
  }).install(app)
  ```

## Contributors ✨

Contributions welcome! Here's how to [contribute](CONTRIBUTING.md).

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->
<table>
  <tr>
    <td align="center"><a href="http://www.twitter.com/carminedimascio"><img src="https://avatars1.githubusercontent.com/u/4706618?v=4" width="100px;" alt="Carmine DiMascio"/><br /><sub><b>Carmine DiMascio</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=cdimascio" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=cdimascio" title="Tests">⚠️</a> <a href="#infra-cdimascio" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    <td align="center"><a href="http://litr.cc/"><img src="https://avatars2.githubusercontent.com/u/4166193?v=4" width="100px;" alt="Sheldhur Mornor"/><br /><sub><b>Sheldhur Mornor</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=sheldhur" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=sheldhur" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/trebler"><img src="https://avatars2.githubusercontent.com/u/5610569?v=4" width="100px;" alt="Andrey Trebler"/><br /><sub><b>Andrey Trebler</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=trebler" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=trebler" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/richdouglasevans"><img src="https://avatars1.githubusercontent.com/u/1855109?v=4" width="100px;" alt="richdouglasevans"/><br /><sub><b>richdouglasevans</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=richdouglasevans" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/medolino"><img src="https://avatars2.githubusercontent.com/u/3725402?v=4" width="100px;" alt="Miran Setinc"/><br /><sub><b>Miran Setinc</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=medolino" title="Code">💻</a></td>
    <td align="center"><a href="http://frankcalise.com"><img src="https://avatars0.githubusercontent.com/u/374022?v=4" width="100px;" alt="Frank Calise"/><br /><sub><b>Frank Calise</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=frankcalise" title="Code">💻</a></td>
    <td align="center"><a href="https://il.linkedin.com/in/gonendukas"><img src="https://avatars1.githubusercontent.com/u/1597854?v=4" width="100px;" alt="Gonen Dukas"/><br /><sub><b>Gonen Dukas</b></sub></a><br /><a href="#ideas-gonenduk" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=gonenduk" title="Tests">⚠️</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://rysta.io"><img src="https://avatars0.githubusercontent.com/u/4029642?v=4" width="100px;" alt="Sven Eliasson"/><br /><sub><b>Sven Eliasson</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=comino" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=comino" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/SpencerLawrenceBrown"><img src="https://avatars3.githubusercontent.com/u/7729907?v=4" width="100px;" alt="Spencer Brown"/><br /><sub><b>Spencer Brown</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=SpencerLawrenceBrown" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=SpencerLawrenceBrown" title="Tests">⚠️</a></td>
    <td align="center"><a href="http://www.mixingpixels.com"><img src="https://avatars2.githubusercontent.com/u/4136503?v=4" width="100px;" alt="José Neves"/><br /><sub><b>José Neves</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=rafalneves" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/mk811"><img src="https://avatars1.githubusercontent.com/u/32785388?v=4" width="100px;" alt="mk811"/><br /><sub><b>mk811</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=mk811" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=mk811" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/HugoMario"><img src="https://avatars1.githubusercontent.com/u/3266608?v=4" width="100px;" alt="HugoMario"/><br /><sub><b>HugoMario</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=HugoMario" title="Code">💻</a> <a href="https://github.com/cdimascio/express-openapi-validator/commits?author=HugoMario" title="Tests">⚠️</a></td>
    <td align="center"><a href="http://row1.ca"><img src="https://avatars3.githubusercontent.com/u/913249?v=4" width="100px;" alt="Rowan Cockett"/><br /><sub><b>Rowan Cockett</b></sub></a><br /><a href="https://github.com/cdimascio/express-openapi-validator/commits?author=rowanc1" title="Code">💻</a></td>
  </tr>
</table>

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## License

[MIT](LICENSE)

<a href="https://www.buymeacoffee.com/m97tA5c" target="_blank"><img src="https://bmc-cdn.nyc3.digitaloceanspaces.com/BMC-button-images/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: auto !important;width: auto !important;" ></a>
