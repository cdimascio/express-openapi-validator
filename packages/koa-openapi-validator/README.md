# 🦋 koa-openapi-validator

[![](https://travis-ci.org/cdimascio/express-openapi-validator.svg?branch=lerna-fastify)](#) [![](https://img.shields.io/npm/v/fastify-openapi-validator.svg)](https://www.npmjs.com/package/koa-openapi-validator) [![](https://img.shields.io/npm/dm/koa-openapi-validator?color=blue)](https://www.npmjs.com/package/koa-openapi-validator) [![All Contributors](https://img.shields.io/badge/all_contributors-42-darkcyan.svg?style=flat)](#contributors) [![Coverage Status](https://coveralls.io/repos/github/cdimascio/express-openapi-validator/badge.svg?branch=master)](https://coveralls.io/github/cdimascio/express-openapi-validator?branch=master) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/1570a06f609345ddb237114bbd6ceed7)](https://www.codacy.com/manual/cdimascio/express-openapi-validator?utm_source=github.com&utm_medium=referral&utm_content=cdimascio/express-openapi-validator&utm_campaign=Badge_Grade) [![](https://img.shields.io/gitter/room/cdimascio-oss/community?color=%23eb205a)](https://gitter.im/cdimascio-oss/community) [![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/cdimascio/express-openapi-validator) [![](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

**An OpenApi validator for Koa** that automatically validates **API** _**requests**_ using an **OpenAPI 3** specification.

## Install

```shell
npm install koa-openapi-validator@4.12.0-beta.1
```

## Usage

### Code

```js
const OpenApiValidator = require('koa-openapi-validator');
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

_**Note:** some options including `validateResponses`, `operationHandlers` are not yet supported for Koa_

## Example

```js
const koa = require('koa');
const koaRouter = require('koa-router');
// 1. require the package
const OpenApiValidator = require('koa-openapi-validator');

const app = new koa();
const router = new koaRouter();

// 2. define a route
router.get('koala', '/v1/pets', (ctx) => {
  ctx.body = {
    message: 'Welcome! To the Koala Book of Everything!',
  };
});

// 3. define error middleware and an error response
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    // console.error(err);
    ctx.status = err.statusCode || err.status || 500;
    ctx.body = {
      message: err.message,
      errors: err.errors ?? [],
    };
  }
});

// 4. configure the middleware (see options)
app.use(
  OpenApiValidator.middleware({
    apiSpec: './openapi.yml',
  }),
);

app.use(router.routes()).use(router.allowedMethods());

app.listen(1234, () => console.log('running on port 1234'));
```

## Related Projects

- [express-openapi-validator](https://github.com/cdimascio/express-openapi-validator)
- [fastify-openapi-validator](https://github.com/cdimascio/express-openapi-validator/tree/lerna-fastify/packages/fastify-openapi-validator)

## License

MIT
