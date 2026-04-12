import { execFile } from "node:child_process";
import type { ScanResult } from "../types.js";

function exec(
  cmd: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });
  });
}

export async function createIssues(
  result: ScanResult,
  dryRun: boolean,
): Promise<void> {
  for (const repo of result.results) {
    if (repo.worstSeverity === null) continue;

    const failedChecks = repo.checks.filter((c) => !c.passed);
    const title = `[genkan] セキュリティ設定の改善提案 (${failedChecks.length}件)`;

    const bodyLines = [
      "# セキュリティ設定の改善提案",
      "",
      `genkanによる自動スキャンで ${failedChecks.length} 件の改善点が見つかりました。`,
      "",
      "## 検出項目",
      "",
    ];

    for (const check of failedChecks) {
      bodyLines.push(
        `- **[${check.severity.toUpperCase()}]** \`${check.checkId}\`: ${check.message}`,
      );
    }

    bodyLines.push("", `スコア: ${repo.score}/100`);
    const body = bodyLines.join("\n");

    if (dryRun) {
      process.stderr.write(
        `[dry-run] ${repo.repo}: ${title}\n${body}\n\n`,
      );
      continue;
    }

    // 重複チェック
    try {
      const { stdout } = await exec("gh", [
        "issue",
        "list",
        "--repo",
        repo.repo,
        "--search",
        "[genkan]",
        "--json",
        "title",
      ]);
      const existingIssues = JSON.parse(stdout) as Array<{
        title: string;
      }>;
      if (existingIssues.some((i) => i.title.includes("[genkan]"))) {
        process.stderr.write(
          `${repo.repo}: 既存のgenkan issueがあるためスキップ\n`,
        );
        continue;
      }
    } catch {
      // issue listに失敗しても続行
    }

    try {
      await exec("gh", [
        "issue",
        "create",
        "--repo",
        repo.repo,
        "--title",
        title,
        "--body",
        body,
        "--label",
        "security",
      ]);
      process.stderr.write(`${repo.repo}: Issue作成完了\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(
        `${repo.repo}: Issue作成失敗: ${message}\n`,
      );
    }
  }
}
