---
title: 'Usage Options'
linkTitle: 'Usage Options'
weight: 2
date: 2017-01-05
description: >
  Configure express-openapi-validator to suit your needs.
---
  
---

## Options

express-openapi validator provides a good deal of flexibility via its options.

```javascript
OpenApiValidator.middleware({
  apiSpec: './openapi.yaml',
  validateRequests: true,
  validateResponses: true,
  validateFormats: 'fast',
  validateSecurity: {
    handlers: {
      ApiKeyAuth: (req, scopes, schema) => {
        throw { status: 401, message: 'sorry' }
      }
    }
  },
  operationHandlers: false | 'operations/base/path' | { ... },
  ignorePaths: /.*\/pets$/,
  unknownFormats: ['phone-number', 'uuid'],
  fileUploader: { ... } | true | false,
  $refParser: {
    mode: 'bundle'
  }
});
```

## Options Details