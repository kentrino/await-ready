<!--
severity: medium
date: 2026-02-10
author: Claude
-->

# Abstract

ポート番号のバリデーションが不十分で、不正な値が通過する

# As-is

**場所:** [src/main.ts:26-31](src/main.ts#L26-L31)

```ts
port: {
  type: "string",
  alias: "p",
  description: "The port to connect to",
  required: true,
},
```

**場所:** [src/main.ts:44-49](src/main.ts#L44-L49)

```ts
validator: z.object({
  host: z.string(),
  port: z.string().transform(Number),
  timeout: z.string().transform(Number),
  protocol: Protocol,
}),
```

# Problem

- `port` は `z.string().transform(Number)` で数値変換されるだけで、範囲チェック（1〜65535）がない
- `--port 0`, `--port -1`, `--port 99999`, `--port abc` などの不正な値が変換後に `NaN` や範囲外の数値としてそのまま `net.createConnection` に渡される
- `NaN` が渡された場合のエラーメッセージが不明瞭（`ECONNREFUSED` やランタイムエラーになる）
- 同様に `timeout` も `transform(Number)` のみで、負の値や `NaN` のチェックがない

# To-be

- `port` に整数チェックと範囲チェックを追加する: `z.string().transform(Number).pipe(z.number().int().min(1).max(65535))`
- `timeout` にも非負チェックを追加する: `z.string().transform(Number).pipe(z.number().int().min(0))`
- バリデーションエラー時に具体的なメッセージを表示する（例: "Port must be an integer between 1 and 65535"）
