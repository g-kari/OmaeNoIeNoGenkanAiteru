# CLAUDE.md - aiteru-zo プロジェクト

## 概要

`aiteru-zo` は GitHub リポジトリのセキュリティ設定を監査する npx CLI ツール。\
`gh` CLI (child_process) を使って GitHub API にアクセスする。

## 技術スタック

- **TypeScript ESM** (NodeNext module resolution)
- **tsup** (esbuild bundler) → `dist/index.js` に単一バンドル
- **commander** — CLI引数パース
- **yaml** — GitHub Actions YAMLパース
- **vitest** — テストフレームワーク (145テスト / 13ファイル)

## 重要な実装ルール

### tsup.config.ts の `external`

```typescript
external: ["commander", "yaml"]
```

**絶対に `noExternal` に変えてはいけない。** \
commander は CJS パッケージのため、ESM バンドルに含めると `Dynamic require of "events" is not supported` エラーが発生する。

### parseArgs の引数

```typescript
program.parse(argv ?? process.argv.slice(2), { from: "user" });
```

`argv ?? []` は NG。空配列だと index.ts から `parseArgs()` を呼んだ際に CLI 引数が無視される。

### concurrency.ts の `Promise.all`

```typescript
await Promise.all(workers);
```

`Promise.allSettled` にするとワーカー内のエラーが飲み込まれ、results に undefined が混入して後続処理がクラッシュする。

## ファイル構成

```
src/
├── index.ts              # CLIエントリ。main() → checkGhAuth → listRepos → runChecks → output
├── types.ts              # 全型定義 (Severity, CheckId, RepoAuditResult, ScanResult, CliOptions...)
├── cli/args.ts           # commander parseArgs()
├── github/
│   ├── gh.ts             # ghApi(), ghGraphQL(), checkGhAuth() — execFile("gh") ラッパー
│   ├── graphql.ts        # fetchGraphQLData(repo) / batchFetchRepos(repos[])
│   ├── rest.ts           # fetchSecurityAnalysis, fetchWorkflowPermissions, fetchPrivateVulnReporting
│   └── repo-lister.ts    # listRepos(opts) — ページネーション対応
├── checks/
│   ├── registry.ts       # CHECK_REGISTRY: CheckDefinition[] (21項目の静的データ)
│   ├── runner.ts         # runChecks() → auditRepoSafe() → auditRepo()
│   ├── graphql-checks.ts # runGraphQLChecks(data) — 8チェック
│   ├── rest-checks.ts    # runRestChecks(sa, wp, pvr) — 5チェック
│   ├── package-checks.ts # runPackageChecks(repo) — package.json 5チェック
│   └── actions-checks.ts # runActionsChecks(repo) — GitHub Actions 3チェック
├── output/
│   ├── ascii-art.ts      # getArt(severity), getHeaderArt() — severity別AA
│   ├── console.ts        # formatConsole(result) — ANSI色付き出力
│   └── json.ts           # formatJson(result) → JSON.stringify → stdout
├── issues/creator.ts     # createIssues(result, dryRun) → gh issue create
└── utils/
    ├── concurrency.ts    # runWithConcurrency(items, n, fn) — Promise プール
    └── severity.ts       # compareSeverity, getWorstSeverity, computeScore
```

## チェックを追加する手順

→ `.claude/rules/checks.md` を参照。

## テストの書き方

→ `.claude/rules/testing.md` を参照。

## GitHub API アクセスパターン

| 種別 | 実装 | 主な用途 |
|---|---|---|
| GraphQL | `ghGraphQL(query)` in `gh.ts` | ブランチ保護, 脆弱性アラート, etc. (20リポ/バッチ) |
| REST | `ghApi(endpoint)` in `gh.ts` | シークレットスキャン, Actions権限, etc. |
| Contents API | `ghApi("repos/{o}/{r}/contents/...")` | package.json, workflow YAML取得 |

エラーハンドリング:
- `404` → `GhNotFoundError` → 対象チェックをスキップ (null返却)
- `403` → 権限不足として null 返却
- その他 → `GhCliError` → `auditRepoSafe()` がキャッチしてリポ単位のエラーとして処理

## コマンド

```bash
npm run build         # tsup で dist/index.js にバンドル
npm run test          # vitest run
npm run test:watch    # vitest (ウォッチモード)
npm run lint          # tsc --noEmit
npm run typecheck     # tsc --noEmit
```
