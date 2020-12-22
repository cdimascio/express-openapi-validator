---
title: 'Upgrading from 3.x'
linkTitle: 'Upgrading'
weight: 7
description: >
  Upgrading from 3.x, here's what you need to know
---

---

If migrating from v3 to v4, you notice that the validator is installed very differently.

In v4.x.x, the validator is installed as standard connect middleware using `app.use(...)` and/or `router.use(...)`.  

```javascript
app.use(
  OpenApiValidator.middleware({
    apiSpec: './openapi.yaml'
  }),
);
```

This differs from the v3.x.x installation which did not use the standard connect middleware mechanism. Instead, it required the use of one of two `install` method(s) i.e. `install(...)` or `installSync(...)`. The `install` methods no longer exist in v4 as its install via standard connect middleware.

```javascript
await new OpenApiValidator({
  apiSpec: './test/resources/openapi.yaml'
}).install(app);
```