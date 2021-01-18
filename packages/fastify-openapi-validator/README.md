# fastify-openapi-validator

## Install

```shell
npm install fastify-openapi-validator@4.12.0-beta.1
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
  fileUploader?: boolean | multer.Options;
  $refParser?: {
    mode: 'bundle' | 'dereference';
  };
  validateFormats?: false | 'fast' | 'full';
}
```

See detailed [documentation](https://github.com/cdimascio/express-openapi-validator#Advanced-Usage)

_**Note:** `validateResponses`, `operationHandlers` are not yet supported for Fastify_

## Example

```js
const openApiValidator = require('fastify-openapi-validator');
const { Pets } = require('./services');
const pets = new Pets();

function plugin(instance, options, next) {
  instance.register(openApiValidator, {
    apiSpec: './openapi.yml',
  });

  instance.get('/v1/pets', (request, reply) => {
    return pets.findAll(request.query);
  });

  instance.get('/v1/pets/:id', (request, reply) => {
    const pet = pets.findById(request.params.id);
    if (!pet) reply.code(404).send({ msg: 'not found' });
    return pet;
  });

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

## License

MIT
