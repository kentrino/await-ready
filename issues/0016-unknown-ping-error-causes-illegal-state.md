<!--
severity: high
date: 2026-02-12
author: Claude
-->

# Abstract

プロトコル ping 中のソケットエラー (`__UNKNOWN_PING_ERROR`) がリトライされず、"Illegal state" で終了する

# As-is

**場所:** [src/ConnectionStatus.ts:100-108](src/ConnectionStatus.ts#L100-L108)

```ts
export function shouldRetry(s: ConnectionStatus): boolean {
  return (
    s.code === StatusCode.__NO_DATA_RECEIVED ||
    s.code === StatusCode.__SHOULD_USE_IP_V4 ||
    s.code === StatusCode.__ECONNREFUSED ||
    s.code === StatusCode.__EACCES ||
    s.code === StatusCode.__ECONNRESET ||
    s.code === StatusCode.__ENOTFOUND
  );
}
```

**場所:** [src/ConnectionStatus.ts:51-59](src/ConnectionStatus.ts#L51-L59)

```ts
export function isPollStatus(s: ConnectionStatus): s is PollStatus {
  return (
    s.code === StatusCode.TIMEOUT ||
    s.code === StatusCode.CONNECTED ||
    s.code === StatusCode.HOST_NOT_FOUND ||
    s.code === StatusCode.INVALID_PROTOCOL ||
    s.code === StatusCode.UNKNOWN ||
    s.code === StatusCode.PROTOCOL_NOT_SUPPORTED
  );
}
```

**場所:** [src/poll.ts:42-48](src/poll.ts#L42-L48)

```ts
if (!retryContext.shouldRetry) {
  if (isPollStatus(result)) {
    return result;
  }
  return status(StatusCode.UNKNOWN, "Illegal state");
}
```

# Problem

`__UNKNOWN_PING_ERROR` は TCP 接続成功後のプロトコル ping 中にソケットエラーが発生した場合に返される一時的なエラーだが:

1. `shouldRetry()` に `__UNKNOWN_PING_ERROR` が含まれていないため、リトライされない
2. `isPollStatus()` にも `__UNKNOWN_PING_ERROR` が含まれていないため、PollStatus として認識されない
3. 結果として `poll()` ループは `status(StatusCode.UNKNOWN, "Illegal state")` を返す

具体的なシナリオ:
- サーバーが起動中で TCP 接続は受け付けるが、プロトコルハンドシェイク前にコネクションをリセットする場合
- ネットワークの一時的な不安定さで ping 中にソケットエラーが発生する場合
- これらは一時的なエラーであり、リトライすべきだが、現在は即座に "Illegal state" で終了する

# To-be

`__UNKNOWN_PING_ERROR` をリトライ可能なステータスとして扱う:

1. `shouldRetry()` に `s.code === StatusCode.__UNKNOWN_PING_ERROR` を追加する
2. これにより、ping 中の一時的なソケットエラーが発生しても poll ループがリトライを続行する
3. タイムアウトまでリトライを継続し、タイムアウト後に適切な `TIMEOUT` ステータスで終了する

変更が必要なファイル:

1. `src/ConnectionStatus.ts` — `shouldRetry()` に `__UNKNOWN_PING_ERROR` を追加
2. `src/poll.test.ts` — リトライ動作のテストケース追加
