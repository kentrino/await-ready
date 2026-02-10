<!--
severity: medium
date: 2026-02-10
author: Claude
-->

# Abstract

ポーリング間隔が 100ms にハードコードされており、ユーザーが制御できない

# As-is

**場所:** [src/poll.ts:10](src/poll.ts#L10)

```ts
interval = 100,
```

**場所:** [src/main.ts:51-88](src/main.ts#L51-L88)

`poll` を呼び出す際に `interval` が指定されておらず、常にデフォルトの 100ms が使われる。

# Problem

- 100ms 間隔はリモートホストに対しては過度に高頻度で、不要なネットワーク負荷を生む
- localhost でのテスト用途では十分だが、本番環境のリモートサービスの起動待ちには攻撃的すぎる
- `poll` 関数自体は `interval` パラメータを受け付ける設計だが、CLI から制御する手段がない

# To-be

- `--interval` オプションを CLI に追加する（デフォルト: 1000ms）
- デフォルト値を 100ms から 1000ms に変更し、リモートホストへの過剰な接続試行を防ぐ
- `main.ts` から `poll` に `interval` を渡す
