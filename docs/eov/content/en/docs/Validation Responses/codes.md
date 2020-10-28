---
title: 'status codes'
linkTitle: 'status codes'
weight: 3
date: 2017-01-05
description: >
  Validation response codes
---
---


### Request validation codes
| | status                         | when                                                                                              |
|-| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| | `400` (bad request)            | a validation error is encountered                                                                 |
| | `401` (unauthorized)           | a security / authentication errors is encountered e.g. missing api-key, Authorization header, etc |
| | `404` (not found)              | a path is not found i.e. not declared in the API spec                                             |
| | `405` (method not allowed)     | a path is declared in the API spec, but a no schema is provided for the method                    |
| | `415` (unsupported media type) | the server refuses to accept the request because the payload format is in an unsupported format   |
|+| `500`  (internal server error) | a response validation error is encountered by the validator |
<br>

_+ Requires the option, `validateResponses: true`_

---
-