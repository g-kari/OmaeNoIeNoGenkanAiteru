import { describe, it, expect } from "vitest";
import {
  checkSecretScanning,
  checkSecretScanningPushProtection,
  checkDependabotSecurityUpdates,
  checkActionsDefaultPermissions,
  checkPrivateVulnReporting,
} from "../../src/checks/rest-checks.js";
import type {
  SecurityAnalysis,
  WorkflowPermissions,
  PrivateVulnReporting,
} from "../../src/types.js";

describe("checkSecretScanning", () => {
  it("secret_scanningがenabledの場合はpassを返す", () => {
    const data: SecurityAnalysis = {
      secret_scanning: { status: "enabled" },
    };
    const result = checkSecretScanning(data);
    expect(result.passed).toBe(true);
    expect(result.checkId).toBe("secret-scanning");
  });

  it("secret_scanningがdisabledの場合はfail(critical)を返す", () => {
    const data: SecurityAnalysis = {
      secret_scanning: { status: "disabled" },
    };
    const result = checkSecretScanning(data);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("critical");
  });

  it("dataがnullの場合はfail(critical)を返す", () => {
    const result = checkSecretScanning(null);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("critical");
  });
});

describe("checkSecretScanningPushProtection", () => {
  it("push_protectionがenabledの場合はpassを返す", () => {
    const data: SecurityAnalysis = {
      secret_scanning_push_protection: { status: "enabled" },
    };
    const result = checkSecretScanningPushProtection(data);
    expect(result.passed).toBe(true);
    expect(result.checkId).toBe("secret-scanning-push-protection");
  });

  it("push_protectionがdisabledの場合はfail(high)を返す", () => {
    const data: SecurityAnalysis = {
      secret_scanning_push_protection: { status: "disabled" },
    };
    const result = checkSecretScanningPushProtection(data);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("high");
  });

  it("dataがnullの場合はfail(high)を返す", () => {
    const result = checkSecretScanningPushProtection(null);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("high");
  });
});

describe("checkDependabotSecurityUpdates", () => {
  it("dependabot_security_updatesがenabledの場合はpassを返す", () => {
    const data: SecurityAnalysis = {
      dependabot_security_updates: { status: "enabled" },
    };
    const result = checkDependabotSecurityUpdates(data);
    expect(result.passed).toBe(true);
    expect(result.checkId).toBe("dependabot-security-updates");
  });

  it("dependabot_security_updatesがdisabledの場合はfail(high)を返す", () => {
    const data: SecurityAnalysis = {
      dependabot_security_updates: { status: "disabled" },
    };
    const result = checkDependabotSecurityUpdates(data);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("high");
  });

  it("dataがnullの場合はfail(high)を返す", () => {
    const result = checkDependabotSecurityUpdates(null);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("high");
  });
});

describe("checkActionsDefaultPermissions", () => {
  it("default_workflow_permissionsがreadの場合はpassを返す", () => {
    const data: WorkflowPermissions = {
      default_workflow_permissions: "read",
      can_approve_pull_request_reviews: false,
    };
    const result = checkActionsDefaultPermissions(data);
    expect(result.passed).toBe(true);
    expect(result.checkId).toBe("actions-default-permissions");
  });

  it("default_workflow_permissionsがwriteの場合はfail(high)を返す", () => {
    const data: WorkflowPermissions = {
      default_workflow_permissions: "write",
      can_approve_pull_request_reviews: true,
    };
    const result = checkActionsDefaultPermissions(data);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("high");
  });

  it("dataがnullの場合はfail(high)を返す", () => {
    const result = checkActionsDefaultPermissions(null);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("high");
  });
});

describe("checkPrivateVulnReporting", () => {
  it("enabledがtrueの場合はpassを返す", () => {
    const data: PrivateVulnReporting = { enabled: true };
    const result = checkPrivateVulnReporting(data);
    expect(result.passed).toBe(true);
    expect(result.checkId).toBe("private-vulnerability-reporting");
  });

  it("enabledがfalseの場合はfail(medium)を返す", () => {
    const data: PrivateVulnReporting = { enabled: false };
    const result = checkPrivateVulnReporting(data);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("medium");
  });

  it("dataがnullの場合はfail(medium)を返す", () => {
    const result = checkPrivateVulnReporting(null);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("medium");
  });
});
