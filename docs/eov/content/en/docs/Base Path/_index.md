
---
title: "The Base URL"
linkTitle: "Base URL"
weight: 4
---
---

The validator will only validate requests, securities, and responses that are under
the server's [base URL](https://spec.openapis.org/oas/v3.0.0.html#serverVariableObject).

This is useful for those times when the API and frontend are being served by the same
application. ([More detail about the base URL](https://swagger.io/docs/specification/api-host-and-base-path/).)

```yaml
servers:
  - url: https://api.example.com/v1
```

The validation applies to all paths defined under this base URL. Routes in your app
that are \_not_se URL—such as pages—will not be validated.

| URL                                  | Validated?                 |
| :----------------------------------- | :------------------------- |
| `https://api.example.com/v1/users`   | :white_check_mark:         |
| `https://api.example.com/index.html` | no; not under the base URL |

In some cases, it may be necessary to _**skip validation** for paths **under the base url**_. To do this, use the [`ignorePaths`](#ignorepaths) option.
