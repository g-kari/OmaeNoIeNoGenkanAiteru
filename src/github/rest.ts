import { ghApi } from "./gh.js";
import { GhCliError } from "../types.js";
import type {
  SecurityAnalysis,
  WorkflowPermissions,
  PrivateVulnReporting,
} from "../types.js";

export async function fetchSecurityAnalysis(
  repo: string,
): Promise<SecurityAnalysis | null> {
  try {
    const response = (await ghApi(`/repos/${repo}`)) as {
      security_and_analysis?: SecurityAnalysis;
    };
    return response.security_and_analysis ?? null;
  } catch (err) {
    if (err instanceof GhCliError) return null;
    throw err;
  }
}

export async function fetchWorkflowPermissions(
  repo: string,
): Promise<WorkflowPermissions | null> {
  try {
    return (await ghApi(
      `/repos/${repo}/actions/permissions/workflow`,
    )) as WorkflowPermissions;
  } catch (err) {
    if (err instanceof GhCliError) return null;
    throw err;
  }
}

export async function fetchPrivateVulnReporting(
  repo: string,
): Promise<PrivateVulnReporting | null> {
  try {
    return (await ghApi(
      `/repos/${repo}/private-vulnerability-reporting`,
    )) as PrivateVulnReporting;
  } catch (err) {
    if (err instanceof GhCliError) return null;
    throw err;
  }
}
