---
title: 'API Server (using Operation Handlers)'
linkTitle: 'Operation Handlers'
weight: 2
description: >
  Create a API server that automatically maps paths defined in an OpenAPI 3 spec to an Express handler function
---

---

Don't want to manually map your OpenAPI endpoints to Express handler functions? express-openapi-validator can do it for you, automatically!

Use express-openapi-validator's OpenAPI `x-eov-operation-*` vendor extensions. See a full example with [source code](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/3-eov-operations) and an [OpenAPI spec](https://github.com/cdimascio/express-openapi-validator/blob/master/examples/3-eov-operations/api.yaml#L39)

**Here's the gist**

- First, specifiy the `operationHandlers` option to set the base directory that contains your operation handler files.

```javascript
app.use(
  OpenApiValidator.middleware({
    apiSpec,
    operationHandlers: path.join(__dirname),
  }),
);
```

- Next, use the `x-eov-operation-id` OpenAPI vendor extension or `operationId` to specify the id of operation handler to invoke.

```yaml
/ping:
  get:
    # operationId: ping
    x-eov-operation-id: ping
```

- Next, use the `x-eov-operation-handler` OpenAPI vendor extension to specify a path (relative to `operationHandlers`) to the module that contains the handler for this operation.

```yaml
/ping:
  get:
    x-eov-operation-id: ping
    x-eov-operation-handler: routes/ping # no .js or .ts extension
```

- Finally, create the express handler module e.g. `routes/ping.js`

```javascript
module.exports = {
  // the express handler implementaiton for ping
  ping: (req, res) => res.status(200).send('pong'),
};
```

**Note:** A file may contain _one_ or _many_ handlers.

Below are some code snippets:

**app.js**

```javascript
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const logger = require('morgan');
const http = require('http');
const OpenApiValidator = require('express-openapi-validator');

const port = 3000;
const app = express();
const apiSpec = path.join(__dirname, 'api.yaml');

// 1. Install bodyParsers for the request types your API will support
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());
app.use(bodyParser.json());

app.use(logger('dev'));

app.use('/spec', express.static(apiSpec));

//  2. Install the OpenApiValidator on your express app
app.use(
  OpenApiValidator.middleware({
    apiSpec,
    validateResponses: true, // default false
    // 3. Provide the base path to the operation handlers directory
    operationHandlers: path.join(__dirname), // default false
  }),
);

// 4. Woah sweet! With auto-wired operation handlers, I don't have to declare my routes!
//    See api.yaml for x-eov-* vendor extensions

// 5. Create a custom error handler
app.use((err, req, res, next) => {
  // format errors
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
  });
});

http.createServer(app).listen(port);
console.log(`Listening on port ${port}`);

module.exports = app;
```

**api.yaml**

```yaml
/ping:
  get:
    description: |
      ping then pong!
    # OpenAPI's operationId may be used to to specify the operation id
    operationId: ping
    # x-eov-operation-id may be used to specify the operation id
    # Used when operationId is omiited. Overrides operationId when both are specified
    x-eov-operation-id: ping
    # specifies the path to the operation handler.
    # the path is relative to the operationHandlers option
    # e.g. operations/base/path/routes/ping.js
    x-eov-operation-handler: routes/ping
    responses:
      '200':
        description: OK
        # ...
```

**ping.js**

```javascript
module.exports = {
  // ping must match operationId or x-eov-operation-id above
  // note that x-eov-operation-id overrides operationId
  ping: (req, res) => res.status(200).send('pong'),
};
```
