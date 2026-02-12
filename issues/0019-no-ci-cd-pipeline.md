<!--
severity: medium
date: 2026-02-12
author: Claude
-->

# Abstract

CI/CD パイプラインが存在せず、テスト・リント・ビルド・リリースが手動でしか実行できない

# As-is

`.github/` ディレクトリが存在しない。テスト (`bun run test`)、リント (`bun run check`)、ビルド (`bun run build`) はすべてローカルで手動実行するしかない。

`package.json` には以下のスクリプトが定義されている:

```json
"scripts": {
  "dev": "bun run src/main.ts",
  "build": "tsdown",
  "lint": "oxlint",
  "lint:fix": "oxlint --fix",
  "fmt": "oxfmt --write .",
  "fmt:check": "oxfmt --check .",
  "test": "vitest run",
  "check": "bun run lint && bun run fmt:check",
  "prepublishOnly": "bun run build"
}
```

# Problem

- PR にテストやリントの自動チェックがないため、壊れたコードがマージされるリスクがある
- npm への公開が手動の `npm publish` に依存しており、ビルド忘れや未テストのリリースが起こりうる（`prepublishOnly` はローカルでのみ実行される）
- コントリビューターがテスト環境を手動で構築する必要がある
- npm に公開済みのパッケージとして、CI による品質保証がないのは OSS 標準から大きく乖離している
- `docker-compose.yml` にテスト用サービス（nginx, postgres, mysql）が定義されているが、これを使ったインテグレーションテストの自動化もされていない

# To-be

最低限の GitHub Actions ワークフローを追加する:

**1. CI ワークフロー (`.github/workflows/ci.yml`)**

- トリガー: push to main, pull request
- ジョブ:
  - `lint`: `bun run check`（oxlint + oxfmt チェック）
  - `test`: `bun run test`（vitest）
  - `build`: `bun run build`（tsdown でバンドルが壊れていないことを確認）
  - `typecheck`: `bunx tsc --noEmit`（型チェック、現在 scripts に未定義）

**2. リリースワークフロー (`.github/workflows/release.yml`)** — 任意

- トリガー: GitHub Release 作成時 or tag push
- ジョブ: `bun run build && npm publish`

**3. Dependabot (`.github/dependabot.yml`)** — 任意

- 依存パッケージの自動更新 PR

新規作成が必要なファイル:

1. `.github/workflows/ci.yml`
2. `.github/workflows/release.yml`（任意）
3. `.github/dependabot.yml`（任意）
