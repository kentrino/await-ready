<!--
severity: low
date: 2026-02-10
author: Claude
-->

# Abstract

`timeout=0` による無限待機がサポートされていない

# As-is

**場所:** [src/poll.ts:31-33](src/poll.ts#L31-L33)

```ts
if (Date.now() - start > timeout) {
  return err(ConnectionStatus.TIMEOUT);
}
```

**場所:** [src/main.ts:32-37](src/main.ts#L32-L37)

```ts
timeout: {
  type: "string",
  default: "10000",
  description: "The timeout in milliseconds",
  required: false,
},
```

# Problem

- `timeout=0` を指定すると、`Date.now() - start > 0` が最初のリトライ後にほぼ必ず `true` になり、即座にタイムアウトする
- Docker Compose の `depends_on` やサービスオーケストレーションでは「接続できるまで永遠に待つ」ケースが一般的
- 現在のデフォルト 10 秒は、重いサービスの起動には不十分な場合がある

# To-be

- `timeout=0` を「無限待機」として扱うようにする
- `poll.ts` のタイムアウト判定を `timeout > 0 && Date.now() - start > timeout` に変更する
- CLI の `--timeout` オプションの説明に `0` が無限待機であることを明記する
