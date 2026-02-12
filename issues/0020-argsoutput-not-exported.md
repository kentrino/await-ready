<!--
severity: low
date: 2026-02-12
author: Claude
-->

# Abstract

`parseArgs` の返り値型 `ArgsOutput` がライブラリ API から export されていない

# As-is

**場所:** [src/index.ts:1](src/index.ts#L1)

```ts
export { parseArgs } from "./cli/arguments";
```

**場所:** [src/cli/arguments.ts:11](src/cli/arguments.ts#L11)

```ts
export function parseArgs(rawArgs: string[]): AwaitReadyResult<ArgsOutput> {
```

`parseArgs` は export されているが、その返り値の型パラメータ `ArgsOutput` は `src/index.ts` から re-export されていない。

# Problem

- 利用者が `parseArgs` の結果を明示的に型付けしたい場合、`ArgsOutput` を直接 import できない
- `type result: AwaitReadyResult<???>` のように書く際に、推論に頼るか `ReturnType` を使うしかない
- 型定義ファイル (`dist/index.d.mts`) には `ArgsOutput` の定義が含まれているが export リストに含まれていない

# To-be

`src/index.ts` から `ArgsOutput` を re-export する:

```ts
export { parseArgs, type ArgsOutput } from "./cli/arguments";
```
