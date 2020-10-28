---
title: 'apiSpec'
linkTitle: 'apiSpec'
weight: 1
description: >
  **(required)** 
  <br>
  Specifies the path to an OpenAPI 3 specification or a JSON object representing the OpenAPI 3 specificiation
---

```javascript
apiSpec: './path/to/my-openapi-spec.yaml';
```

or

```javascript
  apiSpec: {
  openapi: '3.0.1',
  info: {...},
  servers: [...],
  paths: {...},
  components: {
    responses: {...},
    schemas: {...}
  }
}
```
