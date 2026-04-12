import { parseArgs } from "./cli/args.js";
import { checkGhAuth } from "./github/gh.js";
import { listRepos } from "./github/repo-lister.js";
import { runChecks } from "./checks/runner.js";
import { formatConsole } from "./output/console.js";
import { formatJson } from "./output/json.js";
import { createIssues } from "./issues/creator.js";
import { SEVERITY_ORDER } from "./types.js";
import type { ScanResult } from "./types.js";

async function main(): Promise<void> {
  const opts = parseArgs();

  // 認証チェック
  await checkGhAuth();

  // スキャン対象リポ一覧取得
  process.stderr.write("リポジトリ一覧を取得中...\n");
  const repos = await listRepos(opts);

  if (repos.length === 0) {
    process.stderr.write("スキャン対象のリポジトリが見つかりませんでした。\n");
    process.exit(0);
  }

  process.stderr.write(
    `${repos.length} 件のリポジトリをスキャンします...\n`,
  );

  // チェック実行
  const results = await runChecks(repos, opts);

  const target =
    opts.org
      ? `org: ${opts.org}`
      : opts.user
        ? `user: ${opts.user}`
        : opts.repo
          ? opts.repo
          : "viewer";

  const passing = results.filter((r) => r.worstSeverity === null).length;
  const failing = results.filter((r) => r.worstSeverity !== null).length;
  const averageScore =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 0;

  const scanResult: ScanResult = {
    timestamp: new Date().toISOString(),
    target,
    totalRepos: repos.length,
    auditedRepos: results.length,
    skippedRepos: repos.length - results.length,
    results,
    summary: {
      passing,
      failing,
      averageScore,
      checkBreakdown: {},
    },
  };

  // 出力
  if (opts.format === "json") {
    formatJson(scanResult);
  } else {
    formatConsole(scanResult);
  }

  // Issue作成
  if (opts.createIssues) {
    await createIssues(scanResult, opts.dryRun);
  }

  // exit code: failingがあれば1
  const hasFailures = results.some(
    (r) =>
      r.worstSeverity !== null &&
      SEVERITY_ORDER[r.worstSeverity] >= SEVERITY_ORDER[opts.severity],
  );
  process.exit(hasFailures ? 1 : 0);
}

main().catch((err: unknown) => {
  // commander の exitOverride が --help/--version でthrowするCommanderError
  if (err && typeof err === "object" && "exitCode" in err) {
    process.exit((err as { exitCode: number }).exitCode);
  }
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`\nエラー: ${message}\n`);
  process.exit(2);
});
