<!--
severity: high
date: 2026-02-10
author: Claude
-->

# Abstract

テストが一切存在しない

# As-is

プロジェクト全体にテストファイルが存在しない。`package.json` にもテスト用のスクリプトが定義されていない。

```json
"scripts": {
  "dev": "bun run src/main.ts",
  "build": "tsdown",
  "lint": "oxlint",
  "lint:fix": "oxlint --fix",
  "fmt": "oxfmt --write .",
  "fmt:check": "oxfmt --check .",
  "check": "bun run lint && bun run fmt:check",
  "prepublishOnly": "bun run build"
}
```

# Problem

- `poll` のリトライロジック、タイムアウト判定、`retryStrategy` の適用が正しく動作するか検証する手段がない
- `createConnection` のエラーハンドリング分岐（`ECONNREFUSED`, `EACCES`, `ECONNTIMEOUT`, `ECONNRESET`, `ENOTFOUND`, IPv6 フォールバック等）がテストされていない
- `protocols/pg.ts` の PostgreSQL SSLRequest パケット送信・レスポンス処理の正当性が保証されていない
- `defineCommand` の Zod バリデーション + citty 統合が意図通り動くか不明
- リグレッションを検知できないため、安全にリファクタリング・機能追加ができない

# To-be

`bun test` を使ったテストスイートを追加する。最低限以下をカバーすべき:

- `poll`: 成功・リトライ・タイムアウト・retryStrategy 適用
- `createConnection`: 各エラーコードに対する `ConnectionStatus` の返却
- `protocols/pg`: ソケットモックによる ping の成功・失敗
- `defineCommand`: バリデーション成功・失敗時の挙動
