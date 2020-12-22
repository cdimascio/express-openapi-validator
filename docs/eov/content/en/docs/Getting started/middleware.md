---
title: 'Use the middleware'
linkTitle: 'use middleware'
weight: 2
description: >
  Use and configure the validator middleware
---

---

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
