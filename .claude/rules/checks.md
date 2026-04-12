# セキュリティチェックの追加方法

## 手順

### 1. `src/types.ts` の `CheckId` 型に追加

```typescript
export type CheckId =
  | "branch-protection"
  // ... 既存チェック ...
  | "new-check-id";  // ← 追加
```

### 2. `src/checks/registry.ts` に定義を追加

```typescript
{
  id: "new-check-id",
  name: "チェック名",
  description: "チェックの説明",
  severity: "critical" | "high" | "medium" | "low",
  source: "graphql" | "rest" | "contents",
  supplyChainRelevance: "サプライチェーンとの関連",
},
```

### 3. チェックロジックの実装

データソースに応じて対応するファイルに追加:

| `source` | 実装ファイル | 呼び出し元 |
|---|---|---|
| `graphql` | `src/checks/graphql-checks.ts` | `runner.ts` の `runGraphQLChecks()` |
| `rest` | `src/checks/rest-checks.ts` | `runner.ts` の `runRestChecks()` |
| `contents` | `src/checks/package-checks.ts` または `actions-checks.ts` | `runner.ts` の `runPackageChecks()` / `runActionsChecks()` |

### GraphQL チェックの例

GraphQL データは `src/github/graphql.ts` の `GraphQLRepoData` 型から取得できる。\
新しいフィールドが必要なら GraphQL クエリと型定義も更新する。

```typescript
export function checkNewFeature(data: GraphQLRepoData): CheckResult {
  const pass = data.someField !== null;
  return {
    id: "new-check-id",
    name: "チェック名",
    status: pass ? "pass" : "fail",
    severity: "high",
    description: "チェックの説明",
  };
}
```

### REST チェックの例

`fetchSecurityAnalysis`, `fetchWorkflowPermissions`, `fetchPrivateVulnReporting` のレスポンスを使う。

```typescript
export function checkNewSetting(analysis: SecurityAnalysis | null): CheckResult {
  const pass = analysis?.security_and_analysis?.new_feature?.status === "enabled";
  return {
    id: "new-check-id",
    name: "チェック名",
    status: pass ? "pass" : "fail",
    severity: "high",
    description: "チェックの説明",
  };
}
```

### Contents API チェックの例

`ghApi("repos/{owner}/{repo}/contents/some-file")` でファイルを取得できる。\
404 は `GhNotFoundError`、403 は権限不足として扱う。

```typescript
const raw = await ghApi(`repos/${owner}/${repo}/contents/some-file`).catch((e) => {
  if (e instanceof GhNotFoundError) return null;
  throw e;
});
```

### 4. テストを追加

対応するテストファイルに pass/fail ケースを追加する。\
→ `.claude/rules/testing.md` を参照。

### 5. runner.ts のチェックリストを確認

`runner.ts` の `auditRepo()` でチェック結果が `allChecks` に含まれているか確認する。

## severity の選び方

| severity | 判断基準 |
|---|---|
| `critical` | 悪用されると即座にコード改ざんや認証情報漏洩につながる |
| `high` | サプライチェーン攻撃の被害を大幅に拡大させる |
| `medium` | セキュリティのベストプラクティスとして推奨される |
| `low` | あると望ましいが、直接的なリスクは低い |
