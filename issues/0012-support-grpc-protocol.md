<!--
severity: low
date: 2026-02-11
author: Claude
-->

# Abstract

gRPC Health Checking プロトコルのサポートを追加する

# As-is

**場所:** [src/types/Protocol.ts:3](src/types/Protocol.ts#L3)

```ts
export const Protocol = z.enum(["http", "https", "postgresql", "mysql", "none"]);
```

gRPC はマイクロサービス間通信で広く使われているが、プロトコルレベルの readiness チェックに対応していない。

# Problem

- gRPC サーバーは HTTP/2 ベースであり、TCP 接続だけではサービスの readiness を判定できない
- 既存の `http` プロトコルは HTTP/1.1 の GET リクエストを送信するため、gRPC サーバーに対しては正しく動作しない
- gRPC には標準化された [Health Checking Protocol](https://github.com/grpc/grpc/blob/master/doc/health-checking.md) があり、`grpc.health.v1.Health/Check` RPC で readiness を確認するのが一般的

# To-be

`src/protocols/grpc.ts` を追加し、以下を実装する:

- HTTP/2 の接続プリフェイス（`PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n`）を送信する
- サーバーから HTTP/2 SETTINGS フレームが返ればレディと判定する（最低限の readiness チェック）
  - SETTINGS フレームのフォーマット: 9 バイトのフレームヘッダ（length: 3 bytes, type: 1 byte = 0x04, flags: 1 byte, stream id: 4 bytes）
- 将来的に完全な gRPC Health Check を実装する場合は、HPACK エンコードされたヘッダと Protocol Buffers ペイロードの送受信が必要になるが、初期実装では HTTP/2 フレーム検証で十分
- デフォルトポートは `50051`（gRPC の慣例的なデフォルトポート）

実装の複雑さに関する注意:

- HTTP/2 の完全な実装は `node:http2` モジュールを使うことで簡略化できるが、既存のプロトコル実装が raw TCP ソケットベースである点との整合性を考慮する必要がある
- 初期実装では HTTP/2 connection preface + SETTINGS フレームの検証のみとし、完全な gRPC Health Check は後続の issue で対応する方針を推奨

変更が必要なファイル:

1. `src/types/Protocol.ts` — enum に `"grpc"` を追加
2. `src/protocols/grpc.ts` — 新規作成
3. `src/protocols/index.ts` — `switch` に `case "grpc"` を追加
4. `src/parseTarget.ts` — `defaultPorts` に `grpc: 50051` を追加

参考:

- [gRPC Health Checking Protocol](https://github.com/grpc/grpc/blob/master/doc/health-checking.md)
- [HTTP/2 spec (RFC 7540)](https://httpwg.org/specs/rfc7540.html)
