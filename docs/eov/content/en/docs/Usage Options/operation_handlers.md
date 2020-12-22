---
title: 'operationHandlers'
linkTitle: 'operationHandlers'
weight: 7
description: >
  **(optional)**
  <br>
  Defines the base directory for operation handlers
---

---

**`operationHandlers`** are used in conjunction with express-openapi-validator's OpenAPI vendor extensions, `x-eov-operation-id`, `x-eov-operation-handler` and OpenAPI's `operationId`. See [example](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/3-eov-operations).

Additionally, if you want to change how modules are resolved e.g. use dot deliminted operation ids e.g. `path.to.module.myFunction`, you may optionally add a custom `resolver`. See [documentation and example](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/5-custom-operation-resolver)

- `string` - the base directory containing operation handlers
- `false` - (default) disable auto wired operation handlers
- `{ ... }` - specifies a base directory and optionally a custom resolver

  **handlers:**

  For example:

  ```javascript
  operationHandlers: {
    basePath: __dirname,
    resolver: function (modulePath, route): express.RequestHandler {
      ///...
    }
  }
  ```

```
operationHandlers: 'operations/base/path'
```

**Note** that the `x-eov-operation-handler` OpenAPI vendor extension specifies a path relative to `operationHandlers`. Thus if `operationHandlers` is `/handlers` and an `x-eov-operation-handler` has path `routes/ping`, then the handler file `/handlers/routes/ping.js` (or `ts`) is used.

Complete example [here](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/3-eov-operations)

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

**routes/ping.js**

`x-eov-operation-handler` specifies the path to this handlers file, `ping.js`

`x-eov-operation-id` (or `operationId`) specifies operation handler's key e.g. `ping`

```javascript
module.exports = {
  ping: (req, res) => res.status(200).send('pong'),
};
```