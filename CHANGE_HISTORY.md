## <small>4.13.5 (2021-12-26)</small>

* fix json syntax in allcontributors file (#676) ([5dc6d22](https://github.com/cdimascio/express-openapi-validator/commit/5dc6d22)), closes [#676](https://github.com/cdimascio/express-openapi-validator/issues/676)
* Fixes on SerDes (#682) ([56f778b](https://github.com/cdimascio/express-openapi-validator/commit/56f778b)), closes [#682](https://github.com/cdimascio/express-openapi-validator/issues/682) [#601](https://github.com/cdimascio/express-openapi-validator/issues/601) [#569](https://github.com/cdimascio/express-openapi-validator/issues/569)
* Patch on serdes test and allow to use generated AJV out of Express usage (#684) ([3744cdd](https://github.com/cdimascio/express-openapi-validator/commit/3744cdd)), closes [#684](https://github.com/cdimascio/express-openapi-validator/issues/684) [#601](https://github.com/cdimascio/express-openapi-validator/issues/601) [#569](https://github.com/cdimascio/express-openapi-validator/issues/569) [#601](https://github.com/cdimascio/express-openapi-validator/issues/601) [#683](https://github.com/cdimascio/express-openapi-validator/issues/683) [#683](https://github.com/cdimascio/express-openapi-validator/issues/683) [#683](https://github.com/cdimascio/express-openapi-validator/issues/683) [#601](https://github.com/cdimascio/express-openapi-validator/issues/601) [#683](https://github.com/cdimascio/express-openapi-validator/issues/683) [#683](https://github.com/cdimascio/express-openapi-validator/issues/683) [#683](https://github.com/cdimascio/express-openapi-validator/issues/683) [#601](https://github.com/cdimascio/express-openapi-validator/issues/601) [#683](https://github.com/cdimascio/express-openapi-validator/issues/683)
* docs: add zzgab as a contributor for code, test (#680) ([3f0de5d](https://github.com/cdimascio/express-openapi-validator/commit/3f0de5d)), closes [#680](https://github.com/cdimascio/express-openapi-validator/issues/680)



## <small>4.13.4 (2021-11-29)</small>

* default export in handler #671 (#675) ([e68a604](https://github.com/cdimascio/express-openapi-validator/commit/e68a604)), closes [#671](https://github.com/cdimascio/express-openapi-validator/issues/671) [#675](https://github.com/cdimascio/express-openapi-validator/issues/675)
* Update openapi.validator.ts ([a979e53](https://github.com/cdimascio/express-openapi-validator/commit/a979e53))
* v.4.13.4 ([7a6fbf4](https://github.com/cdimascio/express-openapi-validator/commit/7a6fbf4))
* chore(deps): bump glob-parent in /examples/8-top-level-discriminator (#674) ([8db56ae](https://github.com/cdimascio/express-openapi-validator/commit/8db56ae)), closes [#674](https://github.com/cdimascio/express-openapi-validator/issues/674)
* chore(deps): bump normalize-url in /examples/8-top-level-discriminator (#673) ([260c926](https://github.com/cdimascio/express-openapi-validator/commit/260c926)), closes [#673](https://github.com/cdimascio/express-openapi-validator/issues/673)



## <small>4.13.2 (2021-10-09)</small>

- change log ([710284a](https://github.com/cdimascio/express-openapi-validator/commit/710284a))
- deps + change log ([c181365](https://github.com/cdimascio/express-openapi-validator/commit/c181365))
- if requestBody required is false, allow empty requests (#665) ([f94ca7a](https://github.com/cdimascio/express-openapi-validator/commit/f94ca7a)), closes [#665](https://github.com/cdimascio/express-openapi-validator/issues/665)
- docs: add robertjustjones as a contributor for code, test (#659) ([62437d5](https://github.com/cdimascio/express-openapi-validator/commit/62437d5)), closes [#659](https://github.com/cdimascio/express-openapi-validator/issues/659)

## <small>4.13.1 (2021-09-12)</small>

- Fix ajv logging warnings when discriminators are combined with 's (#651) ([522c3ec](https://github.com/cdimascio/express-openapi-validator/commit/522c3ec)), closes [#651](https://github.com/cdimascio/express-openapi-validator/issues/651)
- Implement SerDes.jsonType option for non-object internal types. (#632) ([01f5b5c](https://github.com/cdimascio/express-openapi-validator/commit/01f5b5c)), closes [#632](https://github.com/cdimascio/express-openapi-validator/issues/632)
- update nest to 8.x ([55972c7](https://github.com/cdimascio/express-openapi-validator/commit/55972c7))
- v4.13.1 ([9f72dda](https://github.com/cdimascio/express-openapi-validator/commit/9f72dda))
- docs: add alonsohki as a contributor for code (#658) ([5ab6acb](https://github.com/cdimascio/express-openapi-validator/commit/5ab6acb)), closes [#658](https://github.com/cdimascio/express-openapi-validator/issues/658)
- fix: upgrade multer from 1.4.2 to 1.4.3 (#652) ([fe86595](https://github.com/cdimascio/express-openapi-validator/commit/fe86595)), closes [#652](https://github.com/cdimascio/express-openapi-validator/issues/652)
- chore: update deps ([fc603f7](https://github.com/cdimascio/express-openapi-validator/commit/fc603f7))

## 4.13.0 (2021-08-20)

- add option to ignore undocumented #577 (#637) ([a760af6](https://github.com/cdimascio/express-openapi-validator/commit/a760af6)), closes [#577](https://github.com/cdimascio/express-openapi-validator/issues/577) [#637](https://github.com/cdimascio/express-openapi-validator/issues/637)
- Add Path level query param to list ONLY if there is not already an operation-level query param by th ([5268177](https://github.com/cdimascio/express-openapi-validator/commit/5268177)), closes [#631](https://github.com/cdimascio/express-openapi-validator/issues/631)
- v4.12.15 ([32d2299](https://github.com/cdimascio/express-openapi-validator/commit/32d2299))
- v4.13.0 ([7f8e0f2](https://github.com/cdimascio/express-openapi-validator/commit/7f8e0f2))
- fix: #626 op level params override path level ([688105b](https://github.com/cdimascio/express-openapi-validator/commit/688105b)), closes [#626](https://github.com/cdimascio/express-openapi-validator/issues/626)
- fix: search in req.signedCookies (#644) (#645) ([356fb18](https://github.com/cdimascio/express-openapi-validator/commit/356fb18)), closes [#644](https://github.com/cdimascio/express-openapi-validator/issues/644) [#645](https://github.com/cdimascio/express-openapi-validator/issues/645)
- fix: upgrade @types/multer from 1.4.5 to 1.4.6 (#629) ([6114f08](https://github.com/cdimascio/express-openapi-validator/commit/6114f08)), closes [#629](https://github.com/cdimascio/express-openapi-validator/issues/629)
- fix: upgrade @types/multer from 1.4.6 to 1.4.7 (#638) ([30a4d37](https://github.com/cdimascio/express-openapi-validator/commit/30a4d37)), closes [#638](https://github.com/cdimascio/express-openapi-validator/issues/638)
- fix: upgrade json-schema-ref-parser from 9.0.7 to 9.0.9 (#628) ([c5c963c](https://github.com/cdimascio/express-openapi-validator/commit/c5c963c)), closes [#628](https://github.com/cdimascio/express-openapi-validator/issues/628)

## <small>4.12.14 (2021-06-21)</small>

- increment patch version ([3d21e55](https://github.com/cdimascio/express-openapi-validator/commit/3d21e55))
- update change log ([fb55355](https://github.com/cdimascio/express-openapi-validator/commit/fb55355))
- update example deps ([5e4588b](https://github.com/cdimascio/express-openapi-validator/commit/5e4588b))
- update validator dep ([0745436](https://github.com/cdimascio/express-openapi-validator/commit/0745436))
- Use Map instead of Object for parsing query strings (#608) ([a22abf8](https://github.com/cdimascio/express-openapi-validator/commit/a22abf8)), closes [#608](https://github.com/cdimascio/express-openapi-validator/issues/608)
- docs: add Dakota628 as a contributor for code (#625) ([1a67cde](https://github.com/cdimascio/express-openapi-validator/commit/1a67cde)), closes [#625](https://github.com/cdimascio/express-openapi-validator/issues/625)

## <small>4.12.12 (2021-06-16)</small>

- add default to oneOf schema ([d506da0](https://github.com/cdimascio/express-openapi-validator/commit/d506da0))
- increment patch version ([eb0007f](https://github.com/cdimascio/express-openapi-validator/commit/eb0007f))
- oneOf test default value ([f93ba97](https://github.com/cdimascio/express-openapi-validator/commit/f93ba97))
- update nest example ([b18f73e](https://github.com/cdimascio/express-openapi-validator/commit/b18f73e))
- chore(deps): bump browserslist in /examples/4-eov-operations-babel (#605) ([36d6271](https://github.com/cdimascio/express-openapi-validator/commit/36d6271)), closes [#605](https://github.com/cdimascio/express-openapi-validator/issues/605)
- chore(deps): bump browserslist in /examples/9-nestjs (#606) ([6482612](https://github.com/cdimascio/express-openapi-validator/commit/6482612)), closes [#606](https://github.com/cdimascio/express-openapi-validator/issues/606)
- chore(deps): bump glob-parent in /examples/1-standard (#614) ([ec3cb88](https://github.com/cdimascio/express-openapi-validator/commit/ec3cb88)), closes [#614](https://github.com/cdimascio/express-openapi-validator/issues/614)
- chore(deps): bump glob-parent in /examples/3-eov-operations (#618) ([aa343e3](https://github.com/cdimascio/express-openapi-validator/commit/aa343e3)), closes [#618](https://github.com/cdimascio/express-openapi-validator/issues/618)
- chore(deps): bump glob-parent in /examples/5-custom-operation-resolver (#621) ([9e357dd](https://github.com/cdimascio/express-openapi-validator/commit/9e357dd)), closes [#621](https://github.com/cdimascio/express-openapi-validator/issues/621)
- chore(deps): bump glob-parent in /examples/6-multi-file-spec (#623) ([50db5fb](https://github.com/cdimascio/express-openapi-validator/commit/50db5fb)), closes [#623](https://github.com/cdimascio/express-openapi-validator/issues/623)
- chore(deps): bump glob-parent in /examples/7-response-date-serialization (#624) ([76827fc](https://github.com/cdimascio/express-openapi-validator/commit/76827fc)), closes [#624](https://github.com/cdimascio/express-openapi-validator/issues/624)
- chore(deps): bump normalize-url (#622) ([ccff28e](https://github.com/cdimascio/express-openapi-validator/commit/ccff28e)), closes [#622](https://github.com/cdimascio/express-openapi-validator/issues/622)
- chore(deps): bump normalize-url in /examples/1-standard (#615) ([916dd85](https://github.com/cdimascio/express-openapi-validator/commit/916dd85)), closes [#615](https://github.com/cdimascio/express-openapi-validator/issues/615)
- chore(deps): bump normalize-url in /examples/3-eov-operations (#616) ([df58720](https://github.com/cdimascio/express-openapi-validator/commit/df58720)), closes [#616](https://github.com/cdimascio/express-openapi-validator/issues/616)
- chore(deps): bump normalize-url in /examples/4-eov-operations-babel (#617) ([6c73e28](https://github.com/cdimascio/express-openapi-validator/commit/6c73e28)), closes [#617](https://github.com/cdimascio/express-openapi-validator/issues/617)
- chore(deps): bump normalize-url in /examples/5-custom-operation-resolver (#619) ([26a5341](https://github.com/cdimascio/express-openapi-validator/commit/26a5341)), closes [#619](https://github.com/cdimascio/express-openapi-validator/issues/619)
- chore(deps): bump normalize-url in /examples/6-multi-file-spec (#620) ([706e479](https://github.com/cdimascio/express-openapi-validator/commit/706e479)), closes [#620](https://github.com/cdimascio/express-openapi-validator/issues/620)
- docs: fix Javascript syntax (#611) ([d124f80](https://github.com/cdimascio/express-openapi-validator/commit/d124f80)), closes [#611](https://github.com/cdimascio/express-openapi-validator/issues/611)

## <small>4.12.11 (2021-05-21)</small>

- chore: change history ([4f32168](https://github.com/cdimascio/express-openapi-validator/commit/4f32168))
- chore(deps): bump hosted-git-info in /examples/9-nestjs (#597) ([53a85ed](https://github.com/cdimascio/express-openapi-validator/commit/53a85ed)), closes [#597](https://github.com/cdimascio/express-openapi-validator/issues/597)
- chore(deps): bump lodash in /examples/4-eov-operations-babel (#596) ([534d7bf](https://github.com/cdimascio/express-openapi-validator/commit/534d7bf)), closes [#596](https://github.com/cdimascio/express-openapi-validator/issues/596)
- upgrade deps (#602) ([2b2fb9f](https://github.com/cdimascio/express-openapi-validator/commit/2b2fb9f)), closes [#602](https://github.com/cdimascio/express-openapi-validator/issues/602)

## <small>4.12.10 (2021-05-08)</small>

- fix undefined on explode form where value is parsed as array (#595) ([6e33d98](https://github.com/cdimascio/express-openapi-validator/commit/6e33d98)), closes [#595](https://github.com/cdimascio/express-openapi-validator/issues/595)
- v4.12.10 ([cf53898](https://github.com/cdimascio/express-openapi-validator/commit/cf53898))

## <small>4.12.9 (2021-05-03)</small>

- Name middleware (#583) ([c921737](https://github.com/cdimascio/express-openapi-validator/commit/c921737)), closes [#583](https://github.com/cdimascio/express-openapi-validator/issues/583)
- Publish generated source maps to NPM (#568) ([e983108](https://github.com/cdimascio/express-openapi-validator/commit/e983108)), closes [#568](https://github.com/cdimascio/express-openapi-validator/issues/568)
- Throw error if spec specifies no content but actual response includes content/body (#591) ([98de680](https://github.com/cdimascio/express-openapi-validator/commit/98de680)), closes [#591](https://github.com/cdimascio/express-openapi-validator/issues/591)
- v 4.12.9 ([4ddfdf8](https://github.com/cdimascio/express-openapi-validator/commit/4ddfdf8))
- docs: add lyndoh as a contributor (#593) ([d1d92d6](https://github.com/cdimascio/express-openapi-validator/commit/d1d92d6)), closes [#593](https://github.com/cdimascio/express-openapi-validator/issues/593)

## <small>4.12.8 (2021-04-18)</small>

- chore: increment version ([94106f2](https://github.com/cdimascio/express-openapi-validator/commit/94106f2))
- fix: top level default values for deep objects (#586) ([ca16b42](https://github.com/cdimascio/express-openapi-validator/commit/ca16b42)), closes [#586](https://github.com/cdimascio/express-openapi-validator/issues/586)
- fix: undefined when security is defined, but not used on path (#585) ([117d54b](https://github.com/cdimascio/express-openapi-validator/commit/117d54b)), closes [#585](https://github.com/cdimascio/express-openapi-validator/issues/585)

## <small>4.12.7 (2021-04-04)</small>

- chore: change history ([a585ba1](https://github.com/cdimascio/express-openapi-validator/commit/a585ba1))
- chore: increment patch version ([810931b](https://github.com/cdimascio/express-openapi-validator/commit/810931b))
- chore: increment patch version and update change log ([33bb0f1](https://github.com/cdimascio/express-openapi-validator/commit/33bb0f1))
- chore: update deps ([510c5bb](https://github.com/cdimascio/express-openapi-validator/commit/510c5bb))
- chore: update message ([ebb51af](https://github.com/cdimascio/express-openapi-validator/commit/ebb51af))
- chore: v4.12.6 ([07ca93a](https://github.com/cdimascio/express-openapi-validator/commit/07ca93a))
- Handle bad URI (#572) ([42baee3](https://github.com/cdimascio/express-openapi-validator/commit/42baee3)), closes [#572](https://github.com/cdimascio/express-openapi-validator/issues/572)
- docs: add 0xCAFEADD1C7 as a contributor (#565) ([502b293](https://github.com/cdimascio/express-openapi-validator/commit/502b293)), closes [#565](https://github.com/cdimascio/express-openapi-validator/issues/565)
- feat: Add Allow Header on 405 (#560) ([45a40b7](https://github.com/cdimascio/express-openapi-validator/commit/45a40b7)), closes [#560](https://github.com/cdimascio/express-openapi-validator/issues/560) [#467](https://github.com/cdimascio/express-openapi-validator/issues/467) [#467](https://github.com/cdimascio/express-openapi-validator/issues/467)
- feat: add req to onError handler for response validation (#564) ([52d81a0](https://github.com/cdimascio/express-openapi-validator/commit/52d81a0)), closes [#564](https://github.com/cdimascio/express-openapi-validator/issues/564)
- fix: correctly handle default values of deepObject query params (#557) ([4ce0f89](https://github.com/cdimascio/express-openapi-validator/commit/4ce0f89)), closes [#557](https://github.com/cdimascio/express-openapi-validator/issues/557)
- fix: Relax Allow Header Test (#562) ([69cdc9f](https://github.com/cdimascio/express-openapi-validator/commit/69cdc9f)), closes [#562](https://github.com/cdimascio/express-openapi-validator/issues/562)
- doc: Clean up README and Nestjs Example (#559) ([305d5db](https://github.com/cdimascio/express-openapi-validator/commit/305d5db)), closes [#559](https://github.com/cdimascio/express-openapi-validator/issues/559)
- doc: update README ([09980a3](https://github.com/cdimascio/express-openapi-validator/commit/09980a3))

## <small>4.12.4 (2021-03-07)</small>

- chore: change log ([ef5eb16](https://github.com/cdimascio/express-openapi-validator/commit/ef5eb16))
- chore: increment patch version ([e351cef](https://github.com/cdimascio/express-openapi-validator/commit/e351cef))
- doc: update README ([35cad46](https://github.com/cdimascio/express-openapi-validator/commit/35cad46))
- fix: #551 unhandled promise rejection on invalid api spec (#556) ([9314b09](https://github.com/cdimascio/express-openapi-validator/commit/9314b09)), closes [#551](https://github.com/cdimascio/express-openapi-validator/issues/551) [#556](https://github.com/cdimascio/express-openapi-validator/issues/556)

## <small>4.12.3 (2021-03-07)</small>

- chore: change history ([68d7059](https://github.com/cdimascio/express-openapi-validator/commit/68d7059))
- chore: change history ([b0be2d6](https://github.com/cdimascio/express-openapi-validator/commit/b0be2d6))
- chore: increment patch version ([47cdd87](https://github.com/cdimascio/express-openapi-validator/commit/47cdd87))
- chore: increment patch version ([7862ee7](https://github.com/cdimascio/express-openapi-validator/commit/7862ee7))
- fix: validate api spec by default ([4637d2c](https://github.com/cdimascio/express-openapi-validator/commit/4637d2c))
- doc: update README ([ce01bf8](https://github.com/cdimascio/express-openapi-validator/commit/ce01bf8))

## <small>4.12.2 (2021-03-07)</small>

- doc: Add NestJS Example (#554) ([61ddf2b](https://github.com/cdimascio/express-openapi-validator/commit/61ddf2b)), closes [#554](https://github.com/cdimascio/express-openapi-validator/issues/554)
- Updated info about import (#549) ([af84b47](https://github.com/cdimascio/express-openapi-validator/commit/af84b47)), closes [#549](https://github.com/cdimascio/express-openapi-validator/issues/549)
- fix: throws on multi file spec where multiple responses share the same file ref (#555) ([22d88da](https://github.com/cdimascio/express-openapi-validator/commit/22d88da)), closes [#555](https://github.com/cdimascio/express-openapi-validator/issues/555)

## <small>4.12.1 (2021-03-02)</small>

- chore: change history ([4c1354f](https://github.com/cdimascio/express-openapi-validator/commit/4c1354f))
- chore: change log ([d950086](https://github.com/cdimascio/express-openapi-validator/commit/d950086))
- chore: increment patch version ([22682ae](https://github.com/cdimascio/express-openapi-validator/commit/22682ae))
- 547 make Array.flatMap not enumerable (#548) ([192d772](https://github.com/cdimascio/express-openapi-validator/commit/192d772)), closes [#548](https://github.com/cdimascio/express-openapi-validator/issues/548)
- Update README.md ([92866af](https://github.com/cdimascio/express-openapi-validator/commit/92866af))

## 4.12.0 (2021-02-28)

- test: add multi-spec test ([1f50892](https://github.com/cdimascio/express-openapi-validator/commit/1f50892))
- test: multi.spec test ([c8cf43e](https://github.com/cdimascio/express-openapi-validator/commit/c8cf43e))
- test: remove console logs ([dccf760](https://github.com/cdimascio/express-openapi-validator/commit/dccf760))
- chore: increment minor version ([7e77207](https://github.com/cdimascio/express-openapi-validator/commit/7e77207))
- fix: observe validateApiSpec and avoid schema re-checks (performance) (#544) ([e794c59](https://github.com/cdimascio/express-openapi-validator/commit/e794c59)), closes [#544](https://github.com/cdimascio/express-openapi-validator/issues/544)
- docs: add aaronluman as a contributor (#545) ([492e1f9](https://github.com/cdimascio/express-openapi-validator/commit/492e1f9)), closes [#545](https://github.com/cdimascio/express-openapi-validator/issues/545)
- feat: example 2 deps ([8d27580](https://github.com/cdimascio/express-openapi-validator/commit/8d27580))

## <small>4.11.1 (2021-02-28)</small>

- chore: change history ([73a713e](https://github.com/cdimascio/express-openapi-validator/commit/73a713e))
- chore: update lockfile and patch version ([a7b8a2a](https://github.com/cdimascio/express-openapi-validator/commit/a7b8a2a))
- chore: update npmignore ([7f6eed8](https://github.com/cdimascio/express-openapi-validator/commit/7f6eed8))

## 4.11.0 (2021-02-15)

- doc: update README ([3cbcba9](https://github.com/cdimascio/express-openapi-validator/commit/3cbcba9))
- doc: update README ([7f2cd4b](https://github.com/cdimascio/express-openapi-validator/commit/7f2cd4b))
- chore: update minor version - 4.11.0 ([5984250](https://github.com/cdimascio/express-openapi-validator/commit/5984250))
- Add `serDes` setting : serialize and deserialize (#506) ([b802dd1](https://github.com/cdimascio/express-openapi-validator/commit/b802dd1)), closes [#506](https://github.com/cdimascio/express-openapi-validator/issues/506) [#353](https://github.com/cdimascio/express-openapi-validator/issues/353) [#465](https://github.com/cdimascio/express-openapi-validator/issues/465) [#288](https://github.com/cdimascio/express-openapi-validator/issues/288) [#246](https://github.com/cdimascio/express-openapi-validator/issues/246)

## <small>4.10.12 (2021-02-14)</small>

- chore: increment patch version ([4d2df86](https://github.com/cdimascio/express-openapi-validator/commit/4d2df86))
- chore: update change history ([9652b22](https://github.com/cdimascio/express-openapi-validator/commit/9652b22))
- fix: upgrade json-schema-ref-parser from 9.0.6 to 9.0.7 (#534) ([1a8cdf0](https://github.com/cdimascio/express-openapi-validator/commit/1a8cdf0)), closes [#534](https://github.com/cdimascio/express-openapi-validator/issues/534)
- add option removeAdditional to validateRequest options (#501) ([acada10](https://github.com/cdimascio/express-openapi-validator/commit/acada10)), closes [#501](https://github.com/cdimascio/express-openapi-validator/issues/501)
- Fix Mutation of API Spec (#537) ([2866ce6](https://github.com/cdimascio/express-openapi-validator/commit/2866ce6)), closes [#537](https://github.com/cdimascio/express-openapi-validator/issues/537)

## <small>4.10.11 (2021-02-03)</small>

- chore: update patch version ([29f5de8](https://github.com/cdimascio/express-openapi-validator/commit/29f5de8))

## <small>4.10.10 (2021-02-03)</small>

- chore: increment patch version ([3851742](https://github.com/cdimascio/express-openapi-validator/commit/3851742))
- Add validateApiDoc props in OpenApiValidatorOpts (#525) ([cfb9fb7](https://github.com/cdimascio/express-openapi-validator/commit/cfb9fb7)), closes [#525](https://github.com/cdimascio/express-openapi-validator/issues/525)
- fix example ([edd4d24](https://github.com/cdimascio/express-openapi-validator/commit/edd4d24))
- Fix: electron asar - failed to open spec dir (#531) ([d09f1a2](https://github.com/cdimascio/express-openapi-validator/commit/d09f1a2)), closes [#531](https://github.com/cdimascio/express-openapi-validator/issues/531)
- fix: upgrade @types/multer from 1.4.4 to 1.4.5 (#524) ([17e923e](https://github.com/cdimascio/express-openapi-validator/commit/17e923e)), closes [#524](https://github.com/cdimascio/express-openapi-validator/issues/524)

## <small>4.10.9 (2021-01-24)</small>

- chore: ignores ([ea97cde](https://github.com/cdimascio/express-openapi-validator/commit/ea97cde))
- chore: increment patch version ([adf800c](https://github.com/cdimascio/express-openapi-validator/commit/adf800c))
- chore: increment patch version ([3d8584a](https://github.com/cdimascio/express-openapi-validator/commit/3d8584a))
- chore: update change history ([e57e04e](https://github.com/cdimascio/express-openapi-validator/commit/e57e04e))
- fix: include missing multer type def ([7cf9196](https://github.com/cdimascio/express-openapi-validator/commit/7cf9196))
- Update README.md ([719ae1c](https://github.com/cdimascio/express-openapi-validator/commit/719ae1c))
- Update README.md ([b14b31d](https://github.com/cdimascio/express-openapi-validator/commit/b14b31d))

## <small>4.10.7 (2021-01-17)</small>

- fix: #469 - Response validation skipped on status codes >=400 ([57d3c0e](https://github.com/cdimascio/express-openapi-validator/commit/57d3c0e)), closes [#469](https://github.com/cdimascio/express-openapi-validator/issues/469)
- fix: #469 - Response validation skipped on status codes >=400 (#517) ([87528c6](https://github.com/cdimascio/express-openapi-validator/commit/87528c6)), closes [#469](https://github.com/cdimascio/express-openapi-validator/issues/469) [#517](https://github.com/cdimascio/express-openapi-validator/issues/517)
- fix: remove {} from OpenApiRequest.openapi type (#520) ([51806a8](https://github.com/cdimascio/express-openapi-validator/commit/51806a8)), closes [#520](https://github.com/cdimascio/express-openapi-validator/issues/520)
- test: 478 ([cec6013](https://github.com/cdimascio/express-openapi-validator/commit/cec6013))
- test: add test for default response >=400 ([90061b5](https://github.com/cdimascio/express-openapi-validator/commit/90061b5))
- test: remove only ([05e9cef](https://github.com/cdimascio/express-openapi-validator/commit/05e9cef))
- chore: change history ([09a4696](https://github.com/cdimascio/express-openapi-validator/commit/09a4696))
- chore: increment patch version ([8ebd55f](https://github.com/cdimascio/express-openapi-validator/commit/8ebd55f))

## <small>4.10.5 (2021-01-11)</small>

- chore: beta ([979e310](https://github.com/cdimascio/express-openapi-validator/commit/979e310))
- chore: change history ([8a058fe](https://github.com/cdimascio/express-openapi-validator/commit/8a058fe))
- chore: change log ([cb7792d](https://github.com/cdimascio/express-openapi-validator/commit/cb7792d))
- chore: increment patch version ([6a5f160](https://github.com/cdimascio/express-openapi-validator/commit/6a5f160))
- chore: increment patch version ([2d0f2d8](https://github.com/cdimascio/express-openapi-validator/commit/2d0f2d8))
- improve preprocess logic and skip unneeded clones (#515) ([06d8c6e](https://github.com/cdimascio/express-openapi-validator/commit/06d8c6e)), closes [#515](https://github.com/cdimascio/express-openapi-validator/issues/515) [#511](https://github.com/cdimascio/express-openapi-validator/issues/511)
- fix: cleanup ([8f2c3fb](https://github.com/cdimascio/express-openapi-validator/commit/8f2c3fb))
- fix: remove merge ([53efb35](https://github.com/cdimascio/express-openapi-validator/commit/53efb35))
- fix: remove uneeded clones ([66d2762](https://github.com/cdimascio/express-openapi-validator/commit/66d2762))
- fix: remove uneeded deps ([c0f43fa](https://github.com/cdimascio/express-openapi-validator/commit/c0f43fa))
- fix: remove yaml parse ([009d95e](https://github.com/cdimascio/express-openapi-validator/commit/009d95e))
- fix: skip schemas ([617e9d3](https://github.com/cdimascio/express-openapi-validator/commit/617e9d3))
- test: add circular test ([db15435](https://github.com/cdimascio/express-openapi-validator/commit/db15435))
- feat: skip visited nodes ([08df2b4](https://github.com/cdimascio/express-openapi-validator/commit/08df2b4))

## <small>4.10.4 (2021-01-07)</small>

- feat: 3.1.0 roles in security schema for all types (#513) ([6d2a14d](https://github.com/cdimascio/express-openapi-validator/commit/6d2a14d)), closes [#513](https://github.com/cdimascio/express-openapi-validator/issues/513)
- Fix using discriminators. (#510) ([590649a](https://github.com/cdimascio/express-openapi-validator/commit/590649a)), closes [#510](https://github.com/cdimascio/express-openapi-validator/issues/510)
- chore: increment patch version ([20e2350](https://github.com/cdimascio/express-openapi-validator/commit/20e2350))
- fix: preprocessor type of undefined ([d17abd3](https://github.com/cdimascio/express-openapi-validator/commit/d17abd3))
- test: test for issue #590 ([7e601c4](https://github.com/cdimascio/express-openapi-validator/commit/7e601c4)), closes [#590](https://github.com/cdimascio/express-openapi-validator/issues/590)

## <small>4.10.2 (2021-01-02)</small>

- chore: increment patch version ([de89f56](https://github.com/cdimascio/express-openapi-validator/commit/de89f56))
- chore: increment patch version ([dd9eb8e](https://github.com/cdimascio/express-openapi-validator/commit/dd9eb8e))
- chore: increment patch version ([5df747c](https://github.com/cdimascio/express-openapi-validator/commit/5df747c))
- chore: increment patch version ([f35b1f2](https://github.com/cdimascio/express-openapi-validator/commit/f35b1f2))
- chore: increment patch version ([a542ece](https://github.com/cdimascio/express-openapi-validator/commit/a542ece))
- chore: increment v4.10.0 ([7357083](https://github.com/cdimascio/express-openapi-validator/commit/7357083))
- chore: launch.json ([3347f5d](https://github.com/cdimascio/express-openapi-validator/commit/3347f5d))
- chore: publish script ([ab392b8](https://github.com/cdimascio/express-openapi-validator/commit/ab392b8))
- chore: remove docs folder ([1592223](https://github.com/cdimascio/express-openapi-validator/commit/1592223))
- chore: update change log ([cf304c1](https://github.com/cdimascio/express-openapi-validator/commit/cf304c1))
- chore: update example deps ([1846227](https://github.com/cdimascio/express-openapi-validator/commit/1846227))
- fix: #495 inconsistent validation of multipart request body with $ref (#496) ([832f865](https://github.com/cdimascio/express-openapi-validator/commit/832f865)), closes [#495](https://github.com/cdimascio/express-openapi-validator/issues/495) [#496](https://github.com/cdimascio/express-openapi-validator/issues/496) [#495](https://github.com/cdimascio/express-openapi-validator/issues/495)
- fix: case-insensitive charset (#503) ([20aa8f1](https://github.com/cdimascio/express-openapi-validator/commit/20aa8f1)), closes [#503](https://github.com/cdimascio/express-openapi-validator/issues/503)
- fix: preprocessor fails if it cannot dereference a path ([45c2605](https://github.com/cdimascio/express-openapi-validator/commit/45c2605))
- fix: preprocessor fails if it cannot dereference a path. skip it. ([57324ee](https://github.com/cdimascio/express-openapi-validator/commit/57324ee))
- fix: update comments ([6f7f582](https://github.com/cdimascio/express-openapi-validator/commit/6f7f582))
- improved schema preprocessor and `Date` object handling (validation/serialization) for response bodi ([e08f45a](https://github.com/cdimascio/express-openapi-validator/commit/e08f45a)), closes [#499](https://github.com/cdimascio/express-openapi-validator/issues/499)
- Update no.components.spec.ts ([7899c54](https://github.com/cdimascio/express-openapi-validator/commit/7899c54))
- test: empty components ([61b698a](https://github.com/cdimascio/express-openapi-validator/commit/61b698a))
- doc: brief summary ([60f2cf4](https://github.com/cdimascio/express-openapi-validator/commit/60f2cf4))
- doc: update README ([f466d9e](https://github.com/cdimascio/express-openapi-validator/commit/f466d9e))
- doc: update README ([1d3dcee](https://github.com/cdimascio/express-openapi-validator/commit/1d3dcee))
- doc: update README ([29a83a7](https://github.com/cdimascio/express-openapi-validator/commit/29a83a7))
- feat: discriminator example ([95509b8](https://github.com/cdimascio/express-openapi-validator/commit/95509b8))
- docs: add electrotype as a contributor (#502) ([e8d6a37](https://github.com/cdimascio/express-openapi-validator/commit/e8d6a37)), closes [#502](https://github.com/cdimascio/express-openapi-validator/issues/502)
- docs: add pilerou as a contributor (#497) ([2b2aa7f](https://github.com/cdimascio/express-openapi-validator/commit/2b2aa7f)), closes [#497](https://github.com/cdimascio/express-openapi-validator/issues/497)

## <small>4.9.2 (2020-12-19)</small>

- chore: add OpenAPIV3.Document return type ([e71e1b9](https://github.com/cdimascio/express-openapi-validator/commit/e71e1b9))
- chore: cleanup console logs ([5248f39](https://github.com/cdimascio/express-openapi-validator/commit/5248f39))
- chore: increment minor version ([3a70cde](https://github.com/cdimascio/express-openapi-validator/commit/3a70cde))
- chore: increment patch version ([d8090d5](https://github.com/cdimascio/express-openapi-validator/commit/d8090d5))
- chore: increment patch version ([d659037](https://github.com/cdimascio/express-openapi-validator/commit/d659037))
- chore: update change history ([2ac26fc](https://github.com/cdimascio/express-openapi-validator/commit/2ac26fc))
- chore: update change log ([5397efe](https://github.com/cdimascio/express-openapi-validator/commit/5397efe))
- chore: update change log ([816b002](https://github.com/cdimascio/express-openapi-validator/commit/816b002))
- chore(deps): bump ini from 1.3.5 to 1.3.7 (#483) ([e5a5cea](https://github.com/cdimascio/express-openapi-validator/commit/e5a5cea)), closes [#483](https://github.com/cdimascio/express-openapi-validator/issues/483)
- chore(deps): bump ini from 1.3.5 to 1.3.8 in /examples/1-standard (#487) ([cf6c12d](https://github.com/cdimascio/express-openapi-validator/commit/cf6c12d)), closes [#487](https://github.com/cdimascio/express-openapi-validator/issues/487)
- chore(deps): bump ini from 1.3.5 to 1.3.8 in /examples/3-eov-operations (#484) ([baa5cdf](https://github.com/cdimascio/express-openapi-validator/commit/baa5cdf)), closes [#484](https://github.com/cdimascio/express-openapi-validator/issues/484)
- chore(deps): bump ini from 1.3.5 to 1.3.8 in /examples/6-multi-file-spec (#485) ([24988b8](https://github.com/cdimascio/express-openapi-validator/commit/24988b8)), closes [#485](https://github.com/cdimascio/express-openapi-validator/issues/485)
- chore(deps): bump ini in /examples/2-standard-multiple-api-specs (#488) ([f0eb42e](https://github.com/cdimascio/express-openapi-validator/commit/f0eb42e)), closes [#488](https://github.com/cdimascio/express-openapi-validator/issues/488)
- chore(deps): bump ini in /examples/4-eov-operations-babel (#486) ([384ff8c](https://github.com/cdimascio/express-openapi-validator/commit/384ff8c)), closes [#486](https://github.com/cdimascio/express-openapi-validator/issues/486)
- chore(deps): bump ini in /examples/5-custom-operation-resolver (#489) ([25921fc](https://github.com/cdimascio/express-openapi-validator/commit/25921fc)), closes [#489](https://github.com/cdimascio/express-openapi-validator/issues/489)
- fix: top-level discriminator using enum (#494) ([7de0485](https://github.com/cdimascio/express-openapi-validator/commit/7de0485)), closes [#494](https://github.com/cdimascio/express-openapi-validator/issues/494) [#482](https://github.com/cdimascio/express-openapi-validator/issues/482) [#482](https://github.com/cdimascio/express-openapi-validator/issues/482)
- test: add petstore test ([22db511](https://github.com/cdimascio/express-openapi-validator/commit/22db511))
- feat: #467 support for URI path params (#491) ([0f7fcda](https://github.com/cdimascio/express-openapi-validator/commit/0f7fcda)), closes [#467](https://github.com/cdimascio/express-openapi-validator/issues/467) [#491](https://github.com/cdimascio/express-openapi-validator/issues/491) [#467](https://github.com/cdimascio/express-openapi-validator/issues/467)
- Allowing request body to be coerced (#468) ([b640b75](https://github.com/cdimascio/express-openapi-validator/commit/b640b75)), closes [#468](https://github.com/cdimascio/express-openapi-validator/issues/468)
- Fix typos in readme (#490) ([3e6a26b](https://github.com/cdimascio/express-openapi-validator/commit/3e6a26b)), closes [#490](https://github.com/cdimascio/express-openapi-validator/issues/490)
- It's value => Its value (#479) ([d7757fa](https://github.com/cdimascio/express-openapi-validator/commit/d7757fa)), closes [#479](https://github.com/cdimascio/express-openapi-validator/issues/479)
- docs: add sjinks as a contributor (#480) ([59fdf32](https://github.com/cdimascio/express-openapi-validator/commit/59fdf32)), closes [#480](https://github.com/cdimascio/express-openapi-validator/issues/480)
