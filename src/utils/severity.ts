import type { Severity, CheckResult } from "../types.js";
import { SEVERITY_ORDER } from "../types.js";

export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_ORDER[a] - SEVERITY_ORDER[b];
}

export function getWorstSeverity(results: CheckResult[]): Severity | null {
  let worst: Severity | null = null;
  for (const r of results) {
    if (!r.passed) {
      if (worst === null || SEVERITY_ORDER[r.severity] > SEVERITY_ORDER[worst]) {
        worst = r.severity;
      }
    }
  }
  return worst;
}

export function computeScore(results: CheckResult[]): number {
  if (results.length === 0) return 100;
  const passed = results.filter((r) => r.passed).length;
  return Math.round((passed / results.length) * 100);
}
