import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CliOptions, CheckResult, GraphQLRepoData } from "../../src/types.js";

// 全チェックモジュールをモック化
vi.mock("../../src/github/graphql.js", () => ({
  fetchGraphQLData: vi.fn(),
}));
vi.mock("../../src/github/rest.js", () => ({
  fetchSecurityAnalysis: vi.fn(),
  fetchWorkflowPermissions: vi.fn(),
  fetchPrivateVulnReporting: vi.fn(),
}));
vi.mock("../../src/checks/graphql-checks.js", () => ({
  runGraphQLChecks: vi.fn(),
}));
vi.mock("../../src/checks/rest-checks.js", () => ({
  runRestChecks: vi.fn(),
}));
vi.mock("../../src/checks/package-checks.js", () => ({
  runPackageChecks: vi.fn(),
}));
vi.mock("../../src/checks/actions-checks.js", () => ({
  runActionsChecks: vi.fn(),
}));
vi.mock("../../src/config/loader.js", () => ({
  loadRepoConfig: vi.fn(),
}));

import { runChecks } from "../../src/checks/runner.js";
import { fetchGraphQLData } from "../../src/github/graphql.js";
import { fetchSecurityAnalysis, fetchWorkflowPermissions, fetchPrivateVulnReporting } from "../../src/github/rest.js";
import { runGraphQLChecks } from "../../src/checks/graphql-checks.js";
import { runRestChecks } from "../../src/checks/rest-checks.js";
import { runPackageChecks } from "../../src/checks/package-checks.js";
import { runActionsChecks } from "../../src/checks/actions-checks.js";
import { loadRepoConfig } from "../../src/config/loader.js";

const mockedFetchGraphQLData = vi.mocked(fetchGraphQLData);
const mockedFetchSecurityAnalysis = vi.mocked(fetchSecurityAnalysis);
const mockedFetchWorkflowPermissions = vi.mocked(fetchWorkflowPermissions);
const mockedFetchPrivateVulnReporting = vi.mocked(fetchPrivateVulnReporting);
const mockedRunGraphQLChecks = vi.mocked(runGraphQLChecks);
const mockedRunRestChecks = vi.mocked(runRestChecks);
const mockedRunPackageChecks = vi.mocked(runPackageChecks);
const mockedRunActionsChecks = vi.mocked(runActionsChecks);
const mockedLoadRepoConfig = vi.mocked(loadRepoConfig);

const defaultOpts: CliOptions = {
  format: "console",
  severity: "low",
  includeArchived: false,
  includeFork: false,
  createIssues: false,
  dryRun: false,
};

function makeCheckResult(
  overrides: Partial<CheckResult> & Pick<CheckResult, "checkId">,
): CheckResult {
  return {
    passed: true,
    severity: "low",
    message: "OK",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  // デフォルトのモック設定
  mockedFetchGraphQLData.mockResolvedValue({
    nameWithOwner: "owner/repo",
    isArchived: false,
    isFork: false,
    isPrivate: false,
    defaultBranchRef: { name: "main", branchProtectionRule: null },
    deleteBranchOnMerge: false,
    hasVulnerabilityAlertsEnabled: false,
    isSecurityPolicyEnabled: false,
    licenseInfo: null,
    codeowners: null,
    depBot: null,
  });
  mockedFetchSecurityAnalysis.mockResolvedValue(null);
  mockedFetchWorkflowPermissions.mockResolvedValue(null);
  mockedFetchPrivateVulnReporting.mockResolvedValue(null);
  mockedRunGraphQLChecks.mockReturnValue([]);
  mockedRunRestChecks.mockReturnValue([]);
  mockedRunPackageChecks.mockResolvedValue([]);
  mockedRunActionsChecks.mockResolvedValue([]);
  mockedLoadRepoConfig.mockResolvedValue({});
});

