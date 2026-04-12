import { ghGraphQL } from "./gh.js";
import type { GraphQLRepoData } from "../types.js";

const REPO_FRAGMENT = `
fragment RepoFields on Repository {
  nameWithOwner isArchived isFork isPrivate
  defaultBranchRef {
    name
    branchProtectionRule {
      allowsForcePushes requiresApprovingReviews
      requiredApprovingReviewCount requiresStatusChecks isAdminEnforced
    }
  }
  deleteBranchOnMerge hasVulnerabilityAlertsEnabled isSecurityPolicyEnabled
  licenseInfo { spdxId name }
  codeowners { errors { path message } }
  depBot: object(expression: "HEAD:.github/dependabot.yml") { ... on Blob { byteSize } }
}
`;

const BATCH_SIZE = 20;

export async function batchFetchRepos(
  repos: string[],
): Promise<GraphQLRepoData[]> {
  const results: GraphQLRepoData[] = [];

  for (let i = 0; i < repos.length; i += BATCH_SIZE) {
    const batch = repos.slice(i, i + BATCH_SIZE);
    const aliases = batch
      .map((repo, idx) => {
        const [owner, name] = repo.split("/");
        return `repo_${idx}: repository(owner: "${owner}", name: "${name}") { ...RepoFields }`;
      })
      .join("\n");

    const query = `${REPO_FRAGMENT}\nquery { ${aliases} }`;
    const response = (await ghGraphQL(query)) as {
      data?: Record<string, GraphQLRepoData>;
      errors?: Array<{ message: string }>;
    };

    if (response.errors && !response.data) {
      throw new Error(response.errors.map((e) => e.message).join(", "));
    }

    if (response.data) {
      for (let idx = 0; idx < batch.length; idx++) {
        results.push(response.data[`repo_${idx}`]);
      }
    }
  }

  return results;
}

export async function fetchGraphQLData(
  repo: string,
): Promise<GraphQLRepoData> {
  const results = await batchFetchRepos([repo]);
  return results[0];
}
