<!--
severity: low
date: 2026-02-12
author: Claude
-->

# Abstract

ライブラリの型定義ファイルに不要な `import "zod"` が残っている

# As-is

**場所:** dist/index.d.mts:1

```ts
import "zod";
```

ビルド成果物の `dist/index.d.mts` 先頭に bare import が含まれている。公開型ではすべての Zod 型がリテラル型に解決済みであり、この import は実際には不要。

# Problem

- `zod` は現在 `dependencies` に含まれるため実害はないが、不要な副作用 import がノイズになる
- 将来 `zod` を `devDependencies` に移したい場合（公開型から Zod 依存を完全に除去した場合）、この bare import が型チェックエラーの原因になる
- tsdown (rolldown) の dts 生成の副作用であり、ソースコード側で直接対処できない可能性がある

# To-be

- tsdown / rolldown の dts 生成オプションで不要な import を除去する設定があるか調査する
- もし設定で対処できない場合、ビルド後のポストプロセスで除去するか、upstream に issue を報告する
