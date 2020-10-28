---
title: 'ignorePaths'
linkTitle: 'ignorePaths'
weight: 8
description: >
  **(optional)**
  <br>
  Defines a regular expression that determines whether a path(s) should be ignored. Paths that matches the regular expression will be ignored by the validator.
---

---

The following ignores any path that ends in `/pets` e.g. `/v1/pets`

```
ignorePaths: /.*\/pets$/
```
