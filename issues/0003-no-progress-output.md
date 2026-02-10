<!--
severity: high
date: 2026-02-10
author: Claude
-->

# Abstract

ポーリング中にプログレス表示がなく、ツールが動作しているか判断できない

# As-is

**場所:** [src/poll.ts:19-36](src/poll.ts#L19-L36)

```ts
): Promise<Result<T, ConnectionStatus>> {
  let start = Date.now();
  let retryContext = initialContext;
  while (true) {
    const result = await fn(retryContext);
    if (isOk(result)) {
      return result;
    }
    if (result.error !== ConnectionStatus.SHOULD_RETRY) {
      return result;
    }
    retryContext = retryStrategy(result, retryContext);
    if (Date.now() - start > timeout) {
      return err(ConnectionStatus.TIMEOUT);
    }
    await delay(interval);
  }
}
```

**場所:** [src/main.ts:89-94](src/main.ts#L89-L94)

```ts
if (isErr(res)) {
  consola.error(res);
  process.exit(1);
}
consola.success(`Service is ready at ${context.args.host}:${context.args.port}`);
```

# Problem

- ポーリングループ内に一切の出力がない。タイムアウトが長い場合（例: 60秒）、ユーザーにはプロセスがハングしているように見える
- 成功・失敗のメッセージは最終結果のみ。何回リトライしたか、どのエラーで失敗しているかの情報がない
- CI/CD パイプラインでログに何も残らず、デバッグが困難

# To-be

出力モードを導入する（例: `dots`, `silent`）:

- `dots`: 接続試行ごとに `.` を出力し、成功時に `Connected!`、タイムアウト時に `Timeout` を表示
- `silent`: 出力なし（スクリプト向け）
- Strategy パターンで実装し、新しい出力モードを容易に追加できるようにする
- `--output` オプションとして CLI に追加する
