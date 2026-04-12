import { ghGraphQL } from "./gh.js";
import type { CliOptions } from "../types.js";

interface RepoNode {
  nameWithOwner: string;
  isArchived: boolean;
  isFork: boolean;
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string;
}

interface ReposConnection {
  pageInfo: PageInfo;
  nodes: RepoNode[];
}

export async function listRepos(opts: CliOptions): Promise<string[]> {
  if (opts.repo) {
    return [opts.repo];
  }

  const allRepos: RepoNode[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const afterClause = cursor ? `, after: "${cursor}"` : "";

    let query: string;
    if (opts.org) {
      query = `query {
        repositoryOwner(login: "${opts.org}") {
          repositories(first: 100${afterClause}) {
            pageInfo { hasNextPage endCursor }
            nodes { nameWithOwner isArchived isFork }
          }
        }
      }`;
    } else if (opts.user) {
      query = `query {
        repositoryOwner(login: "${opts.user}") {
          repositories(first: 100${afterClause}) {
            pageInfo { hasNextPage endCursor }
            nodes { nameWithOwner isArchived isFork }
          }
        }
      }`;
    } else {
      query = `query {
        viewer {
          repositories(first: 100${afterClause}) {
            pageInfo { hasNextPage endCursor }
            nodes { nameWithOwner isArchived isFork }
          }
        }
      }`;
    }

    const response = (await ghGraphQL(query)) as {
      data: {
        repositoryOwner?: { repositories: ReposConnection };
        viewer?: { repositories: ReposConnection };
      };
    };

    const repos =
      response.data.repositoryOwner?.repositories ??
      response.data.viewer?.repositories;

    if (!repos) break;

    allRepos.push(...repos.nodes);
    hasNextPage = repos.pageInfo.hasNextPage;
    cursor = repos.pageInfo.endCursor;
  }

  return allRepos
    .filter((r) => opts.includeArchived || !r.isArchived)
    .filter((r) => opts.includeFork || !r.isFork)
    .map((r) => r.nameWithOwner);
}
