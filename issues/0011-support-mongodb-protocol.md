<!--
severity: medium
date: 2026-02-11
author: Claude
-->

# Abstract

MongoDB プロトコルのサポートを追加する

# As-is

**場所:** [src/types/Protocol.ts:3](src/types/Protocol.ts#L3)

```ts
export const Protocol = z.enum(["http", "https", "postgresql", "mysql", "none"]);
```

MongoDB は人気の高い NoSQL データベースだが、プロトコルレベルの readiness チェックに対応していない。

# Problem

- MongoDB は多くのアプリケーションで使用されるが、TCP 接続が確立してもサーバーが初期化中の可能性がある
- `none` プロトコルでは MongoDB がクエリを受け付ける状態かどうかを判定できない
- MongoDB の Wire Protocol は独自バイナリ形式であり、単純な TCP 接続では不十分

# To-be

`src/protocols/mongodb.ts` を追加し、以下を実装する:

- MongoDB Wire Protocol の OP_MSG 形式で `{ hello: 1 }` コマンドを送信する
  - OP_MSG（opcode 2013）は MongoDB 3.6+ でサポートされる標準的なメッセージ形式
  - メッセージ構造: MsgHeader (16 bytes) + flagBits (4 bytes) + Section Kind 0 (1 byte) + BSON document
- サーバーから有効な OP_MSG レスポンスが返り、BSON ドキュメント内の `ok: 1` が含まれていればレディと判定
- レスポンスの MsgHeader 内の `opCode` が 2013 であることを検証する
- エラーレスポンス（`ok: 0`）もサーバーが生存していることを示すため `CONNECTED` として扱う
- デフォルトポートは `27017`

変更が必要なファイル:

1. `src/types/Protocol.ts` — enum に `"mongodb"` を追加
2. `src/protocols/mongodb.ts` — 新規作成
3. `src/protocols/index.ts` — `switch` に `case "mongodb"` を追加
4. `src/parseTarget.ts` — `defaultPorts` に `mongodb: 27017` を追加

参考: [MongoDB Wire Protocol](https://www.mongodb.com/docs/manual/reference/mongodb-wire-protocol/)
