# Changelog

## [0.2.1](https://github.com/kentrino/await-ready/compare/v0.2.0...v0.2.1) (2026-02-14)


### CI/CD

* **review:** increase poll interval and fix script permission pattern ([e605135](https://github.com/kentrino/await-ready/commit/e60513569ae5829e2575972dc9eb7ca6d6efc7e7))
* **workflow:** remove check step from release workflow ([72fa90b](https://github.com/kentrino/await-ready/commit/72fa90b154ee9a4d5e19bcfdf59022edc0cce3b8))
* **workflow:** remove check step from release workflow ([85412b7](https://github.com/kentrino/await-ready/commit/85412b7c02efacb8d79929174ccaf79887c7b6da))

## [0.2.0](https://github.com/kentrino/await-ready/compare/v0.1.1...v0.2.0) (2026-02-14)


### Features

* export parseArgs as separate entry point at await-ready/parseArgs ([cd3cb3f](https://github.com/kentrino/await-ready/commit/cd3cb3f01359b4c4a65dccf3c211cd0b9aadb4ef))
* **scripts:** add gh-diff script to filter PR diffs by file patterns ([19d208b](https://github.com/kentrino/await-ready/commit/19d208bc123d1ed6f75da9d9d7421bcfdb2f7b97))


### Bug Fixes

* **ci:** add allowedTools and max-turns to agent review workflow ([6e1556b](https://github.com/kentrino/await-ready/commit/6e1556b26b105aa52dd33675beedfc5d2ff8a3bc))
* **ci:** allow Write tool without path restriction in review workflow ([b26b34f](https://github.com/kentrino/await-ready/commit/b26b34f753346deb9a5dc9399993edc672d06c10))
* **ci:** fix claude-code-action v1 inputs and permissions ([9c83ab5](https://github.com/kentrino/await-ready/commit/9c83ab5e75226944eefa0ccfc7e3c80981ba1d8e))
* **ci:** fix review submission permission by using Write + gh api --input ([9edeeeb](https://github.com/kentrino/await-ready/commit/9edeeebd6a4d2a87cc5cd475c405b23a935a6a84))
* **ci:** pass PR number directly to /review skill ([26e3603](https://github.com/kentrino/await-ready/commit/26e36037d806904d36a88f5044b5f9b8ba2f8713))
* **cli:** use camelCase waitForDns in Args output ([8f7a622](https://github.com/kentrino/await-ready/commit/8f7a62269c9915e01ccb5c96c180310aed1b8699))
* **deps:** relax TypeScript peer dependency to ^5 ([ff602c8](https://github.com/kentrino/await-ready/commit/ff602c8941f1d06f24329170ec196387255f7ed9))
* **review:** use API to read CODEOWNERS instead of checkout ([a96f786](https://github.com/kentrino/await-ready/commit/a96f78661d199ba174fdfd156c697e5c2d644dab))
* **types:** correct AwaitReadyResult type ([3bcd3d9](https://github.com/kentrino/await-ready/commit/3bcd3d981b65ce07fd6a58028c4cc8f29925253b))


### Refactoring

* **ci:** replace MCP-based review with gh CLI skill ([301d72c](https://github.com/kentrino/await-ready/commit/301d72cf943f5bf0c2685c0d69020534a3d2d186))
* make waitForDns optional and simplify awaitReady call sites ([000207b](https://github.com/kentrino/await-ready/commit/000207bbf328c8ced0fa5b1010f6eda873770c5f))
* **makefile:** consolidate test commands into a unified integration script ([1a98c92](https://github.com/kentrino/await-ready/commit/1a98c92d892922654d4a18087d80f2f2bad12d77))
* move zod and citty to devDependencies for zero-dep library ([4cb7d42](https://github.com/kentrino/await-ready/commit/4cb7d42f60fb13c6bb0cbf2c94d5de606eca4bf3))
* zero-dep library, CI/CD improvements, and agent review workflow ([aa9c342](https://github.com/kentrino/await-ready/commit/aa9c3425f41e55dbd5759d32989ae7f816b01b5a))


### Documentation

* improve package description and add keywords ([a3d7ed4](https://github.com/kentrino/await-ready/commit/a3d7ed417c22b9df9bd37bbfd33384bc06a5f7d0))
* **readme:** highlight zero-dependency feature and add package.json example ([c9f4158](https://github.com/kentrino/await-ready/commit/c9f41588d34ffba01deceec2c8f16464f824ecab))


### CI/CD

* add agent review workflow for PR code review ([5154242](https://github.com/kentrino/await-ready/commit/5154242109292eae00a401e2f08d378482ff59fa))
* add autofix workflow and skill for Renovate PRs ([ef9a4ea](https://github.com/kentrino/await-ready/commit/ef9a4ea9a9d8cc91c9146a2ca02ead70e533de8c))
* add finding-based deduplication to agent review workflow ([661b47b](https://github.com/kentrino/await-ready/commit/661b47be32793e0e3d71d99b0a67eef1cc7b66f7))
* add integration tests with Node.js 18/20/22 matrix ([e7c369a](https://github.com/kentrino/await-ready/commit/e7c369a07a806d0ed50032fb254850e1d300cc0a))
* add Renovate config for automated dependency updates ([59ea80f](https://github.com/kentrino/await-ready/commit/59ea80fb3ea0e0a16cfe2f7acc05ead8a8d76d44))
* **review:** add /review command trigger and CI gate ([0138d70](https://github.com/kentrino/await-ready/commit/0138d70df461bfaf65bcfc62b91b049fd5e6f7f8))
* **review:** verify /review commenter is a CODEOWNER ([62f5f71](https://github.com/kentrino/await-ready/commit/62f5f716bad220c536e02a80153d1804d401d800))
* use claude-opus-4-6 model for agent workflows ([b19b711](https://github.com/kentrino/await-ready/commit/b19b71162df5c9f8a1973ba81109e17c9deaeee3))
* **workflow:** trigger agent review only on review request ([e45c93d](https://github.com/kentrino/await-ready/commit/e45c93d68c830715ec6ec7244b3bcce88c3cdfbe))


### Miscellaneous

* add CODEOWNERS file ([96a3362](https://github.com/kentrino/await-ready/commit/96a33628932ce1dc0fe23bf195cda9b27d53b8c6))
* add symlink for Cursor to access Claude Code skills ([6dd1999](https://github.com/kentrino/await-ready/commit/6dd1999152ca2efa97ed8bb79f8be956615d23f9))
* **claude:** add scripts directory to allowed directories in settings ([a386a18](https://github.com/kentrino/await-ready/commit/a386a18a962fbe4e28276ab159479ab472aa2357))
* **git:** add gitattributes to mark bun.lock as generated ([7d14cd5](https://github.com/kentrino/await-ready/commit/7d14cd59bb8a752be888377537de29de1bdbda86))
* reorganize scripts and add typecheck ([6d40a54](https://github.com/kentrino/await-ready/commit/6d40a5471f44defc02c9c5eacfe280b527db778f))

## [0.1.1](https://github.com/kentrino/await-ready/compare/v0.1.0...v0.1.1) (2026-02-12)


### Bug Fixes

* **ci:** fix release-please tag format and token configuration ([cf2f092](https://github.com/kentrino/await-ready/commit/cf2f092952df7794cfbb628562bfb1aef5099e04))
* **ci:** fix release-please tag format and token configuration ([31ff7f3](https://github.com/kentrino/await-ready/commit/31ff7f311280bea9e021c4a38943ac834af66d67))
* **npm:** add repository url for provenance verification ([eaf80ee](https://github.com/kentrino/await-ready/commit/eaf80ee7a7f874739174e48b46f16a33039c4ed4))


### Refactoring

* **awaitReady:** add default values for parameters ([0a8d197](https://github.com/kentrino/await-ready/commit/0a8d1978c66ea79abe7ff1aec84839e485c20bf3))
* **poll:** remove derived values from RetryContext ([5310f55](https://github.com/kentrino/await-ready/commit/5310f55de03601f221231ef3669704420c3802d3))
* simplify IPv4/IPv6 retry strategy ([4187df8](https://github.com/kentrino/await-ready/commit/4187df8dac4be12a83f202107e29db0d2d32f5a6))


### Tests

* add integration test for localhost IPv4 resolution edge case ([29649ae](https://github.com/kentrino/await-ready/commit/29649aeb428f4fd8983f75130997abb30ea67366))
* **integration:** fix localhost IPv4 resolution test expectation ([16c7f36](https://github.com/kentrino/await-ready/commit/16c7f36d1a0b6136d4a95b39841b2284d09263b7))


### CI/CD

* **release:** replace tag-based release with release-please ([cb36609](https://github.com/kentrino/await-ready/commit/cb36609f0425e4be153e9934011b365b31b9ec87))
* **release:** use GitHub App token for release-please to trigger CI ([ae1acfa](https://github.com/kentrino/await-ready/commit/ae1acfa9e34ab15f5d011c8e889bd5c36dd1cbe6))
* **release:** use GitHub App token for release-please to trigger CI ([d8f02f6](https://github.com/kentrino/await-ready/commit/d8f02f6244a6d656c5cd29532ebda316873e3f9c))
* remove release-please branch from CI trigger and add oxfmtignore ([93c5d28](https://github.com/kentrino/await-ready/commit/93c5d2853e66ff482cb368d66155e3e3a8d45ddf))
* trigger CI on release-please branch pushes ([22c1067](https://github.com/kentrino/await-ready/commit/22c10677a9ecd6cd643c7567435a6ca76820383d))
* trigger CI on release-please branch pushes ([39e3c2a](https://github.com/kentrino/await-ready/commit/39e3c2acdce89dceb0060c9e2e00d78450e099b1))
* **workflow:** remove release-please branch from CI trigger ([07449a5](https://github.com/kentrino/await-ready/commit/07449a5af257d11842695914bfe3d7f0ea208270))


### Miscellaneous

* add .oxfmtignore file to exclude CHANGELOG.md from formatting ([2bdb55d](https://github.com/kentrino/await-ready/commit/2bdb55d272e14807c53fcfa016719e8a8cc99f31))
* **formatting:** rename .oxfmtignore to .prettierignore ([a383634](https://github.com/kentrino/await-ready/commit/a38363457d02947192a29a4ead41625b2b08142b))
* **formatting:** rename .oxfmtignore to .prettierignore ([ef7b606](https://github.com/kentrino/await-ready/commit/ef7b6064fe123fb16497a97ae20f44c5e864280c))
* refactor internals and adopt release-please ([999aa38](https://github.com/kentrino/await-ready/commit/999aa38fcac7da9f422fa84dc4bfaa4defd88538))
