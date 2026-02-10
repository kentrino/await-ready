<!--
severity: medium
date: 2026-02-10
author: Claude
-->

# Abstract

終了コードが 0 と 1 のみで、エラーの種類を区別できない

# As-is

**場所:** [src/main.ts:89-94](src/main.ts#L89-L94)

```ts
if (isErr(res)) {
  consola.error(res);
  process.exit(1);
}
consola.success(`Service is ready at ${context.args.host}:${context.args.port}`);
process.exit(0);
```

**場所:** [src/defineCommand.ts:21-24](src/defineCommand.ts#L21-L24)

```ts
if (!parsed.success) {
  consola.error(z.prettifyError(parsed.error));
  process.exit(1);
}
```

# Problem

- タイムアウト、ホスト未発見、バリデーションエラー、不明なエラーのすべてが `exit(1)` になる
- CI/CD パイプラインでエラーの種類に応じた分岐処理ができない
- シェルスクリプトで「タイムアウトなら再実行、バリデーションエラーなら即停止」のようなロジックが書けない
- `defineCommand` 内のバリデーション失敗と `main.ts` 内の接続失敗が同じ終了コード

# To-be

`ConnectionStatus` に応じて終了コードを細分化する:

| Exit Code | 意味 |
|-----------|------|
| 0 | 接続成功 |
| 1 | タイムアウト |
| 2 | バリデーションエラー（不正な引数） |
| 3 | 不明なエラー |
| 4 | 接続エラー（ホスト未発見等） |
