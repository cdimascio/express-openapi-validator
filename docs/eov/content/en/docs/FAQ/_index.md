---
title: 'FAQ'
linkTitle: 'FAQ'
weight: 9
description: >
  Frequently Asked Questions
---

---

#### **Q:** What happened to the `securityHandlers` property?

**A:** In v3, `securityHandlers` have been replaced by `validateSecurity.handlers`. To use v3 security handlers, move your existing security handlers to the new property. No other change is required. Note that the v2 `securityHandlers` property is supported in v3, but deprecated

#### **Q**: What happened to the `multerOpts` property?

**A**: In v3, `multerOpts` have been replaced by `fileUploader`. In order to use the v3 `fileUploader`, move your multer options to `fileUploader` No other change is required. Note that the v2 `multerOpts` property is supported in v3, but deprecated

#### **Q:** I can disallow unknown query parameters with `allowUnknownQueryParameters: false`. How can disallow unknown body parameters?

**A:** Add `additionalProperties: false` when [describing](https://swagger.io/docs/specification/data-models/keywords/) e.g a `requestBody` to ensure that additional properties are not allowed. For example:

#### **Q:** I upgraded from from v2 to v3 and validation no longer works. How do I fix it?

**A**: In version 2.x.x, the `install` method was executed synchronously, in 3.x it's executed asynchronously. To get v2 behavior in v3, use the `installSync` method. See the [synchronous](#synchronous) section for details.

```yaml
Pet:
additionalProperties: false
required:
  - name
properties:
  name:
    type: string
  type:
    type: string
```

#### **Q:** Can I use `express-openapi-validator` with `swagger-ui-express`?

**A:** Yes. Be sure to `use` the `swagger-ui-express` serve middleware prior to installing `OpenApiValidator`. This will ensure that `swagger-ui-express` is able to fully prepare the spec before before OpenApiValidator attempts to use it. For example:

```javascript
const swaggerUi = require('swagger-ui-express')
const OpenApiValidator = require('express-openapi-validator')

...

app.use('/', swaggerUi.serve, swaggerUi.setup(documentation))

app.use(OpenApiValidator.middleware({
  apiSpec, // api spec JSON object
  //... other options
  }
}))
```

#### **Q:** I have a handler function defined on an `express.Router`. If i call `req.params` each param value has type `string`. If i define same handler function on an `express.Application`, each value in `req.params` is already coerced to the type declare in my spec. Why not coerce theseF values on an `express.Router`?

**A:** First, it's important to note that this behavior does not impact validation. The validator will validate against the type defined in your spec.

In order to modify the `req.params`, express requires that a param handler be registered e.g. `app.param(...)` or `router.param(...)`. Since `app` is available to middleware functions, the validator registers an `app.param` handler to coerce and modify the values of `req.params` to their declared types. Unfortunately, express does not provide a means to determine the current router from a middleware function, hence the validator is unable to register the same param handler on an express router. Ultimately, this means if your handler function is defined on `app`, the values of `req.params` will be coerced to their declared types. If your handler function is declare on an `express.Router`, the values of `req.params` values will be of type `string` (You must coerce them e.g. `parseInt(req.params.id)`).
