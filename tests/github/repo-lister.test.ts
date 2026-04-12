import { listRepos } from "../../src/github/repo-lister.js";
import type { CliOptions } from "../../src/types.js";
import { mockGraphQLResponse } from "../helpers/mock-gh.js";

// child_processモック
const { mockExecFile } = vi.hoisted(() => ({
  mockExecFile: vi.fn(),
}));
vi.mock("node:child_process", () => ({
  execFile: mockExecFile,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// デフォルトのCliOptions
function defaultOptions(
  overrides: Partial<CliOptions> = {},
): CliOptions {
  return {
    format: "console",
    severity: "low",
    includeArchived: false,
    includeFork: false,
    createIssues: false,
    dryRun: false,
    ...overrides,
  };
}

// ヘルパー: GraphQLレスポンスのページネーション付きリポ一覧
function mockRepoListResponse(
  repos: Array<{
    nameWithOwner: string;
    isArchived?: boolean;
    isFork?: boolean;
  }>,
  hasNextPage = false,
  endCursor = "cursor123",
) {
  return {
    repositoryOwner: {
      repositories: {
        pageInfo: {
          hasNextPage,
          endCursor,
        },
        nodes: repos.map((r) => ({
          nameWithOwner: r.nameWithOwner,
          isArchived: r.isArchived ?? false,
          isFork: r.isFork ?? false,
        })),
      },
    },
  };
}

// viewerのリポ一覧レスポンス
function mockViewerRepoListResponse(
  repos: Array<{
    nameWithOwner: string;
    isArchived?: boolean;
    isFork?: boolean;
  }>,
  hasNextPage = false,
  endCursor = "cursor123",
) {
  return {
    viewer: {
      repositories: {
        pageInfo: {
          hasNextPage,
          endCursor,
        },
        nodes: repos.map((r) => ({
          nameWithOwner: r.nameWithOwner,
          isArchived: r.isArchived ?? false,
          isFork: r.isFork ?? false,
        })),
      },
    },
  };
}

describe("listRepos", () => {
  describe("--repo指定", () => {
    it('単一リポを["owner/repo"]で返す', async () => {
      const opts = defaultOptions({ repo: "owner/repo" });

      const result = await listRepos(opts);

      expect(result).toEqual(["owner/repo"]);
      // gh CLIは呼ばれない
      expect(mockExecFile).not.toHaveBeenCalled();
    });
  });

  describe("--org指定", () => {
    it("GraphQLで組織のリポ一覧を取得", async () => {
      mockExecFile.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          cb: (err: Error | null, stdout: string, stderr: string) => void,
        ) => {
          cb(
            null,
            mockGraphQLResponse(
              mockRepoListResponse([
                { nameWithOwner: "my-org/repo-1" },
                { nameWithOwner: "my-org/repo-2" },
              ]),
            ),
            "",
          );
        },
      );

      const opts = defaultOptions({ org: "my-org" });
      const result = await listRepos(opts);

      expect(result).toContain("my-org/repo-1");
      expect(result).toContain("my-org/repo-2");
    });
  });

  describe("--user指定", () => {
    it("GraphQLでユーザーのリポ一覧を取得", async () => {
      mockExecFile.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          cb: (err: Error | null, stdout: string, stderr: string) => void,
        ) => {
          cb(
            null,
            mockGraphQLResponse(
              mockRepoListResponse([
                { nameWithOwner: "my-user/repo-1" },
                { nameWithOwner: "my-user/repo-2" },
              ]),
            ),
            "",
          );
        },
      );

      const opts = defaultOptions({ user: "my-user" });
      const result = await listRepos(opts);

      expect(result).toContain("my-user/repo-1");
      expect(result).toContain("my-user/repo-2");
    });
  });

  describe("引数なし", () => {
    it("viewerのリポ一覧を返す", async () => {
      mockExecFile.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          cb: (err: Error | null, stdout: string, stderr: string) => void,
        ) => {
          cb(
            null,
            mockGraphQLResponse(
              mockViewerRepoListResponse([
                { nameWithOwner: "viewer/repo-1" },
                { nameWithOwner: "viewer/repo-2" },
              ]),
            ),
            "",
          );
        },
      );

      const opts = defaultOptions();
      const result = await listRepos(opts);

      expect(result).toContain("viewer/repo-1");
      expect(result).toContain("viewer/repo-2");
    });
  });

  describe("フィルタリング", () => {
    it("isArchived:trueのリポを--include-archivedなしで除外", async () => {
      mockExecFile.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          cb: (err: Error | null, stdout: string, stderr: string) => void,
        ) => {
          cb(
            null,
            mockGraphQLResponse(
              mockRepoListResponse([
                { nameWithOwner: "org/active-repo", isArchived: false },
                { nameWithOwner: "org/archived-repo", isArchived: true },
              ]),
            ),
            "",
          );
        },
      );

      const opts = defaultOptions({ org: "org", includeArchived: false });
      const result = await listRepos(opts);

      expect(result).toContain("org/active-repo");
      expect(result).not.toContain("org/archived-repo");
    });

    it("isArchived:trueのリポを--include-archivedありで含む", async () => {
      mockExecFile.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          cb: (err: Error | null, stdout: string, stderr: string) => void,
        ) => {
          cb(
            null,
            mockGraphQLResponse(
              mockRepoListResponse([
                { nameWithOwner: "org/active-repo", isArchived: false },
                { nameWithOwner: "org/archived-repo", isArchived: true },
              ]),
            ),
            "",
          );
        },
      );

      const opts = defaultOptions({ org: "org", includeArchived: true });
      const result = await listRepos(opts);

      expect(result).toContain("org/active-repo");
      expect(result).toContain("org/archived-repo");
    });

    it("isFork:trueのリポを--include-forkなしで除外", async () => {
      mockExecFile.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          cb: (err: Error | null, stdout: string, stderr: string) => void,
        ) => {
          cb(
            null,
            mockGraphQLResponse(
              mockRepoListResponse([
                { nameWithOwner: "org/original-repo", isFork: false },
                { nameWithOwner: "org/forked-repo", isFork: true },
              ]),
            ),
            "",
          );
        },
      );

      const opts = defaultOptions({ org: "org", includeFork: false });
      const result = await listRepos(opts);

      expect(result).toContain("org/original-repo");
      expect(result).not.toContain("org/forked-repo");
    });

    it("isFork:trueのリポを--include-forkありで含む", async () => {
      mockExecFile.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          cb: (err: Error | null, stdout: string, stderr: string) => void,
        ) => {
          cb(
            null,
            mockGraphQLResponse(
              mockRepoListResponse([
                { nameWithOwner: "org/original-repo", isFork: false },
                { nameWithOwner: "org/forked-repo", isFork: true },
              ]),
            ),
            "",
          );
        },
      );

      const opts = defaultOptions({ org: "org", includeFork: true });
      const result = await listRepos(opts);

      expect(result).toContain("org/original-repo");
      expect(result).toContain("org/forked-repo");
    });
  });

  describe("ページネーション", () => {
    it("hasNextPage:trueの場合、次ページを取得する", async () => {
      let callCount = 0;
      mockExecFile.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          cb: (err: Error | null, stdout: string, stderr: string) => void,
        ) => {
          if (callCount === 0) {
            callCount++;
            cb(
              null,
              mockGraphQLResponse(
                mockRepoListResponse(
                  [{ nameWithOwner: "org/repo-1" }],
                  true, // hasNextPage
                  "cursor-page1",
                ),
              ),
              "",
            );
          } else {
            cb(
              null,
              mockGraphQLResponse(
                mockRepoListResponse(
                  [{ nameWithOwner: "org/repo-2" }],
                  false, // 最後のページ
                ),
              ),
              "",
            );
          }
        },
      );

      const opts = defaultOptions({ org: "org" });
      const result = await listRepos(opts);

      expect(result).toContain("org/repo-1");
      expect(result).toContain("org/repo-2");
      expect(mockExecFile).toHaveBeenCalledTimes(2);
    });
  });
});
