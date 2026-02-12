<!--
severity: medium
date: 2026-02-12
author: Claude
-->

# Abstract

`AwaitReadyParams` に `output` と `path` という、プログラマティック API では使われないフィールドが含まれている

# As-is

**場所:** [src/awaitReady.ts:6-17](src/awaitReady.ts#L6-L17)

```ts
export type AwaitReadyParams = {
  host: string;
  port: number;
  timeout: number;
  protocol: "http" | "https" | "postgresql" | "mysql" | "redis" | "none";
  interval: number;
  path: string | undefined;
  output: "dots" | "spinner" | "sl" | "silent";
  waitForDns: boolean;
  /** Called after a failed attempt, right before the retry delay. */
  onRetry?: (attempt: number, elapsedMs: number) => void;
};
```

# Problem

- **`output`**: CLI の表示モード (dots / spinner / sl / silent) を制御するフィールド。`awaitReady` → `poll` の中では一切参照されず、完全に無視される。プログラマティック API の利用者にとって意味不明であり、必須フィールドとして強制されるのは不便
- **`path`**: HTTP ヘルスチェックのパスを意図しているが、`poll` → `once` → `ping` の呼び出しチェーンで `path` が渡されておらず、設定しても効果がない（#0015 と同根の問題）。実際に機能しないフィールドが公開型に含まれるのは誤解を招く

# To-be

- `output` を `AwaitReadyParams` から削除する（CLI 専用の関心事）
- `path` は #0015 の修正で `poll` に渡されるようになった時点で `AwaitReadyParams` に残す。#0015 が未修正の間は削除するか optional にして「未実装」である旨を JSDoc で明記する
