# express-middelware-openapi

![](https://travis-ci.org/cdimascio/express-middleware-openapi.svg?branch=master) ![](https://img.shields.io/badge/license-MIT-blue.svg)

Automatically validate API requests using an OpenAPI 3.0 specification, 

🚧👷under construction 🚧👷


## Install

Try this pre-release alpha version:

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
