# koa-openapi-validator

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
  fileUploader?: boolean | multer.Options;
  $refParser?: {
    mode: 'bundle' | 'dereference';
  };
  validateFormats?: false | 'fast' | 'full';
}
```
See detailed [documentation](https://github.com/cdimascio/express-openapi-validator#Advanced-Usage)

_**Note:** `validateResponses`, `operationHandlers` are not yet supported for Koa_

## Example

```js
const koa = require('koa');
const koaRouter = require('koa-router');
const OpenApiValidator = require('koa-openapi-validator');

const app = new koa();
const router = new koaRouter();

router.get('koala', '/v1/pets', (ctx) => {
  ctx.body = {
    message: 'Welcome! To the Koala Book of Everything!',
  };
});

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

app.use(
  OpenApiValidator.middleware({
    apiSpec: './openapi.yml',
  }),
);

app.use(router.routes()).use(router.allowedMethods());

app.listen(1234, () => console.log('running on port 1234'));
```

## License
MIT
