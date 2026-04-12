import { parse } from "yaml";
import { ghApi } from "../github/gh.js";
import type { CheckResult } from "../types.js";

const SHA_PATTERN = /^[0-9a-f]{40}$/i;

interface WorkflowListItem {
  name: string;
  path: string;
}

interface WorkflowContentResponse {
  type: string;
  encoding: string;
  content: string;
}

interface WorkflowParsed {
  permissions?: unknown;
  jobs?: Record<
    string,
    {
      permissions?: unknown;
      steps?: Array<{ uses?: string }>;
    }
  >;
}

async function fetchWorkflowList(
  repo: string,
): Promise<WorkflowListItem[]> {
  const raw = await ghApi(
    `/repos/${repo}/contents/.github/workflows`,
  );
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  return data as WorkflowListItem[];
}

async function fetchWorkflowContent(
  repo: string,
  path: string,
): Promise<string> {
  const raw = await ghApi(`/repos/${repo}/contents/${path}`);
  const data = (
    typeof raw === "string" ? JSON.parse(raw) : raw
  ) as WorkflowContentResponse;
  return Buffer.from(data.content, "base64").toString("utf-8");
}

function extractUsesRefs(workflow: WorkflowParsed): string[] {
  const refs: string[] = [];
  if (workflow.jobs) {
    for (const job of Object.values(workflow.jobs)) {
      if (job.steps) {
        for (const step of job.steps) {
          if (step.uses) {
            refs.push(step.uses);
          }
        }
      }
    }
  }
  return refs;
}

function checkPinnedVersions(
  usesRefs: string[],
): CheckResult {
  const unpinned: string[] = [];
  for (const ref of usesRefs) {
    const atIndex = ref.indexOf("@");
    if (atIndex === -1) continue;
    const version = ref.slice(atIndex + 1);
    if (!SHA_PATTERN.test(version)) {
      unpinned.push(ref);
    }
  }
  return {
    checkId: "actions-pinned-versions",
    passed: unpinned.length === 0,
    severity: "critical",
    message:
      unpinned.length === 0
        ? "全ActionsがSHAで固定されています"
        : `SHAで固定されていないActionsがあります: ${unpinned.join(", ")}`,
    details: unpinned.length > 0 ? { unpinned } : undefined,
  };
}

function checkPermissionsScoped(
  workflows: WorkflowParsed[],
): CheckResult {
  const hasPermissions = workflows.some((w) => {
    if (w.permissions !== undefined) return true;
    if (w.jobs) {
      return Object.values(w.jobs).some(
        (j) => j.permissions !== undefined,
      );
    }
    return false;
  });
  return {
    checkId: "actions-permissions-scoped",
    passed: hasPermissions,
    severity: "high",
    message: hasPermissions
      ? "permissionsブロックが定義されています"
      : "permissionsブロックが定義されていません",
  };
}

export async function runActionsChecks(
  repo: string,
): Promise<CheckResult[]> {
  let workflowList: WorkflowListItem[];
  try {
    workflowList = await fetchWorkflowList(repo);
  } catch {
    return [];
  }

  const allUsesRefs: string[] = [];
  const allWorkflows: WorkflowParsed[] = [];

  for (const wf of workflowList) {
    try {
      const content = await fetchWorkflowContent(repo, wf.path);
      const parsed = parse(content) as WorkflowParsed;
      allWorkflows.push(parsed);
      allUsesRefs.push(...extractUsesRefs(parsed));
    } catch {
      // skip unparseable workflows
    }
  }

  if (allWorkflows.length === 0) return [];

  return [
    checkPinnedVersions(allUsesRefs),
    checkPermissionsScoped(allWorkflows),
  ];
}
