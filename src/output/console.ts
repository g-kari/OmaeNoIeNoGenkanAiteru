import type { ScanResult, RepoAuditResult, CheckResult, Severity } from "../types.js";
import { SEVERITY_ORDER } from "../types.js";
import { getArt, getHeaderArt } from "./ascii-art.js";

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  gray: "\x1b[90m",
};

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: C.red,
  high: C.yellow,
  medium: C.cyan,
  low: C.gray,
};

function write(text: string): void {
  process.stdout.write(text);
}

function writeln(text = ""): void {
  write(text + "\n");
}

function padEnd(str: string, len: number): string {
  // パディングはANSIコードなしの長さで計算
  const padding = Math.max(0, len - str.length);
  return str + " ".repeat(padding);
}

function formatCheckLine(check: CheckResult): string {
  const icon = check.passed ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
  const color = SEVERITY_COLOR[check.severity];
  return `  [ ${icon} ] ${padEnd(check.checkId, 38)}${color}${padEnd(check.severity, 10)}${C.reset}${check.message}`;
}

function worstFailedSeverity(checks: CheckResult[]): Severity | null {
  let worst: Severity | null = null;
  for (const check of checks) {
    if (!check.passed) {
      if (worst === null || SEVERITY_ORDER[check.severity] > SEVERITY_ORDER[worst]) {
        worst = check.severity;
      }
    }
  }
  return worst;
}

function formatRepoBlock(repo: RepoAuditResult): void {
  writeln();
  writeln(`${C.bold}${repo.repo}${C.reset}`);
  writeln(`${C.gray}${"─".repeat(60)}${C.reset}`);

  if (repo.error) {
    writeln(`  ${C.red}エラー: ${repo.error}${C.reset}`);
    writeln();
    return;
  }

  if (repo.checks.length === 0) {
    writeln(`  ${C.gray}チェック結果なし${C.reset}`);
    writeln();
    return;
  }

  // 重要度別にグループ化して、最悪の失敗重要度のAAを表示
  const failedSeverity = worstFailedSeverity(repo.checks);
  if (failedSeverity) {
    const asciiArt = getArt(failedSeverity);
    const color = SEVERITY_COLOR[failedSeverity];
    writeln();
    for (const line of asciiArt.art.split("\n")) {
      writeln(`  ${color}${line}${C.reset}`);
    }
    writeln();
  }

  // チェック結果テーブル
  for (const check of repo.checks) {
    writeln(formatCheckLine(check));
  }

  // 煽りコメント
  if (failedSeverity) {
    const asciiArt = getArt(failedSeverity);
    const color = SEVERITY_COLOR[failedSeverity];
    writeln();
    writeln(`  ${color}${asciiArt.comment}${C.reset}`);
  }

  writeln();
}

function formatSummaryTable(results: RepoAuditResult[]): void {
  writeln(`${C.bold}${"─".repeat(60)}${C.reset}`);
  writeln(`${C.bold}  ${padEnd("リポジトリ", 36)}${padEnd("スコア", 8)}最悪度${C.reset}`);
  writeln(`${C.gray}${"─".repeat(60)}${C.reset}`);

  for (const repo of results) {
    const scoreStr = `${repo.score}%`;
    const severityStr = repo.worstSeverity ?? "-";
    const color = repo.worstSeverity ? SEVERITY_COLOR[repo.worstSeverity] : "";
    const reset = repo.worstSeverity ? C.reset : "";
    writeln(`  ${padEnd(repo.repo, 36)}${padEnd(scoreStr, 8)}${color}${severityStr}${reset}`);
  }

  writeln(`${C.gray}${"─".repeat(60)}${C.reset}`);
}

function formatStats(summary: ScanResult["summary"]): void {
  writeln();
  writeln(`${C.bold}総合統計${C.reset}`);
  writeln(`  ${C.green}パス: ${summary.passing}${C.reset}  ${C.red}失敗: ${summary.failing}${C.reset}  平均スコア: ${summary.averageScore}%`);
  writeln();
}

export function formatConsole(result: ScanResult): void {
  // ヘッダー
  writeln(getHeaderArt());
  writeln();

  // リポ別ブロック
  for (const repo of result.results) {
    formatRepoBlock(repo);
  }

  // サマリーテーブル
  if (result.results.length > 0) {
    formatSummaryTable(result.results);
  }

  // 総合統計
  formatStats(result.summary);
}
