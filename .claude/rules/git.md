# Git 運用方針

## コミット前のチェック

コミット前に必ず以下を実行:

```bash
npm run lint    # tsc --noEmit
npm run test    # vitest run
```

両方通過したらコミット。

## コミットメッセージ

日本語で記述する。

```
チェック追加: pkg-lifecycle-scripts (危険なlifecycleスクリプト検知)
バグ修正: parseArgs が CLI 引数を無視する問題を修正
テスト: actions-checks のテストカバレッジ追加
リファクタ: concurrency.ts の Promise.allSettled → Promise.all
```

## ブランチ

- `main` — 安定版
- `feature/xxx` — 新機能
- `fix/xxx` — バグ修正

## 注意

- `node_modules/` は `.gitignore` に含まれているのでコミットしない
- `dist/` も `.gitignore` に含まれている (npm publish 時は `.npmignore` で制御)
