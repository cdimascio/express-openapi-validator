---
title: 'fileUploader'
linkTitle: 'fileUploader'
weight: 10
description: >
  **(optional)**
  <br>
  Specifies the options to passthrough to multer. express-openapi-validator uses multer to handle file uploads
---

---

Specifies the options to passthrough to multer. express-openapi-validator uses multer to handle file uploads. see [multer opts](https://github.com/expressjs/multer)

- `true` (**default**) - enables multer and provides simple file(s) upload capabilities
- `false` - disables file upload capability. Upload capabilities may be provided by the user
- `{...}` - multer options to be passed-through to multer. see [multer opts](https://github.com/expressjs/multer) for possible options

  e.g.

  ```javascript
  fileUploader: {
    dest: 'uploads/';
  }
  ```
