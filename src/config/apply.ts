import type { CheckResult, AiteruConfig } from "../types.js";

export function applyConfig(checks: CheckResult[], config: AiteruConfig): CheckResult[] {
  if (!config.checks) return checks;

  return checks
    .filter((check) => {
      const entry = config.checks?.[check.checkId];
      return entry?.enabled !== false;
    })
    .map((check) => {
      const entry = config.checks?.[check.checkId];
      if (!entry?.severity) return check;
      return { ...check, severity: entry.severity };
    });
}
