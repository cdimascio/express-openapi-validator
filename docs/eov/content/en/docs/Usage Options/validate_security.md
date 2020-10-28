---
title: 'validateSecurity'
linkTitle: 'validateSecurity'
weight: 4
description: >
  **(optional)**
  <br>
  Determines whether the validator should validate securities e.g. apikey, basic, oauth2, openid, etc
---

---

- `true` (**default**) - validate security
- `false` - do not validate security
- `{ ... }` - validate security with `handlers`. See [Security handlers](#security-handlers) doc.

  **handlers:**

  For example:

  ```javascript
  validateSecurity: {
    handlers: {
      ApiKeyAuth: function(req, scopes, schema) {
        console.log('apikey handler throws custom error', scopes, schema);
        throw Error('my message');
      },
    }
  }
  ```

## Security handlers

> **Note:** security `handlers` are an optional component. security `handlers` provide a convenience, whereby the request, declared scopes, and the security schema itself are provided as parameters to each security `handlers` callback that you define. The code you write in each callback can then perform authentication and authorization checks. **_Note that the same can be achieved using standard Express middleware_. The difference** is that security `handlers` provide you the OpenAPI schema data described in your specification\_. Ulimately, this means, you don't have to duplicate that information in your code.

> All in all, security `handlers` are purely optional and are provided as a convenience.

Security handlers specify a set of custom security handlers to be used to validate security i.e. authentication and authorization. If a security `handlers` object is specified, a handler must be defined for **_all_** securities. If security `handlers are **_not_** specified, a default handler is always used. The default handler will validate against the OpenAPI spec, then call the next middleware.

If security `handlers` are specified, the validator will validate against the OpenAPI spec, then call the security handler providing it the Express request, the security scopes, and the security schema object.

- security `handlers` is an object that maps security keys to security handler functions. Each security key must correspond to `securityScheme` name.
  The `validateSecurity.handlers` object signature is as follows:

  ```typescript
  {
    validateSecurity: {
      handlers: {
        [securityKey]: function(
          req: Express.Request,
          scopes: string[],
          schema: SecuritySchemeObject
        ): void,
      }
    }
  }
  ```

  [SecuritySchemeObject](https://github.com/cdimascio/express-openapi-validator/blob/master/src/framework/types.ts#L269)

  **For example:**

  ```javascript
  validateSecurity: {
    handlers: {
      ApiKeyAuth: function(req, scopes, schema) {
        console.log('apikey handler throws custom error', scopes, schema);
        throw Error('my message');
      },
    }
  }
  ```

The _express-openapi-validator_ performs a basic validation pass prior to delegating to security handlers. If basic validation passes, security handler function(s) are invoked.

In order to signal an auth failure, the security handler function **must** either:

1. `throw { status: 403, message: 'forbidden' }`
2. `throw Error('optional message')`
3. `return false`
4. return a promise which resolves to `false` e.g `Promise.resolve(false)`
5. return a promise rejection e.g.
   - `Promise.reject({ status: 401, message: 'yikes' });`
   - `Promise.reject(Error('optional 'message')`
   - `Promise.reject(false)`

Note: error status `401` is returned, unless option `i.` above is used

**Some examples:**

```javascript
validateSecurity: {
  handlers: {
    ApiKeyAuth: (req, scopes, schema) => {
      throw Error('my message');
    },
    OpenID: async (req, scopes, schema) => {
      throw { status: 403, message: 'forbidden' }
    },
    BasicAuth: (req, scopes, schema) => {
      return Promise.resolve(false);
    },
    ...
  }
}
```

In order to grant authz, the handler function **must** either:

- `return true`
- return a promise which resolves to `true`

**Some examples**

```javascript
validateSecurity: {
  handlers: {
    ApiKeyAuth: (req, scopes, schema) => {
      return true;
    },
    BearerAuth: async (req, scopes, schema) => {
      return true;
    },
    ...
  }
}
```

Each security `handlers`' `securityKey` must match a `components/securitySchemes` property

```yaml
components:
  securitySchemes:
    ApiKeyAuth: # <-- Note this name must be used as the name handler function property
      type: apiKey
      in: header
      name: X-API-Key
```

See [OpenAPI 3](https://swagger.io/docs/specification/authentication/) authentication for `securityScheme` and `security` documentation
See [examples](https://github.com/cdimascio/express-openapi-validator/blob/security/test/security.spec.ts#L17) from unit tests
