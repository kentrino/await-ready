<!--
severity: medium
date: 2026-02-10
author: Claude
-->

# Abstract

ライブラリとして利用できるプログラマティック API が存在しない

# As-is

**場所:** [package.json:13-16](package.json#L13-L16)

```json
"exports": {
  ".": {
    "import": "./dist/main.mjs"
  }
}
```

**場所:** [src/main.ts:98](src/main.ts#L98)

```ts
runMain(main);
```

`main.ts` はモジュールの読み込み時に即座に `runMain(main)` を実行する。`exports` はこのファイルを指しているため、`import` するだけで CLI が起動してしまう。

# Problem

- 他の Node.js / Bun スクリプトから `await-ready` の機能を利用できない
- Docker Compose や CI スクリプト以外にも、アプリケーションの起動シーケンス内で依存サービスの待機をプログラム的に行いたいケースがある
- `poll`, `createConnection`, プロトコル ping は十分汎用的だが、公開 API としてエクスポートされていない
- `package.json` の `exports` が CLI エントリポイントを直接指しており、ライブラリとしての利用が不可能

# To-be

- CLI エントリポイントとライブラリ API を分離する
- 公開 API を提供する（例: `awaitReady({ host, port, protocol, timeout })` → `Promise<{ open: boolean }>`）
- `package.json` の `exports` をライブラリエントリポイントに変更し、`bin` は CLI 用に保持する
- TypeScript の型定義も合わせてエクスポートする
