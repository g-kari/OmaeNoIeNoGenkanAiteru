import { describe, it, expect } from "vitest";
import { applyConfig } from "../../src/config/apply.js";
import type { CheckResult, AiteruConfig } from "../../src/types.js";

const makeCheck = (id: string, passed = false, severity = "high"): CheckResult => ({
  checkId: id as CheckResult["checkId"],
  passed,
  severity: severity as CheckResult["severity"],
  message: "test",
});

describe("applyConfig", () => {
  it("configが空の場合は全チェックをそのまま返す", () => {
    const checks = [makeCheck("branch-protection"), makeCheck("license")];
    expect(applyConfig(checks, {})).toEqual(checks);
  });

  it("enabled:falseのチェックを除外する", () => {
    const checks = [makeCheck("branch-protection"), makeCheck("license")];
    const config: AiteruConfig = {
      checks: { license: { enabled: false } },
    };
    const result = applyConfig(checks, config);
    expect(result).toHaveLength(1);
    expect(result[0].checkId).toBe("branch-protection");
  });

  it("enabled:trueの場合はそのまま含める", () => {
    const checks = [makeCheck("branch-protection")];
    const config: AiteruConfig = {
      checks: { "branch-protection": { enabled: true } },
    };
    expect(applyConfig(checks, config)).toHaveLength(1);
  });

  it("severityを上書きする", () => {
    const checks = [makeCheck("pkg-exact-versions", false, "medium")];
    const config: AiteruConfig = {
      checks: { "pkg-exact-versions": { severity: "low" } },
    };
    const result = applyConfig(checks, config);
    expect(result[0].severity).toBe("low");
  });

  it("enabled:falseかつseverity上書きの場合はチェック自体を除外する", () => {
    const checks = [makeCheck("license")];
    const config: AiteruConfig = {
      checks: { license: { enabled: false, severity: "critical" } },
    };
    expect(applyConfig(checks, config)).toHaveLength(0);
  });

  it("checksがundefinedの場合は全チェックをそのまま返す", () => {
    const checks = [makeCheck("branch-protection")];
    expect(applyConfig(checks, {})).toEqual(checks);
  });
});
