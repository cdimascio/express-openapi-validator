# 🦋 fastify-openapi-validator

[![](https://travis-ci.com/cdimascio/express-openapi-validator.svg?branch=lerna-fastify)](#) [![](https://img.shields.io/npm/v/fastify-openapi-validator.svg)](https://www.npmjs.com/package/fastify-openapi-validator) [![](https://img.shields.io/npm/dm/fastify-openapi-validator?color=blue)](https://www.npmjs.com/package/fastify-openapi-validator) [![All Contributors](https://img.shields.io/badge/all_contributors-42-darkcyan.svg?style=flat)](#contributors) [![Coverage Status](https://coveralls.io/repos/github/cdimascio/express-openapi-validator/badge.svg?branch=master)](https://coveralls.io/github/cdimascio/express-openapi-validator?branch=master) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/1570a06f609345ddb237114bbd6ceed7)](https://www.codacy.com/manual/cdimascio/express-openapi-validator?utm_source=github.com&utm_medium=referral&utm_content=cdimascio/express-openapi-validator&utm_campaign=Badge_Grade) [![](https://img.shields.io/gitter/room/cdimascio-oss/community?color=%23eb205a)](https://gitter.im/cdimascio-oss/community) [![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/cdimascio/express-openapi-validator) [![](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

**An OpenApi validator for Fastify** that automatically validates **API** \_**requests** using an **OpenAPI 3** specification.

<p align="center">
<img src="https://raw.githubusercontent.com/cdimascio/express-openapi-validator/lerna-fastify/assets/fastify-openapi-validator-logo.png" width="400">
</p>

## Install

```shell
npm install fastify-openapi-validator@4.12.0-beta.2
```

## Usage

### Code

```js
const OpenApiValidator = require('fastify-openapi-validator');
app.use(
  OpenApiValidator.middleware({
    apiSpec: './openapi.yml',
    // additional options
  }),
);
```

## Example

```js
// 1. require the module
const openApiValidator = require('fastify-openapi-validator');
const { Pets } = require('./services');
const pets = new Pets();

function plugin(instance, options, next) {
  // 2. configure the validator (see options)
  instance.register(openApiValidator, {
    apiSpec: './openapi.yml',
  });

  // 3. define routes
  instance.get('/v1/pets', (request, reply) => {
    return pets.findAll(request.query);
  });

  instance.get('/v1/pets/:id', (request, reply) => {
    const pet = pets.findById(request.params.id);
    if (!pet) reply.code(404).send({ msg: 'not found' });
    return pet;
  });

  // 4. set an error handler and error shape
  instance.setErrorHandler(function (error, request, reply) {
    const code = error.status ?? 500;
    const errors = error.errors;
    const message = error.message;
    reply.code(code).send({
      message,
      errors,
    });
  });

  next();
}

module.exports = plugin;
```

## Options

Options are provided via the options object. Options take the following form:


```javascript
OpenApiValidator.middleware({
  apiSpec: './openapi.yaml',
  validateRequests: true,
  validateFormats: 'fast',
  formats: [{
    name: 'my-custom-format',
    type: 'string' | 'number',
    validate: (value: any) => boolean,
  }],
  unknownFormats: ['phone-number', 'uuid'],
  ignorePaths: /.*\/pets$/,
  $refParser: {
    mode: 'bundle'
  }
});
```

### ▪️ apiSpec (required)

Specifies the path to an OpenAPI 3 specification or a JSON object representing the OpenAPI 3 specificiation

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

### ▪️ formats (optional)

Defines a list of custome formats.

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

- `"fast"` (**default**) - only validate syntax, but not semantics. E.g. `2010-13-30T23:12:35Z` will pass validation eventhough it contains month 13.
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

## Related Projects

- [express-openapi-validator](https://github.com/cdimascio/express-openapi-validator)
- [koa-openapi-validator](https://github.com/cdimascio/express-openapi-validator/tree/lerna-fastify/packages/koa-openapi-validator)

## License

MIT
