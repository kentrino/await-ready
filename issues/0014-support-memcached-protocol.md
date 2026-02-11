<!--
severity: low
date: 2026-02-11
author: Claude
-->

# Abstract

Memcached プロトコルのサポートを追加する

# As-is

**場所:** [src/types/Protocol.ts:3](src/types/Protocol.ts#L3)

```ts
export const Protocol = z.enum(["http", "https", "postgresql", "mysql", "none"]);
```

Memcached はキャッシュ用途で広く使われているが、プロトコルレベルの readiness チェックに対応していない。

# Problem

- Memcached は TCP 接続が確立してもサーバーが初期化中でコマンドを受け付けない場合がある
- `none` プロトコルでは Memcached がコマンドを処理できる状態かどうかを判定できない

# To-be

`src/protocols/memcached.ts` を追加し、以下を実装する:

- TCP 接続後に Memcached テキストプロトコルで `version\r\n` コマンドを送信する
- サーバーから `VERSION ` で始まるレスポンスが返ればレディと判定する（`StatusCode.CONNECTED`）
  - 例: `VERSION 1.6.22\r\n`
- `ERROR\r\n` や `CLIENT_ERROR ...` が返った場合もサーバーが生存していることを示すため `CONNECTED` として扱う
- レスポンスが上記のいずれにも該当しない場合は `INVALID_PROTOCOL` とする
- デフォルトポートは `11211`

実装の注意点:

- Memcached はテキストプロトコルとバイナリプロトコルの両方をサポートするが、テキストプロトコルの方が広くサポートされており実装も簡単
- `version` コマンドは認証不要で、サーバーの状態に影響を与えない安全なコマンド

変更が必要なファイル:

1. `src/types/Protocol.ts` — enum に `"memcached"` を追加
2. `src/protocols/memcached.ts` — 新規作成
3. `src/protocols/index.ts` — `switch` に `case "memcached"` を追加
4. `src/parseTarget.ts` — `defaultPorts` に `memcached: 11211` を追加

参考: [Memcached Protocol](https://github.com/memcached/memcached/blob/master/doc/protocol.txt)
