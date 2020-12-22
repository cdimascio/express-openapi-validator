---
title: 'unknownFormats'
linkTitle: 'unknownFormats'
weight: 6
description: >
  (options)
  <br>
  Define custom formats ands how the validator should behave if an unknown or custom format is encountered.
---

---

- `true` **(default)** - When an unknown format is encountered, the validator will report a 400 error.
- `[string]` **_(recommended for unknown formats)_** - An array of unknown format names that will be ignored by the validator. This option can be used to allow usage of third party schemas with format(s), but still fail if another unknown format is used.
  e.g.

  ```javascript
  unknownFormats: ['phone-number', 'uuid'];
  ```
