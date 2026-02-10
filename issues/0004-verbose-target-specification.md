<!--
severity: medium
date: 2026-02-10
author: Claude
-->

# Abstract

ターゲット指定が冗長で、CLI の使い勝手が悪い

# As-is

**場所:** [src/main.ts:20-43](src/main.ts#L20-L43)

```ts
args: {
  host: {
    type: "string",
    default: "localhost",
    description: "The host to connect to",
  },
  port: {
    type: "string",
    alias: "p",
    description: "The port to connect to",
    required: true,
  },
  timeout: {
    type: "string",
    default: "10000",
    description: "The timeout in milliseconds",
    required: false,
  },
  protocol: {
    type: "enum",
    options: Protocol.options,
    required: true,
  },
},
```

現在の使用方法:

```bash
is-ready --host localhost -p 5432 --protocol pg --timeout 5000
```

# Problem

- 単純な「ポート 5432 が開いているか確認したい」というケースでも、`--host`, `-p`, `--protocol` の3つのフラグが必要
- `--protocol` が必須のため、TCP ポートの疎通確認だけしたい場合にも指定が強制される
- ポートだけ、あるいは `host:port` のような簡潔な指定ができない
- 他の CLI ツール（`curl`, `ssh`, `psql` 等）のユーザーが期待する `host:port` 形式に対応していない

# To-be

位置引数で柔軟なターゲット指定をサポートする:

```bash
is-ready 3000                              # localhost:3000 (TCP)
is-ready :8080                             # localhost:8080 (TCP)
is-ready localhost:3000                    # host:port (TCP)
is-ready pg://localhost:5432               # PostgreSQL
is-ready http://localhost:5000/healthcheck # HTTP ヘルスチェック
```

- `protocol://` プレフィックスでプロトコルを推定する
- プロトコル指定がない場合はデフォルトで TCP（raw socket）接続
- 既存のフラグ指定も後方互換として残す
