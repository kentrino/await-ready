<!--
severity: high
date: 2026-02-12
author: Claude
-->

# Abstract

`parseTarget` で抽出した URL パスが `ping()` まで到達せず、HTTP ヘルスチェックのパス指定が機能しない

# As-is

**場所:** [src/main.ts:37-46](src/main.ts#L37-L46)

```ts
const res = await poll({
  host: context.args.host,
  port: context.args.port,
  timeout: context.args.timeout,
  protocol: context.args.protocol,
  interval: context.args.interval,
  waitForDns: context.args["wait-for-dns"],
  onRetry: (attempt, elapsedMs) => output.onRetry(attempt, elapsedMs),
});
```

**場所:** [src/poll.ts:107-121](src/poll.ts#L107-L121)

```ts
async function once(params: PollParams & { ipVersion: 4 | 6 }) {
  const result = await createConnection({ ... });
  if (isSocketConnected(result)) {
    return await ping(params.protocol, {
      socket: result.socket,
      pingTimeout: DEFAULT_PING_TIMEOUT,
    });
  }
  return result;
}
```

**場所:** [src/poll.ts:124-133](src/poll.ts#L124-L133)

```ts
type PollParams = {
  timeout: number;
  host: string;
  port: number;
  interval: number;
  waitForDns: boolean;
  protocol: Protocol;
  onRetry?: (attempt: number, elapsedMs: number) => void;
};
```

# Problem

データフローが途中で途切れており、`path` が `ping()` に到達しない:

1. `parseTarget("http://localhost:8080/healthcheck")` は `path: "/healthcheck"` を正しく抽出する
2. `Args` バリデータは `path` フィールドを正しくバリデーション・出力する
3. しかし `main.ts` の `poll()` 呼び出しで `context.args.path` が渡されていない
4. `PollParams` 型に `path` フィールドが存在しない
5. `once()` 内の `ping()` 呼び出しでも `path` が渡されていない
6. 結果として、HTTP プロトコルハンドラは常に `path ?? "/"` → `"/"` をリクエストする

ユーザーが `await-ready http://localhost:8080/healthcheck` と指定しても、実際には `GET / HTTP/1.1` が送信される。パスの解析と検証に工数がかかっているのに、エンドツーエンドで機能していないバグ。

# To-be

1. `PollParams` に `path?: string` を追加する
2. `main.ts` の `poll()` 呼び出しに `path: context.args.path` を追加する
3. `once()` の `ping()` 呼び出しに `path: params.path` を追加する
4. E2E テストまたはインテグレーションテストで、パス指定が HTTP リクエストに反映されることを検証する

変更が必要なファイル:

1. `src/poll.ts` — `PollParams` に `path` を追加、`once()` で `path` を `ping()` に渡す
2. `src/main.ts` — `poll()` 呼び出しに `path` を追加
