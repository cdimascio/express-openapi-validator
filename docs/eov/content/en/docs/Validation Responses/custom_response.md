---
title: 'customize the error response'
linkTitle: 'customize errors'
weight: 5
date: 2017-01-05
description: >
  Validation response codes
---
---

In order to customize the validation response error, add error handler middleware.

```javascript
app.use((err, req, res, next) => {
  // format error
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
  });
});
```