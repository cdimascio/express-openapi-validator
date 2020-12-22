---
title: 'refParser'
linkTitle: 'refParser'
weight: 9
description: >
  **(optional)**
  <br>
  Determines how JSON schema references are resolved by the internal [json-schema-ref-parser](https://github.com/APIDevTools/json-schema-ref-parser).
---

---

Generally, the default mode, `bundle` is sufficient, however if you use [escape characters in \$refs](https://swagger.io/docs/specification/using-ref/), `dereference` is necessary.

- `bundle` **(default)** - Bundles all referenced files/URLs into a single schema that only has internal $ref pointers. This eliminates the risk of circular references, but does not handle escaped characters in $refs.
- `dereference` - Dereferences all $ref pointers in the JSON Schema, replacing each reference with its resolved value. Introduces risk of circular $refs. Handles [escape characters in \$refs](https://swagger.io/docs/specification/using-ref/))

See this [issue](https://github.com/APIDevTools/json-schema-ref-parser/issues/101#issuecomment-421755168) for more information.

e.g.

```javascript
$refParser: {
  mode: 'bundle';
}
```
