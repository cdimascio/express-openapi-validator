---
title: 'Getting Started'
linkTitle: 'Getting Started'
weight: 1
description: >
  Install the validator and setup the middleware
---

---

<!-- {{% pageinfo %}}
This is a placeholder page. Replace it with your own content.
{{% /pageinfo %}} -->

## Install

```shell
npm install express-openapi-validator
```

## Usage

### Import express-openapi-validator

```javascript
const OpenApiValidator = require('express-openapi-validator');
```

### Install the middleware

_Ensure express is configured with all relevant body parsers. Body parser middleware functions must be specified prior to this middleware. See an [example](/docs/code-examples/basic)_ 

```javascript
app.use(
  OpenApiValidator.middleware({
    apiSpec: './openapi.yaml',
    validateRequests: true, // (default)
    validateResponses: true, // false by default
  }),
);
```

### Register an error handler

_Register an error handler and configure the error shape. (This is also good place to log your errors)_

```javascript
app.use((err, req, res, next) => {
  // format error
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
  });
});
```

## [Example API Server](/docs/examples/basic/)

This [example](/docs/code-examples/basic/) provides source code to get started with express-openapi-validator

## [Usage Options](/docs/usage-options/)

See [Usage options](/docs/usage-options/) options to:

- inline api specs as JSON.
- configure request/response validation options
- customize authentication with security validation `handlers`.
- use OpenAPI 3.0.x 3rd party and custom formats.
- tweak the file upload configuration.
- ignore routes
- and more...
