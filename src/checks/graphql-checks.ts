import type { GraphQLRepoData, CheckResult } from "../types.js";

export function checkBranchProtection(data: GraphQLRepoData): CheckResult {
  const rule = data.defaultBranchRef?.branchProtectionRule;
  return {
    checkId: "branch-protection",
    passed: rule !== null && rule !== undefined,
    severity: "critical",
    message: rule ? "ブランチ保護が有効です" : "ブランチ保護が設定されていません",
  };
}

export function checkForcePushProtection(data: GraphQLRepoData): CheckResult {
  const rule = data.defaultBranchRef?.branchProtectionRule;
  const passed = rule !== null && rule !== undefined && !rule.allowsForcePushes;
  return {
    checkId: "force-push-protection",
    passed,
    severity: "critical",
    message: passed
      ? "フォースプッシュが禁止されています"
      : "フォースプッシュが許可されています",
  };
}

export function checkVulnerabilityAlerts(data: GraphQLRepoData): CheckResult {
  return {
    checkId: "vulnerability-alerts",
    passed: data.hasVulnerabilityAlertsEnabled,
    severity: "high",
    message: data.hasVulnerabilityAlertsEnabled
      ? "脆弱性アラートが有効です"
      : "脆弱性アラートが無効です",
  };
}

export function checkSecurityPolicy(data: GraphQLRepoData): CheckResult {
  return {
    checkId: "security-policy",
    passed: data.isSecurityPolicyEnabled,
    severity: "medium",
    message: data.isSecurityPolicyEnabled
      ? "セキュリティポリシーが設定されています"
      : "セキュリティポリシーが設定されていません",
  };
}

export function checkLicense(data: GraphQLRepoData): CheckResult {
  return {
    checkId: "license",
    passed: data.licenseInfo !== null,
    severity: "low",
    message: data.licenseInfo
      ? `ライセンス: ${data.licenseInfo.spdxId}`
      : "ライセンスが設定されていません",
  };
}

export function checkCodeowners(data: GraphQLRepoData): CheckResult {
  return {
    checkId: "codeowners",
    passed: data.codeowners !== null,
    severity: "medium",
    message: data.codeowners
      ? "CODEOWNERSが設定されています"
      : "CODEOWNERSが設定されていません",
  };
}

export function checkDependabotConfig(data: GraphQLRepoData): CheckResult {
  return {
    checkId: "dependabot-config",
    passed: data.depBot !== null,
    severity: "medium",
    message: data.depBot
      ? "dependabot.ymlが存在します"
      : "dependabot.ymlが存在しません",
  };
}

export function checkDeleteBranchOnMerge(data: GraphQLRepoData): CheckResult {
  return {
    checkId: "delete-branch-on-merge",
    passed: data.deleteBranchOnMerge,
    severity: "low",
    message: data.deleteBranchOnMerge
      ? "マージ後ブランチ削除が有効です"
      : "マージ後ブランチ削除が無効です",
  };
}

export function runGraphQLChecks(data: GraphQLRepoData): CheckResult[] {
  return [
    checkBranchProtection(data),
    checkForcePushProtection(data),
    checkVulnerabilityAlerts(data),
    checkSecurityPolicy(data),
    checkLicense(data),
    checkCodeowners(data),
    checkDependabotConfig(data),
    checkDeleteBranchOnMerge(data),
  ];
}
