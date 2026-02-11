<!--
severity: low
date: 2026-02-11
author: Claude
-->

# Abstract

Elasticsearch プロトコルのサポートを追加する

# As-is

**場所:** [src/types/Protocol.ts:3](src/types/Protocol.ts#L3)

```ts
export const Protocol = z.enum(["http", "https", "postgresql", "mysql", "none"]);
```

Elasticsearch は HTTP ベースの API を持つため、既存の `http` プロトコルで `http://localhost:9200` を指定すれば TCP レベルでの readiness チェックは可能。しかし、Elasticsearch 固有のクラスタ状態（green / yellow / red）を検証することはできない。

# Problem

- Elasticsearch は起動してから HTTP レスポンスを返すまでに時間がかかる場合があるが、既存の `http` プロトコルでもこの待機は可能
- しかし HTTP レスポンスが返っても、クラスタ状態が `red` のままでインデックスが利用できないことがある
- CI/CD やテスト環境では「クラスタが実際にクエリを受け付けられる状態」になるまで待ちたいケースが多い
- `http` プロトコルは HTTP ステータスコードに関わらず `CONNECTED` を返すため、Elasticsearch の `/_cluster/health` が `503` を返していても成功と見なしてしまう

# To-be

`src/protocols/elasticsearch.ts` を追加し、以下を実装する:

- `GET /_cluster/health` に HTTP/1.1 リクエストを送信する
- レスポンスボディの JSON をパースし、`status` フィールドを確認する
  - `"green"` または `"yellow"`: `StatusCode.CONNECTED`（クラスタは利用可能）
  - `"red"`: `StatusCode.INVALID_PROTOCOL`（クラスタが利用不可）として再試行を促す
- HTTP レスポンスがパースできない場合は `INVALID_PROTOCOL` とする
- 有効な HTTP レスポンスだがクラスタヘルスが取得できない場合も `INVALID_PROTOCOL` とする
- デフォルトポートは `9200`
- `PingParams` の `path` は無視し、常に `/_cluster/health` を使用する（Elasticsearch 固有のエンドポイント）

変更が必要なファイル:

1. `src/types/Protocol.ts` — enum に `"elasticsearch"` を追加
2. `src/protocols/elasticsearch.ts` — 新規作成
3. `src/protocols/index.ts` — `switch` に `case "elasticsearch"` を追加
4. `src/parseTarget.ts` — `defaultPorts` に `elasticsearch: 9200` を追加

参考: [Elasticsearch Cluster Health API](https://www.elastic.co/guide/en/elasticsearch/reference/current/cluster-health.html)
