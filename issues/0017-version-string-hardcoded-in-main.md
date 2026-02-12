<!--
severity: medium
date: 2026-02-12
author: Claude
-->

# Abstract

`main.ts` のバージョン文字列がハードコードされており、`package.json` と乖離している

# As-is

**場所:** [src/main.ts:13-16](src/main.ts#L13-L16)

```ts
meta: {
  name: "await-ready",
  version: "0.0.1",
  description: "Check if a service is ready",
},
```

**場所:** [package.json:3](package.json#L3)

```json
"version": "0.0.5",
```

# Problem

- `package.json` のバージョンは `0.0.5` だが、`main.ts` の `meta.version` は `0.0.1` のまま
- `await-ready --version` を実行すると `0.0.1` と表示され、実際にインストールされているバージョンと異なる
- バージョンを上げるたびに 2 箇所を手動で同期する必要があり、今回のように乖離が生じる
- OSS ツールにおいてバージョン表示が不正確なのはユーザーの信頼を損なう（バグ報告時にバージョン確認ができない）

# To-be

バージョンの single source of truth を `package.json` に統一する。いくつかの方法:

**案 A: ビルド時に注入する（推奨）**

`tsdown.config.ts` の `define` オプションで `package.json` のバージョンをビルド時に埋め込む:

```ts
import { defineConfig } from "tsdown";
import pkg from "./package.json";

export default defineConfig({
  entry: ["src/main.ts"],
  format: "esm",
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
});
```

```ts
// src/main.ts
declare const __VERSION__: string;

meta: {
  name: "await-ready",
  version: __VERSION__,
  description: "Check if a service is ready",
},
```

**案 B: 実行時に読み込む**

```ts
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { version } = require("../package.json");
```

案 A の方がバンドルサイズに影響しないため推奨。

変更が必要なファイル:

1. `tsdown.config.ts` — `define` でバージョン定数を注入
2. `src/main.ts` — ハードコードされたバージョンを定数に置き換え
