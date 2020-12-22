
---
title: "Documentation"
linkTitle: "Documentation"
weight: 20
menu:
  main:
    weight: 20
---

[![](https://travis-ci.org/cdimascio/express-openapi-validator.svg?branch=master)](#) [![](https://img.shields.io/npm/v/express-openapi-validator.svg)](https://www.npmjs.com/package/express-openapi-validator) [![](https://img.shields.io/npm/dm/express-openapi-validator?color=blue)](https://www.npmjs.com/package/express-openapi-validator) [![All Contributors](https://img.shields.io/badge/all_contributors-34-darkcyan.svg?style=flat)](#contributors) [![Coverage Status](https://coveralls.io/repos/github/cdimascio/express-openapi-validator/badge.svg?branch=master)](https://coveralls.io/github/cdimascio/express-openapi-validator?branch=master) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/1570a06f609345ddb237114bbd6ceed7)](https://www.codacy.com/manual/cdimascio/express-openapi-validator?utm_source=github.com&utm_medium=referral&utm_content=cdimascio/express-openapi-validator&utm_campaign=Badge_Grade) [![](https://img.shields.io/gitter/room/cdimascio-oss/community?color=%23eb205a)](https://gitter.im/cdimascio-oss/community) [![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/cdimascio/express-openapi-validator) [![](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

**An OpenApi validator for ExpressJS** that automatically validates **API** _**requests**_ and _**responses**_ using an **OpenAPI 3** specification.

<p align="center">
<img src="https://raw.githubusercontent.com/cdimascio/express-openapi-validator/master/assets/express-openapi-validator-logo-v2.png" width="600">
</p>

[🦋express-openapi-validator](https://github.com/cdimascio/express-openapi-validator) is an unopinionated library that integrates with new and existing API applications. express-openapi-validator lets you write code the way you want; it does not impose any coding convention or project layout. Simply, install the validator onto your express app, point it to your OpenAPI 3 specification, then define and implement routes the way you prefer. See an [example](#example-express-api-server).

**Features:**

- ✔️ request validation
- ✔️ response validation (json only)
- 👮 security validation / custom security functions
- 👽 3rd party / custom formats
- 🧵 optionally auto-map OpenAPI endpoints to Express handler functions
- ✂️ **\$ref** support; split specs over multiple files
- 🎈 file upload

[![GitHub stars](https://img.shields.io/github/stars/cdimascio/express-openapi-validator.svg?style=social&label=Star&maxAge=2592000)](https://GitHub.com/cdimascio/express-openapi-validator/stargazers/) [![Twitter URL](https://img.shields.io/twitter/url/https/github.com/cdimascio/express-openapi-validator.svg?style=social)](https://twitter.com/intent/tweet?text=Check%20out%20express-openapi-validator%20by%20%40CarmineDiMascio%20https%3A%2F%2Fgithub.com%2Fcdimascio%2Fexpress-openapi-validator%20%F0%9F%91%8D)


