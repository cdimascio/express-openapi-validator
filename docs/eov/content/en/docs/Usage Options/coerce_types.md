---
title: 'coerceTypes'
linkTitle: 'coerceTypes'

description: >
  **(optional - _deprecated_)**
    <br>
    Determines whether the validator should coerce value types to match the type defined in the OpenAPI spec.
---

---

- `true` (**default**) - coerce scalar data types.
- `"array"` - in addition to coercions between scalar types, coerce scalar data to an array with one element and vice versa (as required by the schema).
