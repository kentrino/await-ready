<!--
severity: low
date: 2026-02-10
author: Claude
-->

# Abstract

トラブルシューティング用のデバッグログ機構がない

# As-is

**場所:** [src/createConnection.ts:2](src/createConnection.ts#L2)

```ts
import { debug } from "node:util";
```

`createConnection.ts` では `node:util` の `debug` をインポートしているが、これは `util.debuglog` ではなく `util.debug` であり、実際にはデバッグログ出力として機能しない。また、他のモジュール（`poll.ts`, `main.ts`, `protocols/pg.ts`）にはデバッグログが一切ない。

# Problem

- 接続が失敗した際、どのエラーコードが返されたか、IPv6 フォールバックが発生したか、何回リトライしたか等の情報が得られない
- `createConnection.ts` 内の `debug(...)` 呼び出しが意図通り動作していない可能性がある
- ユーザーが問題を報告する際、再現に必要な情報を提供できない
- ポーリングループの各イテレーションの状態が不可視

# To-be

- 環境変数（例: `DEBUG=is-ready`）でデバッグログを有効化できる仕組みを導入する
- `consola` のログレベル制御、または `node:util.debuglog` を正しく使用する
- 最低限以下の情報をログ出力する:
  - ターゲット情報（host, port, protocol）
  - 各接続試行のエラーコードと結果
  - IPv6 → IPv4 フォールバックの発生
  - リトライ回数と経過時間
  - タイムアウト発生
