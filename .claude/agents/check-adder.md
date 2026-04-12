---
name: check-adder
description: genkan に新しいセキュリティチェックを TDD で追加するエージェント。チェックID、重要度、データソース、説明を受け取り、テスト → 実装の順で完成させる。
---

# check-adder エージェント

genkan CLI に新しいセキュリティチェックを追加するエージェントです。\
TDD（テスト先行）で実装します。

## 使い方

```
チェックを追加してください:
- ID: actions-env-protection
- 重要度: high
- データソース: graphql
- 説明: デプロイ環境に保護ルールが設定されているか
```

## 実装手順

このエージェントは以下の順序で作業します:

### 1. 現状確認

- `src/types.ts` の `CheckId` 型を読む
- `src/checks/registry.ts` を読む
- 追加先のチェックファイル (`graphql-checks.ts` / `rest-checks.ts` / `package-checks.ts` / `actions-checks.ts`) を読む

### 2. テスト先行 (RED フェーズ)

対応するテストファイルに新しいチェックのテストを追加:

```typescript
describe("checkNewFeature", () => {
  it("有効な場合はpassを返す", () => {
    // ...
  });
  it("無効な場合はfailを返す", () => {
    // ...
  });
  it("nullの場合はfailを返す", () => {
    // ...
  });
});
```

`npm run test` を実行して RED を確認。

### 3. 実装 (GREEN フェーズ)

以下のファイルを順番に更新:

1. `src/types.ts` — `CheckId` 型に新しいIDを追加
2. `src/checks/registry.ts` — `CHECK_REGISTRY` に定義を追加
3. 対応するチェックファイル — チェック関数を実装

### 4. 確認

```bash
npm run test    # 全テスト通過
npm run lint    # 型エラーなし
npm run build   # ビルド成功
```

## 参照ドキュメント

- `.claude/rules/checks.md` — チェック追加の詳細手順
- `.claude/rules/testing.md` — テストの書き方
- `CLAUDE.md` — プロジェクト全体の注意事項
