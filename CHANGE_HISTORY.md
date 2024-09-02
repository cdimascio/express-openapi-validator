##  (2024-08-31)

* Change AJV allErrors default and support user setting (#955) ([392f1dd](https://github.com/cdimascio/express-openapi-validator/commit/392f1dd)), closes [#955](https://github.com/cdimascio/express-openapi-validator/issues/955) [#954](https://github.com/cdimascio/express-openapi-validator/issues/954)
* Update README.md ([f20b1c9](https://github.com/cdimascio/express-openapi-validator/commit/f20b1c9))
* Use lenient resolver type (#956) ([826ba62](https://github.com/cdimascio/express-openapi-validator/commit/826ba62)), closes [#956](https://github.com/cdimascio/express-openapi-validator/issues/956) [#921](https://github.com/cdimascio/express-openapi-validator/issues/921) [#952](https://github.com/cdimascio/express-openapi-validator/issues/952)


### breaking change

By default, request and response validation now stops after the first failure. Only one error will be reported even when multiple may exist. This follows best practices from AJV:
- [Security risks of trusted schemas](https://ajv.js.org/security.html#security-risks-of-trusted-schemas)
- [`allErrors` option](https://ajv.js.org/options.html#allerrors)

To report all validation errors (only recommended in development), option `allErrors` can be set in options `validateRequests` and/or `validateResponses`. For example:

```ts
app.use(
  OpenApiValidator.middleware({
    apiSpec: 'path/to/openapi.json',
    validateRequests: {
      allErrors: true,
    },
    validateResponses: {
      allErrors: true,
    },
  })
);
```


##  (2024-08-24)

* chore(deps-dev): bump @babel/traverse in /examples/9-nestjs (#948) ([edd054f](https://github.com/cdimascio/express-openapi-validator/commit/edd054f)), closes [#948](https://github.com/cdimascio/express-openapi-validator/issues/948)
* chore(deps-dev): bump braces in /examples/8-top-level-discriminator (#929) ([e3a9526](https://github.com/cdimascio/express-openapi-validator/commit/e3a9526)), closes [#929](https://github.com/cdimascio/express-openapi-validator/issues/929)
* chore(deps-dev): bump ws from 7.5.5 to 7.5.10 in /examples/9-nestjs (#930) ([9d5895b](https://github.com/cdimascio/express-openapi-validator/commit/9d5895b)), closes [#930](https://github.com/cdimascio/express-openapi-validator/issues/930)
* fix: correct security schema logic for OR verification (#946) ([2265a10](https://github.com/cdimascio/express-openapi-validator/commit/2265a10)), closes [#946](https://github.com/cdimascio/express-openapi-validator/issues/946)
* fix: upgrade @apidevtools/json-schema-ref-parser from 11.6.4 to 11.7.0 (#947) ([ea4129c](https://github.com/cdimascio/express-openapi-validator/commit/ea4129c)), closes [#947](https://github.com/cdimascio/express-openapi-validator/issues/947)
* fix: upgrade ajv from 8.15.0 to 8.17.1 (#945) ([087d8f7](https://github.com/cdimascio/express-openapi-validator/commit/087d8f7)), closes [#945](https://github.com/cdimascio/express-openapi-validator/issues/945)
* fix: upgrade express-openapi-validator from 5.1.6 to 5.2.0 (#944) ([f022d21](https://github.com/cdimascio/express-openapi-validator/commit/f022d21)), closes [#944](https://github.com/cdimascio/express-openapi-validator/issues/944)
* version 5.3.2 ([4428922](https://github.com/cdimascio/express-openapi-validator/commit/4428922))



##  (2024-08-24)

* fix: correct security schema logic for OR verification (#946) ([2265a10](https://github.com/cdimascio/express-openapi-validator/commit/2265a10)), closes [#946](https://github.com/cdimascio/express-openapi-validator/issues/946)
* fix: upgrade express-openapi-validator from 5.1.6 to 5.2.0 (#944) ([f022d21](https://github.com/cdimascio/express-openapi-validator/commit/f022d21)), closes [#944](https://github.com/cdimascio/express-openapi-validator/issues/944)



##  (2024-08-05)

* Stripped query params for req.url branch arm (#942) ([26d06c4](https://github.com/cdimascio/express-openapi-validator/commit/26d06c4)), closes [#942](https://github.com/cdimascio/express-openapi-validator/issues/942)
* Update LICENSE ([20727ff](https://github.com/cdimascio/express-openapi-validator/commit/20727ff))
* version 5.2.1 ([aace73c](https://github.com/cdimascio/express-openapi-validator/commit/aace73c))
* FIX: issue #917 (#935) ([8e66d3f](https://github.com/cdimascio/express-openapi-validator/commit/8e66d3f)), closes [#917](https://github.com/cdimascio/express-openapi-validator/issues/917) [#935](https://github.com/cdimascio/express-openapi-validator/issues/935)
* fix: upgrade @apidevtools/json-schema-ref-parser from 11.6.2 to 11.6.4 (#937) ([f148eeb](https://github.com/cdimascio/express-openapi-validator/commit/f148eeb)), closes [#937](https://github.com/cdimascio/express-openapi-validator/issues/937)
* fix: upgrade ajv from 8.14.0 to 8.15.0 (#938) ([a1ea81f](https://github.com/cdimascio/express-openapi-validator/commit/a1ea81f)), closes [#938](https://github.com/cdimascio/express-openapi-validator/issues/938)
* fix: upgrade express-openapi-validator from 5.1.6 to 5.2.0 (#936) ([2d75db4](https://github.com/cdimascio/express-openapi-validator/commit/2d75db4)), closes [#936](https://github.com/cdimascio/express-openapi-validator/issues/936)
* chore(deps-dev): bump braces from 3.0.2 to 3.0.3 (#928) ([093bd3c](https://github.com/cdimascio/express-openapi-validator/commit/093bd3c)), closes [#928](https://github.com/cdimascio/express-openapi-validator/issues/928)



##  (2024-06-02)

* Add `express` as peer dependency (#907) ([4e8bc84](https://github.com/cdimascio/express-openapi-validator/commit/4e8bc84)), closes [#907](https://github.com/cdimascio/express-openapi-validator/issues/907)
* Add multipart fix when does not exist any body (#905) ([5c98d17](https://github.com/cdimascio/express-openapi-validator/commit/5c98d17)), closes [#905](https://github.com/cdimascio/express-openapi-validator/issues/905)
* add reponse serializer tests for arrays ([bbbd160](https://github.com/cdimascio/express-openapi-validator/commit/bbbd160))
* pass coerceTypes through (#809) ([8f7c678](https://github.com/cdimascio/express-openapi-validator/commit/8f7c678)), closes [#809](https://github.com/cdimascio/express-openapi-validator/issues/809)
* Support async operation handler resolver (#921) ([a4a7175](https://github.com/cdimascio/express-openapi-validator/commit/a4a7175)), closes [#921](https://github.com/cdimascio/express-openapi-validator/issues/921)
* upgrade ajv ([a708132](https://github.com/cdimascio/express-openapi-validator/commit/a708132))
* upgrade example 3 ([43cccc8](https://github.com/cdimascio/express-openapi-validator/commit/43cccc8))
* upgrade example 4 ([255f20f](https://github.com/cdimascio/express-openapi-validator/commit/255f20f))
* v5.2.0 ([42cb3ab](https://github.com/cdimascio/express-openapi-validator/commit/42cb3ab))
* chore: apiSpec may be const literal (#854) ([e35a07c](https://github.com/cdimascio/express-openapi-validator/commit/e35a07c)), closes [#854](https://github.com/cdimascio/express-openapi-validator/issues/854)
* chore(dependencies): bump @apidevtools/json-schema-ref-parser to 11.6.2 to prevent vulnerability (#9 ([61ff0cf](https://github.com/cdimascio/express-openapi-validator/commit/61ff0cf)), closes [#918](https://github.com/cdimascio/express-openapi-validator/issues/918)
* chore(deps-dev): bump @babel/traverse (#924) ([5a04ea9](https://github.com/cdimascio/express-openapi-validator/commit/5a04ea9)), closes [#924](https://github.com/cdimascio/express-openapi-validator/issues/924)
* chore(deps): bump axios, @nestjs/common, @nestjs/core, @nestjs/platform-express and @nestjs/testing  ([b77150f](https://github.com/cdimascio/express-openapi-validator/commit/b77150f)), closes [#925](https://github.com/cdimascio/express-openapi-validator/issues/925)
* chore(deps): bump webpack and @nestjs/cli in /examples/9-nestjs (#831) ([c0c5f4c](https://github.com/cdimascio/express-openapi-validator/commit/c0c5f4c)), closes [#831](https://github.com/cdimascio/express-openapi-validator/issues/831)
* fix: examples/4-eov-operations-babel/package.json & examples/4-eov-operations-babel/package-lock.jso ([87d173b](https://github.com/cdimascio/express-openapi-validator/commit/87d173b)), closes [#911](https://github.com/cdimascio/express-openapi-validator/issues/911)
* fix: package.json & package-lock.json to reduce vulnerabilities (#920) ([898ceb7](https://github.com/cdimascio/express-openapi-validator/commit/898ceb7)), closes [#920](https://github.com/cdimascio/express-openapi-validator/issues/920)
* fix: upgrade @types/multer from 1.4.7 to 1.4.11 (#897) ([a7d67e7](https://github.com/cdimascio/express-openapi-validator/commit/a7d67e7)), closes [#897](https://github.com/cdimascio/express-openapi-validator/issues/897)
* fix: upgrade path-to-regexp from 6.2.0 to 6.2.2 (#914) ([bce2d6a](https://github.com/cdimascio/express-openapi-validator/commit/bce2d6a)), closes [#914](https://github.com/cdimascio/express-openapi-validator/issues/914)



## <small>5.1.6 (2024-02-11)</small>

* Fixes for 881 - multiple specs w/validateRequests fail (#903) ([766806b](https://github.com/cdimascio/express-openapi-validator/commit/766806b)), closes [#903](https://github.com/cdimascio/express-openapi-validator/issues/903)



## <small>5.1.5 (2024-02-10)</small>

* fixes write-only tests ([8c53e58](https://github.com/cdimascio/express-openapi-validator/commit/8c53e58))
* Support writeOnly + required combination #149 (#756) ([4f16ed2](https://github.com/cdimascio/express-openapi-validator/commit/4f16ed2)), closes [#149](https://github.com/cdimascio/express-openapi-validator/issues/149) [#756](https://github.com/cdimascio/express-openapi-validator/issues/756)
* v5.1.5 ([708f2f5](https://github.com/cdimascio/express-openapi-validator/commit/708f2f5))



## <small>5.1.4 (2024-02-09)</small>

* add cookies to examples 1 and 2 (#891) ([2c95d5b](https://github.com/cdimascio/express-openapi-validator/commit/2c95d5b)), closes [#891](https://github.com/cdimascio/express-openapi-validator/issues/891)
* Direct example broken link to the guide ([00a9c8f](https://github.com/cdimascio/express-openapi-validator/commit/00a9c8f))
* fixes badging for build and test ([631fb7b](https://github.com/cdimascio/express-openapi-validator/commit/631fb7b))
* npm audit fix (#892) ([2977c0a](https://github.com/cdimascio/express-openapi-validator/commit/2977c0a)), closes [#892](https://github.com/cdimascio/express-openapi-validator/issues/892)
* Remove read only and write only fields (#895) ([97617fd](https://github.com/cdimascio/express-openapi-validator/commit/97617fd)), closes [#895](https://github.com/cdimascio/express-openapi-validator/issues/895) [#627](https://github.com/cdimascio/express-openapi-validator/issues/627)
* removes lodash.uniq and lodash.zipobject dependencies (#893) ([1206802](https://github.com/cdimascio/express-openapi-validator/commit/1206802)), closes [#893](https://github.com/cdimascio/express-openapi-validator/issues/893)
* Update CONTRIBUTING.md ([6d67169](https://github.com/cdimascio/express-openapi-validator/commit/6d67169))
* Update README.md ([dffda28](https://github.com/cdimascio/express-openapi-validator/commit/dffda28))
* Update README.md ([bdd0d79](https://github.com/cdimascio/express-openapi-validator/commit/bdd0d79))
* Update README.md (#896) ([bb66916](https://github.com/cdimascio/express-openapi-validator/commit/bb66916)), closes [#896](https://github.com/cdimascio/express-openapi-validator/issues/896)
* v5.1.4 ([b3d7483](https://github.com/cdimascio/express-openapi-validator/commit/b3d7483))
* v5.1.4 ([509fa22](https://github.com/cdimascio/express-openapi-validator/commit/509fa22))
* fix: #887 allow multiple params with wildcard (#898) ([2d33d0a](https://github.com/cdimascio/express-openapi-validator/commit/2d33d0a)), closes [#887](https://github.com/cdimascio/express-openapi-validator/issues/887) [#898](https://github.com/cdimascio/express-openapi-validator/issues/898) [#1](https://github.com/cdimascio/express-openapi-validator/issues/1)
* docs: fix doc typo in README.md (#885) ([8a81bf8](https://github.com/cdimascio/express-openapi-validator/commit/8a81bf8)), closes [#885](https://github.com/cdimascio/express-openapi-validator/issues/885)



## <small>5.1.3 (2024-01-27)</small>

* CLS Context is lost after using multer middleware (#695) ([40716fb](https://github.com/cdimascio/express-openapi-validator/commit/40716fb)), closes [#695](https://github.com/cdimascio/express-openapi-validator/issues/695)
* remove examples from schema (#890) ([0ad49ec](https://github.com/cdimascio/express-openapi-validator/commit/0ad49ec)), closes [#890](https://github.com/cdimascio/express-openapi-validator/issues/890)
* v5.1.3 ([f806690](https://github.com/cdimascio/express-openapi-validator/commit/f806690))
* v5.1.3 ([e567701](https://github.com/cdimascio/express-openapi-validator/commit/e567701))



## <small>5.1.2 (2023-12-04)</small>

* Normalize request body ContentTypes (#863) ([0099b0d](https://github.com/cdimascio/express-openapi-validator/commit/0099b0d)), closes [#863](https://github.com/cdimascio/express-openapi-validator/issues/863)
* Safer handling of multipart nested JSON body props (#878) ([807e09c](https://github.com/cdimascio/express-openapi-validator/commit/807e09c)), closes [#878](https://github.com/cdimascio/express-openapi-validator/issues/878)
* v5.1.1 ([4b0c989](https://github.com/cdimascio/express-openapi-validator/commit/4b0c989))



## <small>5.1.1 (2023-11-21)</small>

* Pass-through HttpError caught in multipart handler (#867) ([240c876](https://github.com/cdimascio/express-openapi-validator/commit/240c876)), closes [#867](https://github.com/cdimascio/express-openapi-validator/issues/867)
* v5.1.0 ([a9a3b0b](https://github.com/cdimascio/express-openapi-validator/commit/a9a3b0b))
* v5.1.1 ([a4e62ac](https://github.com/cdimascio/express-openapi-validator/commit/a4e62ac))



## 5.1.0 (2023-11-12)

* Allow optional use of `req.url` (#857) ([f732379](https://github.com/cdimascio/express-openapi-validator/commit/f732379)), closes [#857](https://github.com/cdimascio/express-openapi-validator/issues/857)
* Reorder upload and security middlewares (#866) ([95543d6](https://github.com/cdimascio/express-openapi-validator/commit/95543d6)), closes [#866](https://github.com/cdimascio/express-openapi-validator/issues/866) [#865](https://github.com/cdimascio/express-openapi-validator/issues/865)
* Update build and packaging scripts (#872) ([dd4027f](https://github.com/cdimascio/express-openapi-validator/commit/dd4027f)), closes [#872](https://github.com/cdimascio/express-openapi-validator/issues/872)
* update version locks ([bb8d6b8](https://github.com/cdimascio/express-openapi-validator/commit/bb8d6b8))
* v5.1.0 ([839f859](https://github.com/cdimascio/express-openapi-validator/commit/839f859))



## <small>5.0.5 (2023-08-23)</small>

* #841 return error thrown in serDes deserializer (#842) ([d029401](https://github.com/cdimascio/express-openapi-validator/commit/d029401)), closes [#841](https://github.com/cdimascio/express-openapi-validator/issues/841) [#842](https://github.com/cdimascio/express-openapi-validator/issues/842)
* fix documentation links ([01950b7](https://github.com/cdimascio/express-openapi-validator/commit/01950b7))
* fix example schema removal and upgrade patch version ([495dabd](https://github.com/cdimascio/express-openapi-validator/commit/495dabd))
* fixing default export function issue (#846) ([268d38a](https://github.com/cdimascio/express-openapi-validator/commit/268d38a)), closes [#846](https://github.com/cdimascio/express-openapi-validator/issues/846)
* Remove body-parser deps in example (#845) ([c73b7c1](https://github.com/cdimascio/express-openapi-validator/commit/c73b7c1)), closes [#845](https://github.com/cdimascio/express-openapi-validator/issues/845)
* Remove examples from apiDoc when validating requests (#774) ([950d429](https://github.com/cdimascio/express-openapi-validator/commit/950d429)), closes [#774](https://github.com/cdimascio/express-openapi-validator/issues/774)
* Resolve "reference resolves to more than one schema" errors when AJV processes OpenAPI document and  ([9d215be](https://github.com/cdimascio/express-openapi-validator/commit/9d215be)), closes [#853](https://github.com/cdimascio/express-openapi-validator/issues/853)
* v5.0.5 change history ([b5cc33a](https://github.com/cdimascio/express-openapi-validator/commit/b5cc33a))



## <small>5.0.4 (2023-04-30)</small>

* Switch json-schema-ref-parser to non-deprecated package (#829) ([f5bbce9](https://github.com/cdimascio/express-openapi-validator/commit/f5bbce9)), closes [#829](https://github.com/cdimascio/express-openapi-validator/issues/829)
* v5.0.4 ([9b89c79](https://github.com/cdimascio/express-openapi-validator/commit/9b89c79))
* fix: Deserialize custom types with inline schemas (#823) ([d53621d](https://github.com/cdimascio/express-openapi-validator/commit/d53621d)), closes [#823](https://github.com/cdimascio/express-openapi-validator/issues/823)



## <small>5.0.3 (2023-03-04)</small>

* FIx serialization/deserialization in additionalProperties (#822) ([a9067b8](https://github.com/cdimascio/express-openapi-validator/commit/a9067b8)), closes [#822](https://github.com/cdimascio/express-openapi-validator/issues/822)
* Rename field `error_code` to `errorCode` in `ValidationErrorItem` (#819) ([1a1b2cc](https://github.com/cdimascio/express-openapi-validator/commit/1a1b2cc)), closes [#819](https://github.com/cdimascio/express-openapi-validator/issues/819)
* v5.0.3 ([6e93a96](https://github.com/cdimascio/express-openapi-validator/commit/6e93a96))
* chore(deps): bump cookiejar from 2.1.2 to 2.1.4 in /examples/9-nestjs (#805) ([07d9879](https://github.com/cdimascio/express-openapi-validator/commit/07d9879)), closes [#805](https://github.com/cdimascio/express-openapi-validator/issues/805)
* chore(deps): bump cookiejar from 2.1.3 to 2.1.4 (#806) ([0da34f8](https://github.com/cdimascio/express-openapi-validator/commit/0da34f8)), closes [#806](https://github.com/cdimascio/express-openapi-validator/issues/806)
* chore(deps): bump http-cache-semantics (#811) ([7a779f6](https://github.com/cdimascio/express-openapi-validator/commit/7a779f6)), closes [#811](https://github.com/cdimascio/express-openapi-validator/issues/811)
* chore(deps): bump http-cache-semantics (#813) ([336683d](https://github.com/cdimascio/express-openapi-validator/commit/336683d)), closes [#813](https://github.com/cdimascio/express-openapi-validator/issues/813)
* chore(deps): bump http-cache-semantics (#814) ([3721092](https://github.com/cdimascio/express-openapi-validator/commit/3721092)), closes [#814](https://github.com/cdimascio/express-openapi-validator/issues/814)
* chore(deps): bump http-cache-semantics (#816) ([466e337](https://github.com/cdimascio/express-openapi-validator/commit/466e337)), closes [#816](https://github.com/cdimascio/express-openapi-validator/issues/816)
* chore(deps): bump http-cache-semantics (#817) ([582b395](https://github.com/cdimascio/express-openapi-validator/commit/582b395)), closes [#817](https://github.com/cdimascio/express-openapi-validator/issues/817)
* chore(deps): bump http-cache-semantics in /examples/1-standard (#810) ([e6ef9d3](https://github.com/cdimascio/express-openapi-validator/commit/e6ef9d3)), closes [#810](https://github.com/cdimascio/express-openapi-validator/issues/810)
* chore(deps): bump http-cache-semantics in /examples/3-eov-operations (#812) ([fd04b5e](https://github.com/cdimascio/express-openapi-validator/commit/fd04b5e)), closes [#812](https://github.com/cdimascio/express-openapi-validator/issues/812)
* chore(deps): bump http-cache-semantics in /examples/6-multi-file-spec (#815) ([b2704b0](https://github.com/cdimascio/express-openapi-validator/commit/b2704b0)), closes [#815](https://github.com/cdimascio/express-openapi-validator/issues/815)
* chore(deps): bump json5 from 1.0.1 to 1.0.2 in /examples/9-nestjs (#801) ([30defdc](https://github.com/cdimascio/express-openapi-validator/commit/30defdc)), closes [#801](https://github.com/cdimascio/express-openapi-validator/issues/801)
* chore(deps): bump json5 in /examples/4-eov-operations-babel (#799) ([a100192](https://github.com/cdimascio/express-openapi-validator/commit/a100192)), closes [#799](https://github.com/cdimascio/express-openapi-validator/issues/799)
* fix: upgrade ajv from 8.11.0 to 8.11.2 (#797) ([e774d4b](https://github.com/cdimascio/express-openapi-validator/commit/e774d4b)), closes [#797](https://github.com/cdimascio/express-openapi-validator/issues/797)
* fix: upgrade body-parser from 1.19.0 to 1.20.1 (#798) ([87a2000](https://github.com/cdimascio/express-openapi-validator/commit/87a2000)), closes [#798](https://github.com/cdimascio/express-openapi-validator/issues/798)
* fix: upgrade content-type from 1.0.4 to 1.0.5 (#818) ([541d5f9](https://github.com/cdimascio/express-openapi-validator/commit/541d5f9)), closes [#818](https://github.com/cdimascio/express-openapi-validator/issues/818)



## <small>5.0.2 (2023-02-11)</small>

* v5.0.2 ([3b0e70c](https://github.com/cdimascio/express-openapi-validator/commit/3b0e70c))
* v5.0.2 ([24ad64f](https://github.com/cdimascio/express-openapi-validator/commit/24ad64f))
* fix: objects in form-data (#730) ([e5cb5d6](https://github.com/cdimascio/express-openapi-validator/commit/e5cb5d6)), closes [#730](https://github.com/cdimascio/express-openapi-validator/issues/730)



## <small>5.0.1 (2023-01-09)</small>

* enhance SchemaObject type (#697) ([ca43431](https://github.com/cdimascio/express-openapi-validator/commit/ca43431)), closes [#697](https://github.com/cdimascio/express-openapi-validator/issues/697)
* implement github actions workflow (#793) ([d415425](https://github.com/cdimascio/express-openapi-validator/commit/d415425)), closes [#793](https://github.com/cdimascio/express-openapi-validator/issues/793)
* Update README.md ([33da583](https://github.com/cdimascio/express-openapi-validator/commit/33da583))
* Update README.md ([ccd981a](https://github.com/cdimascio/express-openapi-validator/commit/ccd981a))
* v5.0.1 ([de0708b](https://github.com/cdimascio/express-openapi-validator/commit/de0708b))
* chore(deps): bump ansi-regex from 3.0.0 to 3.0.1 in /examples/9-nestjs (#738) ([60afead](https://github.com/cdimascio/express-openapi-validator/commit/60afead)), closes [#738](https://github.com/cdimascio/express-openapi-validator/issues/738)
* chore(deps): bump minimatch from 3.0.4 to 3.1.2 in /examples/1-standard (#764) ([0d04305](https://github.com/cdimascio/express-openapi-validator/commit/0d04305)), closes [#764](https://github.com/cdimascio/express-openapi-validator/issues/764)
* chore(deps): bump minimatch from 3.0.4 to 3.1.2 in /examples/9-nestjs (#760) ([c1cf0d9](https://github.com/cdimascio/express-openapi-validator/commit/c1cf0d9)), closes [#760](https://github.com/cdimascio/express-openapi-validator/issues/760)
* chore(deps): bump minimatch in /examples/2-standard-multiple-api-specs (#763) ([fe5e95e](https://github.com/cdimascio/express-openapi-validator/commit/fe5e95e)), closes [#763](https://github.com/cdimascio/express-openapi-validator/issues/763)
* chore(deps): bump minimatch in /examples/3-eov-operations (#766) ([3285f3a](https://github.com/cdimascio/express-openapi-validator/commit/3285f3a)), closes [#766](https://github.com/cdimascio/express-openapi-validator/issues/766)
* chore(deps): bump minimatch in /examples/4-eov-operations-babel (#768) ([5bcc81b](https://github.com/cdimascio/express-openapi-validator/commit/5bcc81b)), closes [#768](https://github.com/cdimascio/express-openapi-validator/issues/768)
* chore(deps): bump minimatch in /examples/5-custom-operation-resolver (#765) ([b5b03b3](https://github.com/cdimascio/express-openapi-validator/commit/b5b03b3)), closes [#765](https://github.com/cdimascio/express-openapi-validator/issues/765)
* chore(deps): bump minimatch in /examples/6-multi-file-spec (#767) ([e8f54e8](https://github.com/cdimascio/express-openapi-validator/commit/e8f54e8)), closes [#767](https://github.com/cdimascio/express-openapi-validator/issues/767)
* chore(deps): bump minimatch in /examples/7-response-date-serialization (#759) ([9b9433e](https://github.com/cdimascio/express-openapi-validator/commit/9b9433e)), closes [#759](https://github.com/cdimascio/express-openapi-validator/issues/759)
* chore(deps): bump minimatch in /examples/8-top-level-discriminator (#761) ([46afe5c](https://github.com/cdimascio/express-openapi-validator/commit/46afe5c)), closes [#761](https://github.com/cdimascio/express-openapi-validator/issues/761)
* chore(deps): bump minimist and @nestjs/cli in /examples/9-nestjs (#769) ([8d31f9a](https://github.com/cdimascio/express-openapi-validator/commit/8d31f9a)), closes [#769](https://github.com/cdimascio/express-openapi-validator/issues/769)
* chore(deps): bump terser from 5.7.2 to 5.14.2 in /examples/9-nestjs (#750) ([a83ff9d](https://github.com/cdimascio/express-openapi-validator/commit/a83ff9d)), closes [#750](https://github.com/cdimascio/express-openapi-validator/issues/750)
* fix: upgrade body-parser from 1.19.0 to 1.19.1 (#689) ([40736f8](https://github.com/cdimascio/express-openapi-validator/commit/40736f8)), closes [#689](https://github.com/cdimascio/express-openapi-validator/issues/689)
* fix: upgrade body-parser from 1.19.0 to 1.19.1 (#690) ([9038edc](https://github.com/cdimascio/express-openapi-validator/commit/9038edc)), closes [#690](https://github.com/cdimascio/express-openapi-validator/issues/690)
* fix: upgrade body-parser from 1.19.0 to 1.19.1 (#691) ([e64a91c](https://github.com/cdimascio/express-openapi-validator/commit/e64a91c)), closes [#691](https://github.com/cdimascio/express-openapi-validator/issues/691)



## 5.0.0 (2022-11-19)

* Fix #699 serdes missed on items in a collection, with tests. (#704) ([77bc4ae](https://github.com/cdimascio/express-openapi-validator/commit/77bc4ae)), closes [#699](https://github.com/cdimascio/express-openapi-validator/issues/699) [#704](https://github.com/cdimascio/express-openapi-validator/issues/704)
* fixed router parameters (#762) ([2bbed6f](https://github.com/cdimascio/express-openapi-validator/commit/2bbed6f)), closes [#762](https://github.com/cdimascio/express-openapi-validator/issues/762)
* v5.0.0 with ajv8 ([1d1d71b](https://github.com/cdimascio/express-openapi-validator/commit/1d1d71b))



## <small>4.13.8 (2022-05-30)</small>

* Bump AJV to v8 (#713) ([2b27332](https://github.com/cdimascio/express-openapi-validator/commit/2b27332)), closes [#713](https://github.com/cdimascio/express-openapi-validator/issues/713)
* Bump multer to version that removes dicer as sub-dependency (#739) ([6501a62](https://github.com/cdimascio/express-openapi-validator/commit/6501a62)), closes [#739](https://github.com/cdimascio/express-openapi-validator/issues/739)
* update ansi-regex ([6448f45](https://github.com/cdimascio/express-openapi-validator/commit/6448f45))
* Update README.md ([c954b4b](https://github.com/cdimascio/express-openapi-validator/commit/c954b4b))
* v4.14.0-beta.1 ([369a4a6](https://github.com/cdimascio/express-openapi-validator/commit/369a4a6))
* v4.14.0-beta.2 ([1706538](https://github.com/cdimascio/express-openapi-validator/commit/1706538))
* chore(deps): bump ansi-regex in /examples/2-standard-multiple-api-specs (#727) ([3e803b5](https://github.com/cdimascio/express-openapi-validator/commit/3e803b5)), closes [#727](https://github.com/cdimascio/express-openapi-validator/issues/727)
* chore(deps): bump ansi-regex in /examples/3-eov-operations (#726) ([aba3cd0](https://github.com/cdimascio/express-openapi-validator/commit/aba3cd0)), closes [#726](https://github.com/cdimascio/express-openapi-validator/issues/726)
* chore(deps): bump ansi-regex in /examples/5-custom-operation-resolver (#725) ([2bf250e](https://github.com/cdimascio/express-openapi-validator/commit/2bf250e)), closes [#725](https://github.com/cdimascio/express-openapi-validator/issues/725)
* chore(deps): bump ansi-regex in /examples/6-multi-file-spec (#723) ([e29c1eb](https://github.com/cdimascio/express-openapi-validator/commit/e29c1eb)), closes [#723](https://github.com/cdimascio/express-openapi-validator/issues/723)
* chore(deps): bump ansi-regex in /examples/7-response-date-serialization (#722) ([acdae50](https://github.com/cdimascio/express-openapi-validator/commit/acdae50)), closes [#722](https://github.com/cdimascio/express-openapi-validator/issues/722)
* chore(deps): bump ansi-regex in /examples/8-top-level-discriminator (#719) ([45059a6](https://github.com/cdimascio/express-openapi-validator/commit/45059a6)), closes [#719](https://github.com/cdimascio/express-openapi-validator/issues/719)
* chore(deps): bump follow-redirects in /examples/9-nestjs (#705) ([15e91aa](https://github.com/cdimascio/express-openapi-validator/commit/15e91aa)), closes [#705](https://github.com/cdimascio/express-openapi-validator/issues/705)
* chore(deps): bump minimist from 1.2.5 to 1.2.6 in /examples/1-standard (#714) ([1eecf40](https://github.com/cdimascio/express-openapi-validator/commit/1eecf40)), closes [#714](https://github.com/cdimascio/express-openapi-validator/issues/714)
* chore(deps): bump minimist in /examples/2-standard-multiple-api-specs (#716) ([6f6ea71](https://github.com/cdimascio/express-openapi-validator/commit/6f6ea71)), closes [#716](https://github.com/cdimascio/express-openapi-validator/issues/716)
* chore(deps): bump minimist in /examples/3-eov-operations (#715) ([3f6cb37](https://github.com/cdimascio/express-openapi-validator/commit/3f6cb37)), closes [#715](https://github.com/cdimascio/express-openapi-validator/issues/715)
* chore(deps): bump minimist in /examples/4-eov-operations-babel (#717) ([6b90f35](https://github.com/cdimascio/express-openapi-validator/commit/6b90f35)), closes [#717](https://github.com/cdimascio/express-openapi-validator/issues/717)
* chore(deps): bump minimist in /examples/5-custom-operation-resolver (#718) ([acc3f33](https://github.com/cdimascio/express-openapi-validator/commit/acc3f33)), closes [#718](https://github.com/cdimascio/express-openapi-validator/issues/718)
* chore(deps): bump minimist in /examples/6-multi-file-spec (#724) ([15814ba](https://github.com/cdimascio/express-openapi-validator/commit/15814ba)), closes [#724](https://github.com/cdimascio/express-openapi-validator/issues/724)
* chore(deps): bump minimist in /examples/7-response-date-serialization (#721) ([ff63618](https://github.com/cdimascio/express-openapi-validator/commit/ff63618)), closes [#721](https://github.com/cdimascio/express-openapi-validator/issues/721)
* chore(deps): bump minimist in /examples/8-top-level-discriminator (#720) ([a23a09f](https://github.com/cdimascio/express-openapi-validator/commit/a23a09f)), closes [#720](https://github.com/cdimascio/express-openapi-validator/issues/720)
* chore(deps): bump node-fetch from 2.6.1 to 2.6.7 in /examples/9-nestjs (#711) ([87bb6df](https://github.com/cdimascio/express-openapi-validator/commit/87bb6df)), closes [#711](https://github.com/cdimascio/express-openapi-validator/issues/711)



## <small>4.13.7 (2022-03-27)</small>

* migrate README to wiki ([4887ba5](https://github.com/cdimascio/express-openapi-validator/commit/4887ba5))
* Update README ([13b26d6](https://github.com/cdimascio/express-openapi-validator/commit/13b26d6))



