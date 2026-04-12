import { parse } from "yaml";
import { ghApi } from "../github/gh.js";
import { GhNotFoundError } from "../types.js";
import type { AiteruConfig, CheckId, Severity } from "../types.js";

const VALID_SEVERITIES = new Set<string>(["low", "medium", "high", "critical"]);

function isValidSeverity(v: unknown): v is Severity {
  return typeof v === "string" && VALID_SEVERITIES.has(v);
}

interface ContentsResponse {
  content: string;
  encoding: string;
}

export async function loadRepoConfig(repo: string): Promise<AiteruConfig> {
  let raw: ContentsResponse;
  try {
    raw = await ghApi(`repos/${repo}/contents/.aiteru-zo.yml`) as ContentsResponse;
  } catch (e) {
    if (e instanceof GhNotFoundError) return {};
    // 403 権限不足なども設定なしとして扱う
    return {};
  }

  let content: string;
  try {
    content = Buffer.from(raw.content.replace(/\n/g, ""), "base64").toString("utf-8");
  } catch {
    process.stderr.write(`[aiteru-zo] .aiteru-zo.yml のデコードに失敗しました\n`);
    return {};
  }

  let parsed: unknown;
  try {
    parsed = parse(content);
  } catch {
    process.stderr.write(`[aiteru-zo] .aiteru-zo.yml のパースに失敗しました\n`);
    return {};
  }

  if (!parsed || typeof parsed !== "object") return {};

  const obj = parsed as Record<string, unknown>;
  if (!obj.checks || typeof obj.checks !== "object") return {};

  const checks = obj.checks as Record<string, unknown>;
  const validatedChecks: AiteruConfig["checks"] = {};

  for (const [id, value] of Object.entries(checks)) {
    if (!value || typeof value !== "object") continue;
    const entry = value as Record<string, unknown>;
    const checkEntry: { enabled?: boolean; severity?: Severity } = {};

    if ("enabled" in entry && typeof entry.enabled === "boolean") {
      checkEntry.enabled = entry.enabled;
    }
    if ("severity" in entry) {
      if (isValidSeverity(entry.severity)) {
        checkEntry.severity = entry.severity;
      } else {
        process.stderr.write(`[aiteru-zo] .aiteru-zo.yml: ${id} の severity "${entry.severity}" は無効です（無視します）\n`);
      }
    }

    validatedChecks[id as CheckId] = checkEntry;
  }

  return { checks: validatedChecks };
}
