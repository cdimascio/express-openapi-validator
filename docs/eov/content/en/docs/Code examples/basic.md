---
title: 'API Server (General)'
linkTitle: 'General'
weight: 1
description: >
  Create an API server that validates requests, responses, and securities against an OpenAPI 3 spec.
---

---

## [Example Express API Server](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/1-standard)

The following demonstrates how to use express-openapi-validator to auto validate requests and responses. It also includes file upload!

See the complete [source code](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/1-standard) and [OpenAPI spec](https://github.com/cdimascio/express-openapi-validator/blob/master/examples/1-standard/api.yaml) for the example below:

```javascript
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const app = express();

// 1. Import the express-openapi-validator library
const OpenApiValidator = require('express-openapi-validator');

// 2. Set up body parsers for the request body types you expect
//    Must be specified prior to endpoints in 5.
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(bodyParser.urlencoded({ extended: false }));

// 3. (optionally) Serve the OpenAPI spec
const spec = path.join(__dirname, 'api.yaml');
app.use('/spec', express.static(spec));

// 4. Install the OpenApiValidator onto your express app
app.use(
  OpenApiValidator.middleware({
    apiSpec: './api.yaml',
    validateResponses: true, // <-- to validate responses
    // unknownFormats: ['my-format'] // <-- to provide custom formats
  }),
);

// 5. Define routes using Express
app.get('/v1/pets', function (req, res, next) {
  res.json([
    { id: 1, type: 'cat', name: 'max' },
    { id: 2, type: 'cat', name: 'mini' },
  ]);
});

app.post('/v1/pets', function (req, res, next) {
  res.json({ name: 'sparky', type: 'dog' });
});

app.get('/v1/pets/:id', function (req, res, next) {
  res.json({ id: req.params.id, type: 'dog', name: 'sparky' });
});

// 5a. Define route(s) to upload file(s)
app.post('/v1/pets/:id/photos', function (req, res, next) {
  // files are found in req.files
  // non-file multipart params can be found as such: req.body['my-param']
  res.json({
    files_metadata: req.files.map((f) => ({
      originalname: f.originalname,
      encoding: f.encoding,
      mimetype: f.mimetype,
      // Buffer of file conents
      buffer: f.buffer,
    })),
  });
});

// 6. Create an Express error handler
app.use((err, req, res, next) => {
  // 7. Customize errors
  console.error(err); // dump error to console for debug
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
  });
});

http.createServer(app).listen(3000);
```
