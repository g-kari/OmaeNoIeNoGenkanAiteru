# テストルール

## TDD 原則

このプロジェクトは TDD で開発する。\
**テストを先に書き、実装は後から GREEN にする。**

1. テストを書く → RED (失敗) を確認
2. 実装する → GREEN (通過) を確認
3. リファクタ

## vitest の基本

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
```

### gh CLI のモック

`gh` CLI は `child_process.execFile` 経由で呼ばれる。テストでは必ずモックする。

```typescript
import { vi } from "vitest";
import { execFile } from "child_process";

vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

const mockExecFile = vi.mocked(execFile);
```

ヘルパーは `tests/helpers/mock-gh.ts` にある:

```typescript
import { createMockExecFile } from "../helpers/mock-gh.js";

// 成功レスポンス
mockExecFile.mockImplementation(createMockExecFile({ stdout: JSON.stringify(data) }));

// エラー
mockExecFile.mockImplementation(createMockExecFile({ exitCode: 1, stderr: "..." }));
```

### vi.mock のホイスティング

`vi.mock` はファイル先頭にホイストされる。変数を参照するとエラーになるため `vi.hoisted()` を使う:

```typescript
const { mockExecFile } = vi.hoisted(() => {
  const mockExecFile = vi.fn();
  return { mockExecFile };
});

vi.mock("child_process", () => ({
  execFile: mockExecFile,
}));
```

## テストファイルの場所

```
tests/
├── helpers/mock-gh.ts       # 共通モックヘルパー
├── cli/args.test.ts
├── github/
│   ├── gh.test.ts
│   ├── graphql.test.ts
│   ├── rest.test.ts
│   └── repo-lister.test.ts
├── checks/
│   ├── graphql-checks.test.ts
│   ├── rest-checks.test.ts
│   ├── package-checks.test.ts
│   ├── actions-checks.test.ts
│   └── runner.test.ts
├── output/
│   ├── console.test.ts
│   └── json.test.ts
└── issues/creator.test.ts
```

## テスト実行

```bash
npm run test          # 全テスト実行
npm run test:watch    # ウォッチモード
```

## 重要

- チェックを追加したら必ず対応するテストも追加する
- pass/fail 両方のケースをテストする
- エラーケース (null入力, 権限不足) も必ずテストする
