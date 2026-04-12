import type {
  SecurityAnalysis,
  WorkflowPermissions,
  PrivateVulnReporting,
  CheckResult,
} from "../types.js";

export function checkSecretScanning(
  data: SecurityAnalysis | null,
): CheckResult {
  const enabled = data?.secret_scanning?.status === "enabled";
  return {
    checkId: "secret-scanning",
    passed: enabled,
    severity: "critical",
    message: enabled
      ? "シークレットスキャンが有効です"
      : "シークレットスキャンが無効です",
  };
}

export function checkSecretScanningPushProtection(
  data: SecurityAnalysis | null,
): CheckResult {
  const enabled =
    data?.secret_scanning_push_protection?.status === "enabled";
  return {
    checkId: "secret-scanning-push-protection",
    passed: enabled,
    severity: "high",
    message: enabled
      ? "プッシュ保護が有効です"
      : "プッシュ保護が無効です",
  };
}

export function checkDependabotSecurityUpdates(
  data: SecurityAnalysis | null,
): CheckResult {
  const enabled =
    data?.dependabot_security_updates?.status === "enabled";
  return {
    checkId: "dependabot-security-updates",
    passed: enabled,
    severity: "high",
    message: enabled
      ? "Dependabotセキュリティアップデートが有効です"
      : "Dependabotセキュリティアップデートが無効です",
  };
}

export function checkActionsDefaultPermissions(
  data: WorkflowPermissions | null,
): CheckResult {
  const passed = data?.default_workflow_permissions === "read";
  return {
    checkId: "actions-default-permissions",
    passed,
    severity: "high",
    message: passed
      ? "デフォルト権限がreadです"
      : "デフォルト権限がwriteまたは未設定です",
  };
}

export function checkPrivateVulnReporting(
  data: PrivateVulnReporting | null,
): CheckResult {
  const enabled = data?.enabled === true;
  return {
    checkId: "private-vulnerability-reporting",
    passed: enabled,
    severity: "medium",
    message: enabled
      ? "プライベート脆弱性報告が有効です"
      : "プライベート脆弱性報告が無効です",
  };
}

export function runRestChecks(
  securityAnalysis: SecurityAnalysis | null,
  workflowPermissions: WorkflowPermissions | null,
  privateVulnReporting: PrivateVulnReporting | null,
): CheckResult[] {
  return [
    checkSecretScanning(securityAnalysis),
    checkSecretScanningPushProtection(securityAnalysis),
    checkDependabotSecurityUpdates(securityAnalysis),
    checkActionsDefaultPermissions(workflowPermissions),
    checkPrivateVulnReporting(privateVulnReporting),
  ];
}
