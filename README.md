# express-middleware-openapi

![](https://travis-ci.org/cdimascio/express-middleware-openapi.svg?branch=master) ![](https://img.shields.io/badge/license-MIT-blue.svg)

ExpressJs middleware that automatically validates API requests using an OpenAPI 3.0 specification,

<p align="center">
  <br>
🚧👷<i>under construction</i> 🚧👷
</p>

## Install

Try this pre-release alpha version:

```shell
npm i express-middleware-openapi
```

## Usage

see [app.ts](test/app.ts) for an example.

```
new OpenApiMiddleware(app, {
  apiSpecPath: './openapi.yaml',
  validateApiDoc: true, // is the the default
  enableObjectCoercion: true, // should be default
}).install();
```
