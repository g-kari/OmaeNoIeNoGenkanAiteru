import { describe, it, expect } from "vitest";
import {
  checkBranchProtection,
  checkForcePushProtection,
  checkVulnerabilityAlerts,
  checkSecurityPolicy,
  checkLicense,
  checkCodeowners,
  checkDependabotConfig,
  checkDeleteBranchOnMerge,
} from "../../src/checks/graphql-checks.js";
import type { GraphQLRepoData } from "../../src/types.js";
import {
  mockSecureRepo,
  mockInsecureRepo,
} from "../helpers/mock-gh.js";

// ヘルパー: mockSecureRepo/mockInsecureRepoをGraphQLRepoData型にキャスト
const secureRepo = mockSecureRepo() as unknown as GraphQLRepoData;
const insecureRepo = mockInsecureRepo() as unknown as GraphQLRepoData;

describe("checkBranchProtection", () => {
  it("branchProtectionRuleが存在する場合はpassを返す", () => {
    const result = checkBranchProtection(secureRepo);
    expect(result.passed).toBe(true);
    expect(result.checkId).toBe("branch-protection");
  });

  it("branchProtectionRuleがnullの場合はfail(critical)を返す", () => {
    const result = checkBranchProtection(insecureRepo);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("critical");
    expect(result.checkId).toBe("branch-protection");
  });

  it("defaultBranchRefがnullの場合はfailを返す", () => {
    const repo: GraphQLRepoData = {
      ...secureRepo,
      defaultBranchRef: null,
    };
    const result = checkBranchProtection(repo);
    expect(result.passed).toBe(false);
  });
});

describe("checkForcePushProtection", () => {
  it("allowsForcePushesがfalseの場合はpassを返す", () => {
    const result = checkForcePushProtection(secureRepo);
    expect(result.passed).toBe(true);
    expect(result.checkId).toBe("force-push-protection");
  });

  it("allowsForcePushesがtrueの場合はfail(critical)を返す", () => {
    const repo: GraphQLRepoData = {
      ...secureRepo,
      defaultBranchRef: {
        name: "main",
        branchProtectionRule: {
          ...secureRepo.defaultBranchRef!.branchProtectionRule!,
          allowsForcePushes: true,
        },
      },
    };
    const result = checkForcePushProtection(repo);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("critical");
  });

  it("branchProtectionRuleがnullの場合はfailを返す", () => {
    const result = checkForcePushProtection(insecureRepo);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("critical");
  });
});

describe("checkVulnerabilityAlerts", () => {
  it("hasVulnerabilityAlertsEnabledがtrueの場合はpassを返す", () => {
    const result = checkVulnerabilityAlerts(secureRepo);
    expect(result.passed).toBe(true);
    expect(result.checkId).toBe("vulnerability-alerts");
  });

  it("hasVulnerabilityAlertsEnabledがfalseの場合はfail(high)を返す", () => {
    const result = checkVulnerabilityAlerts(insecureRepo);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("high");
  });
});

describe("checkSecurityPolicy", () => {
  it("isSecurityPolicyEnabledがtrueの場合はpassを返す", () => {
    const result = checkSecurityPolicy(secureRepo);
    expect(result.passed).toBe(true);
    expect(result.checkId).toBe("security-policy");
  });

  it("isSecurityPolicyEnabledがfalseの場合はfail(medium)を返す", () => {
    const result = checkSecurityPolicy(insecureRepo);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("medium");
  });
});

describe("checkLicense", () => {
  it("licenseInfoが存在する場合はpassを返す", () => {
    const result = checkLicense(secureRepo);
    expect(result.passed).toBe(true);
    expect(result.checkId).toBe("license");
  });

  it("licenseInfoがnullの場合はfail(low)を返す", () => {
    const result = checkLicense(insecureRepo);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("low");
  });
});

describe("checkCodeowners", () => {
  it("codeownersが存在する場合はpassを返す", () => {
    const result = checkCodeowners(secureRepo);
    expect(result.passed).toBe(true);
    expect(result.checkId).toBe("codeowners");
  });

  it("codeownersがnullの場合はfail(medium)を返す", () => {
    const result = checkCodeowners(insecureRepo);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("medium");
  });
});

describe("checkDependabotConfig", () => {
  it("depBotが存在する場合はpassを返す", () => {
    const result = checkDependabotConfig(secureRepo);
    expect(result.passed).toBe(true);
    expect(result.checkId).toBe("dependabot-config");
  });

  it("depBotがnullの場合はfail(medium)を返す", () => {
    const result = checkDependabotConfig(insecureRepo);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("medium");
  });
});

describe("checkDeleteBranchOnMerge", () => {
  it("deleteBranchOnMergeがtrueの場合はpassを返す", () => {
    const result = checkDeleteBranchOnMerge(secureRepo);
    expect(result.passed).toBe(true);
    expect(result.checkId).toBe("delete-branch-on-merge");
  });

  it("deleteBranchOnMergeがfalseの場合はfail(low)を返す", () => {
    const result = checkDeleteBranchOnMerge(insecureRepo);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("low");
  });
});
