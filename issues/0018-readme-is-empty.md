<!--
severity: medium
date: 2026-02-12
author: Claude
-->

# Abstract

README.md がタイトル1行のみで、OSS プロジェクトとして必要な情報が欠如している

# As-is

**場所:** [README.md:1](README.md#L1)

```markdown
# await-ready
```

README の全内容がプロジェクト名のみ。

# Problem

npm に公開済みのパッケージ (`await-ready@0.0.5`) として、README は npm レジストリページおよび GitHub リポジトリの第一印象となるドキュメント。現状では:

- ツールが何をするのか分からない
- インストール方法が記載されていない
- 使い方（CLI の引数やオプション）が分からない
- 対応プロトコルの一覧がない
- ユースケース（Docker Compose、CI/CD での待機など）が示されていない
- 類似ツール（wait-port, wait-on, dockerize）との差異が不明
- npm レジストリのページが事実上空白になる

OSS の標準的な README には最低限以下が含まれる:
- 簡潔な説明（what / why）
- インストール手順
- クイックスタート / 使用例
- CLI オプション一覧
- 対応プロトコル
- ライセンス表記

# To-be

以下のセクションを含む README を作成する:

1. **ヘッダー** — プロジェクト名 + 1行の説明
2. **Install** — `npm install -g await-ready` / `bunx await-ready`
3. **Quick Start** — 代表的な使用例 3-4 個
4. **Usage** — CLI の全オプション一覧（`--help` の出力相当）
5. **Protocols** — 対応プロトコル一覧と各プロトコルの動作説明
6. **Exit Codes** — 終了コードの意味（既に `ExitCode.ts` にドキュメントあり）
7. **Examples** — Docker Compose、CI/CD、シェルスクリプトでの実用例
8. **License** — MIT

変更が必要なファイル:

1. `README.md`
