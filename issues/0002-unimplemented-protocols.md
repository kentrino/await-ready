<!--
severity: high
date: 2026-02-10
author: Claude
-->

# Abstract

`http`, `https`, `mysql` プロトコルが型定義のみで未実装

# As-is

**場所:** [src/types/Protocol.ts:3](src/types/Protocol.ts#L3)

```ts
export const Protocol = z.enum(["http", "https", "pg", "mysql"]);
```

**場所:** [src/main.ts:50-65](src/main.ts#L50-L65)

```ts
run: async (context) => {
    const res = await poll(
      async (): Promise<Result<undefined, ConnectionStatus>> => {
        const res = await createConnection({
          host: context.args.host,
          port: context.args.port,
          timeout: context.args.timeout,
          ipVersion: 4,
          waitForDns: false,
        });
        if (isErr(res)) {
          return res;
        }
        const _ = await ping(res.value);
        return ok();
      },
```

# Problem

- CLI は `--protocol http`, `--protocol https`, `--protocol mysql` を受け付けるが、`run` 内では常に `pg` 用の `ping` が呼ばれる
- ユーザーが `--protocol http` を指定した場合、PostgreSQL の SSLRequest パケットが HTTP サーバーに送信され、予期しない挙動になる
- 型レベルでは正当な値として受理されるため、実行するまでエラーに気づけない

# To-be

- プロトコルごとにディスパッチする仕組みを `run` 内に実装する
- 未実装のプロトコルを指定した場合は明示的なエラーメッセージで早期終了する
- `http` / `https`: TCP 接続後に HTTP リクエストを送信し、2xx レスポンスを確認する
- `mysql`: MySQL プロトコルのハンドシェイクパケットを確認する
- または、未実装プロトコルを `Protocol` の enum から一時的に除外する
