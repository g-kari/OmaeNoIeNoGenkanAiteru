import type { CliOptions, RepoAuditResult } from "../types.js";
import { fetchGraphQLData } from "../github/graphql.js";
import {
  fetchSecurityAnalysis,
  fetchWorkflowPermissions,
  fetchPrivateVulnReporting,
} from "../github/rest.js";
import { runGraphQLChecks } from "./graphql-checks.js";
import { runRestChecks } from "./rest-checks.js";
import { runPackageChecks } from "./package-checks.js";
import { runActionsChecks } from "./actions-checks.js";
import { computeScore, getWorstSeverity } from "../utils/severity.js";
import { runWithConcurrency } from "../utils/concurrency.js";

async function auditRepo(
  repo: string,
  _opts: CliOptions,
): Promise<RepoAuditResult> {
  const graphqlData = await fetchGraphQLData(repo);

  const [sa, wp, pvr] = await Promise.all([
    fetchSecurityAnalysis(repo),
    fetchWorkflowPermissions(repo),
    fetchPrivateVulnReporting(repo),
  ]);

  const graphqlChecks = runGraphQLChecks(graphqlData);
  const restChecks = runRestChecks(sa, wp, pvr);
  const packageChecks = await runPackageChecks(repo);
  const actionsChecks = await runActionsChecks(repo);

  const allChecks = [
    ...graphqlChecks,
    ...restChecks,
    ...packageChecks,
    ...actionsChecks,
  ];

  return {
    repo,
    isArchived: graphqlData.isArchived,
    isFork: graphqlData.isFork,
    isPrivate: graphqlData.isPrivate,
    checks: allChecks,
    score: computeScore(allChecks),
    worstSeverity: getWorstSeverity(allChecks),
  };
}

async function auditRepoSafe(
  repo: string,
  opts: CliOptions,
): Promise<RepoAuditResult> {
  try {
    return await auditRepo(repo, opts);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      repo,
      isArchived: false,
      isFork: false,
      isPrivate: false,
      checks: [],
      score: 0,
      worstSeverity: null,
      error: message,
    };
  }
}

export async function runChecks(
  repos: string[],
  opts: CliOptions,
): Promise<RepoAuditResult[]> {
  if (repos.length === 0) return [];
  return runWithConcurrency(repos, 5, (repo) => auditRepoSafe(repo, opts));
}