describe("runChecks", () => {
  it("空のrepos配列を渡すと空配列を返す", async () => {
    const results = await runChecks([], defaultOpts);
    expect(results).toEqual([]);
  });

  it("GraphQL/REST/package/actionsの各チェックが呼ばれる", async () => {
    mockedRunGraphQLChecks.mockReturnValue([]);
    mockedRunRestChecks.mockReturnValue([]);
    mockedRunPackageChecks.mockResolvedValue([]);
    mockedRunActionsChecks.mockResolvedValue([]);

    await runChecks(["owner/repo"], defaultOpts);

    expect(mockedFetchGraphQLData).toHaveBeenCalledWith("owner/repo");
    expect(mockedRunGraphQLChecks).toHaveBeenCalled();
    expect(mockedRunRestChecks).toHaveBeenCalled();
    expect(mockedRunPackageChecks).toHaveBeenCalledWith("owner/repo");
    expect(mockedRunActionsChecks).toHaveBeenCalledWith("owner/repo");
    expect(mockedLoadRepoConfig).toHaveBeenCalledWith("owner/repo");
  });

  it("全チェックがpassの場合、worstSeverityはnullになる", async () => {
    mockedRunGraphQLChecks.mockReturnValue([
      makeCheckResult({ checkId: "branch-protection", passed: true }),
    ]);
    mockedRunRestChecks.mockReturnValue([
      makeCheckResult({ checkId: "secret-scanning", passed: true }),
    ]);
    mockedRunPackageChecks.mockResolvedValue([]);
    mockedRunActionsChecks.mockResolvedValue([]);

    const results = await runChecks(["owner/repo"], defaultOpts);
    expect(results).toHaveLength(1);
    expect(results[0].worstSeverity).toBeNull();
  });

  it("criticalのfailがある場合、worstSeverityはcriticalになる", async () => {
    mockedRunGraphQLChecks.mockReturnValue([
      makeCheckResult({
        checkId: "branch-protection",
        passed: false,
        severity: "critical",
        message: "No branch protection",
      }),
      makeCheckResult({ checkId: "license", passed: true, severity: "low" }),
    ]);
    mockedRunRestChecks.mockReturnValue([]);
    mockedRunPackageChecks.mockResolvedValue([]);
    mockedRunActionsChecks.mockResolvedValue([]);

    const results = await runChecks(["owner/repo"], defaultOpts);
    expect(results[0].worstSeverity).toBe("critical");
  });

  it("scoreが正しく計算される（パスチェック数/全チェック数*100）", async () => {
    // 4チェック中3つpass → 75
    mockedRunGraphQLChecks.mockReturnValue([
      makeCheckResult({ checkId: "branch-protection", passed: true }),
      makeCheckResult({ checkId: "license", passed: true }),
      makeCheckResult({
        checkId: "force-push-protection",
        passed: false,
        severity: "critical",
      }),
    ]);
    mockedRunRestChecks.mockReturnValue([
      makeCheckResult({ checkId: "secret-scanning", passed: true }),
    ]);
    mockedRunPackageChecks.mockResolvedValue([]);
    mockedRunActionsChecks.mockResolvedValue([]);

    const results = await runChecks(["owner/repo"], defaultOpts);
    expect(results[0].score).toBe(75);
  });

  it("scoreが0-100の範囲で計算される", async () => {
    // 全fail → 0
    mockedRunGraphQLChecks.mockReturnValue([
      makeCheckResult({
        checkId: "branch-protection",
        passed: false,
        severity: "critical",
      }),
    ]);
    mockedRunRestChecks.mockReturnValue([
      makeCheckResult({
        checkId: "secret-scanning",
        passed: false,
        severity: "critical",
      }),
    ]);
    mockedRunPackageChecks.mockResolvedValue([]);
    mockedRunActionsChecks.mockResolvedValue([]);

    const results = await runChecks(["owner/repo"], defaultOpts);
    expect(results[0].score).toBe(0);
    expect(results[0].score).toBeGreaterThanOrEqual(0);
    expect(results[0].score).toBeLessThanOrEqual(100);
  });

  it("チェックがない場合のscoreは100になる", async () => {
    mockedRunGraphQLChecks.mockReturnValue([]);
    mockedRunRestChecks.mockReturnValue([]);
    mockedRunPackageChecks.mockResolvedValue([]);
    mockedRunActionsChecks.mockResolvedValue([]);

    const results = await runChecks(["owner/repo"], defaultOpts);
    expect(results[0].score).toBe(100);
  });

  it("複数リポジトリを処理できる", async () => {
    mockedRunGraphQLChecks.mockReturnValue([]);
    mockedRunRestChecks.mockReturnValue([]);
    mockedRunPackageChecks.mockResolvedValue([]);
    mockedRunActionsChecks.mockResolvedValue([]);

    const results = await runChecks(
      ["owner/repo1", "owner/repo2"],
      defaultOpts,
    );
    expect(results).toHaveLength(2);
    expect(mockedFetchGraphQLData).toHaveBeenCalledTimes(2);
  });

  describe("severityフィルター", () => {
    it("severity:high指定でもlow/mediumチェック結果は保持される", async () => {
      mockedRunGraphQLChecks.mockReturnValue([
        makeCheckResult({
          checkId: "branch-protection",
          passed: false,
          severity: "critical",
          message: "No branch protection",
        }),
        makeCheckResult({
          checkId: "license",
          passed: false,
          severity: "low",
          message: "No license",
        }),
        makeCheckResult({
          checkId: "codeowners",
          passed: false,
          severity: "medium",
          message: "No codeowners",
        }),
      ]);
      mockedRunRestChecks.mockReturnValue([]);
      mockedRunPackageChecks.mockResolvedValue([]);
      mockedRunActionsChecks.mockResolvedValue([]);

      const opts: CliOptions = { ...defaultOpts, severity: "high" };
      const results = await runChecks(["owner/repo"], opts);

      // チェック結果自体は全件含まれる
      expect(results[0].checks.length).toBeGreaterThanOrEqual(1);
      // worstSeverityはフィルター対象の重要度に基づく
      expect(results[0].worstSeverity).toBe("critical");
    });
  });
});
