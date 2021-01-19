# 🦋 fastify-openapi-validator

[![](https://travis-ci.com/cdimascio/express-openapi-validator.svg?branch=lerna-fastify)](#) [![](https://img.shields.io/npm/v/fastify-openapi-validator.svg)](https://www.npmjs.com/package/fastify-openapi-validator) [![](https://img.shields.io/npm/dm/fastify-openapi-validator?color=blue)](https://www.npmjs.com/package/fastify-openapi-validator) [![All Contributors](https://img.shields.io/badge/all_contributors-42-darkcyan.svg?style=flat)](#contributors) [![Coverage Status](https://coveralls.io/repos/github/cdimascio/express-openapi-validator/badge.svg?branch=master)](https://coveralls.io/github/cdimascio/express-openapi-validator?branch=master) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/1570a06f609345ddb237114bbd6ceed7)](https://www.codacy.com/manual/cdimascio/express-openapi-validator?utm_source=github.com&utm_medium=referral&utm_content=cdimascio/express-openapi-validator&utm_campaign=Badge_Grade) [![](https://img.shields.io/gitter/room/cdimascio-oss/community?color=%23eb205a)](https://gitter.im/cdimascio-oss/community) [![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/cdimascio/express-openapi-validator) [![](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

**An OpenApi validator for Fastify** that automatically validates **API** \_**requests** using an **OpenAPI 3** specification.

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

### Options

```ts
{
  apiSpec: OpenAPIV3.Document | string;
  validateRequests?: boolean | ValidateRequestOpts;
  validateSecurity?: boolean | ValidateSecurityOpts;
  ignorePaths?: RegExp | Function;
  coerceTypes?: boolean | 'array';
  unknownFormats?: true | string[] | 'ignore';
  formats?: Format[];
  $refParser?: {
    mode: 'bundle' | 'dereference';
  };
  validateFormats?: false | 'fast' | 'full';
}
```

See detailed [documentation](https://github.com/cdimascio/express-openapi-validator#Advanced-Usage)

_**Note:** some options including `validateResponses`, `operationHandlers` are not yet supported for Fastify_

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

## Related Projects

- [express-openapi-validator](https://github.com/cdimascio/express-openapi-validator)
- [koa-openapi-validator](https://github.com/cdimascio/express-openapi-validator/tree/lerna-fastify/packages/koa-openapi-validator)

## License

MIT
