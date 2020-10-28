---
title: 'validateResponses'
linkTitle: 'validateResponses'
weight: 3
description: >
  **(optional)**
  <br>
  Determines whether the validator should validate responses (and its options).
---

---

- `true` - validate responses in 'strict' mode i.e. responses MUST match the schema.
- `false` (**default**) - do not validate responses
- `{ ... }` - validate responses with options

  **removeAdditional:**

  - `"failing"` - additional properties that fail schema validation are automatically removed from the response.

  For example:

  ```javascript
  validateResponses: {
    removeAdditional: 'failing';
  }
  ```
