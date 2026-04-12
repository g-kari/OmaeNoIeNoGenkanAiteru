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
import { computeScore, getWorstSeverity, scoreToGrade } from "../utils/severity.js";
import { runWithConcurrency } from "../utils/concurrency.js";
import { loadRepoConfig } from "../config/loader.js";
import { applyConfig } from "../config/apply.js";

async function auditRepo(
  repo: string,
  _opts: CliOptions,
): Promise<RepoAuditResult> {
  const [graphqlData, config] = await Promise.all([
    fetchGraphQLData(repo),
    loadRepoConfig(repo),
  ]);

  const [sa, wp, pvr] = await Promise.all([
    fetchSecurityAnalysis(repo),
    fetchWorkflowPermissions(repo),
    fetchPrivateVulnReporting(repo),
  ]);

  const graphqlChecks = runGraphQLChecks(graphqlData);
  const restChecks = runRestChecks(sa, wp, pvr);
  const packageChecks = await runPackageChecks(repo);
  const actionsChecks = await runActionsChecks(repo);

  const allChecks = applyConfig(
    [...graphqlChecks, ...restChecks, ...packageChecks, ...actionsChecks],
    config,
  );

  const score = computeScore(allChecks);
  return {
    repo,
    isArchived: graphqlData.isArchived,
    isFork: graphqlData.isFork,
    isPrivate: graphqlData.isPrivate,
    checks: allChecks,
    score,
    grade: scoreToGrade(score),
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
      grade: "F",
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
