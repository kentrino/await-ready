<!--
severity: low
date: 2026-02-12
author: Claude
-->

# Abstract

ライブラリバンドルに `output.ts` の未使用定数が含まれている

# As-is

**場所:** dist/index.mjs:27-35

```js
const OutputMode = z.enum(["dots", "spinner", "sl", "silent"]);
const SL_TRAIN_HEIGHT = 6;
const SL_SMOKE_HEIGHT = 3;
const SL_TOTAL_HEIGHT = SL_SMOKE_HEIGHT + SL_TRAIN_HEIGHT + 1;
```

`arguments.ts` が `OutputMode` を `output.ts` から import しているため、同モジュール内の `SL_TRAIN_HEIGHT`、`SL_SMOKE_HEIGHT`、`SL_TOTAL_HEIGHT` が tree-shake されずにバンドルに残っている。

# Problem

- ライブラリバンドルに SL 機関車アニメーション用の定数が含まれている（実害は軽微、数十バイト程度）
- `OutputMode` の定義場所が `output.ts`（CLI 表示ロジック全体を含むファイル）にあることが根本原因
- バンドラが同一モジュール内の副作用のない定数を除去できていない

# To-be

以下のいずれかで対処可能:

1. `OutputMode` を `output.ts` から分離して独立したファイル（例: `src/types/OutputMode.ts`）に移動する
2. #0021 で `output` フィールドを `AwaitReadyParams` から削除すれば、ライブラリ側で `OutputMode` を import する必要がなくなり、この問題も解消する
