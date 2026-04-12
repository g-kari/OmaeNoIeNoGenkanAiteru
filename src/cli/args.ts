import { Command } from "commander";
import type { CliOptions, Severity } from "../types.js";

export function parseArgs(argv?: string[]): CliOptions {
  const program = new Command();
  program.exitOverride();

  program
    .option("--org <org>", "GitHub organization name")
    .option("--user <user>", "GitHub user name")
    .option("--repo <repo>", "Single repository (owner/repo)")
    .option("--format <format>", "Output format", "console")
    .option("--severity <level>", "Minimum severity level", "low")
    .option("--include-archived", "Include archived repositories", false)
    .option("--include-fork", "Include forked repositories", false)
    .option("--create-issues", "Create GitHub issues for findings", false)
    .option("--dry-run", "Dry run mode", false);

  program.parse(argv ?? process.argv.slice(2), { from: "user" });
  const opts = program.opts();

  // Validate format
  const validFormats = ["console", "json"];
  if (!validFormats.includes(opts.format)) {
    throw new Error(`Invalid format: ${opts.format}. Must be one of: ${validFormats.join(", ")}`);
  }

  // Validate severity
  const validSeverities = ["low", "medium", "high", "critical"];
  if (!validSeverities.includes(opts.severity)) {
    throw new Error(`Invalid severity: ${opts.severity}. Must be one of: ${validSeverities.join(", ")}`);
  }

  return {
    org: opts.org,
    user: opts.user,
    repo: opts.repo,
    format: opts.format as "console" | "json",
    severity: opts.severity as Severity,
    includeArchived: opts.includeArchived,
    includeFork: opts.includeFork,
    createIssues: opts.createIssues,
    dryRun: opts.dryRun,
  };
}
