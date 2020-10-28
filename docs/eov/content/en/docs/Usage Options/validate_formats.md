---
title: 'validateFormats'
linkTitle: 'validateFormats'
weight: 5
description: >
  **(optional)**
  <br>
  Specifies the strictness of validation of string formats e.g. dates.
---

---

- `"fast"` (**default**) - only validate syntax, but not semantics. E.g. `2010-13-30T23:12:35Z` will pass validation eventhough it contains month 13.
- `"full"` - validate both syntax and semantics. Illegal dates will not pass.
- `false` - do not validate formats at all.
