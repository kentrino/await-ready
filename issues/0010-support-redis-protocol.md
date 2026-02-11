<!--
severity: medium
date: 2026-02-11
author: Claude
-->

# Abstract

Redis プロトコルのサポートを追加する

# As-is

**場所:** [src/types/Protocol.ts:3](src/types/Protocol.ts#L3)

```ts
export const Protocol = z.enum(["http", "https", "postgresql", "mysql", "none"]);
```

現在サポートされているプロトコルは `http`, `https`, `postgresql`, `mysql`, `none` の5つ。Redis は `docker-compose.yml` にも含まれているが、プロトコルレベルの readiness チェックに対応していない。TCP 接続のみ（`none`）で代用する必要がある。

# Problem

- Redis はキャッシュ・セッション・キューとして多くの Web アプリスタックで使われており、`docker-compose.yml` にも含まれている
- TCP 接続が確立しても Redis がコマンドを受け付ける状態になっていない場合がある（起動直後の RDB/AOF ロード中など）
- `none` プロトコルでは Redis が実際に応答可能かどうかを判定できない

# To-be

`src/protocols/redis.ts` を追加し、以下を実装する:

- TCP 接続後に RESP プロトコルで `PING\r\n` を送信する
- サーバーから `+PONG\r\n` が返ればレディと判定する（`StatusCode.CONNECTED`）
- `-LOADING ...` や `-NOAUTH ...` 等のエラー応答もサーバーが生存していることを示すため、`CONNECTED` として扱う
- それ以外の応答は `INVALID_PROTOCOL` とする
- デフォルトポートは `6379`

変更が必要なファイル:

1. `src/types/Protocol.ts` — enum に `"redis"` を追加
2. `src/protocols/redis.ts` — 新規作成
3. `src/protocols/index.ts` — `switch` に `case "redis"` を追加
4. `src/parseTarget.ts` — `defaultPorts` に `redis: 6379` を追加

参考: [Redis Protocol specification (RESP)](https://redis.io/docs/reference/protocol-spec/)
