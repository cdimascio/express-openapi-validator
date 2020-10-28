---
title: 'validateRequests'
linkTitle: 'validateRequests'
weight: 2
description: >
  **(optional)**
  <br>
  Determines whether the validator should validate requests.
---

---

- `true` (**default**) - validate requests.
- `false` - do not validate requests.
- `{ ... }` - validate requests with options

  **allowUnknownQueryParameters:**

  - `true` - enables unknown/undeclared query parameters to pass validation
  - `false` - (**default**) fail validation if an unknown query parameter is present

  For example:

  ```javascript
  validateRequests: {
    allowUnknownQueryParameters: true;
  }
  ```