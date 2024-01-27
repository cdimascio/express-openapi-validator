## <small>5.1.3 (2024-01-27)</small>

* CLS Context is lost after using multer middleware (#695) ([40716fb](https://github.com/cdimascio/express-openapi-validator/commit/40716fb)), closes [#695](https://github.com/cdimascio/express-openapi-validator/issues/695)
* remove examples from schema (#890) ([0ad49ec](https://github.com/cdimascio/express-openapi-validator/commit/0ad49ec)), closes [#890](https://github.com/cdimascio/express-openapi-validator/issues/890)
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



