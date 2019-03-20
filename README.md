# express-middelware-openapi

under construction


## Install

```shell
npm i express-middleware-openapi
```

## Usage

see [app.ts](test/app.ts) for an example.

```
app.use(
  new OpenApiMiddleware({
    apiSpecPath: './openapi.yaml',
    validate: true, // should be default
    enableObjectCoercion: true, // should be the default
  }).middleware()
);
```
