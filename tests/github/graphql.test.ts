import { batchFetchRepos } from "../../src/github/graphql.js";
import type { GraphQLRepoData } from "../../src/types.js";
import {
  mockGraphQLResponse,
  mockSecureRepo,
} from "../helpers/mock-gh.js";

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

// ヘルパー: mockExecFileにGraphQLレスポンスをセット
function setGraphQLResponse(data: Record<string, unknown>) {
  mockExecFile.mockImplementation(
    (
      _cmd: string,
      _args: string[],
      cb: (err: Error | null, stdout: string, stderr: string) => void,
    ) => {
      cb(null, mockGraphQLResponse(data), "");
    },
  );
}

describe("batchFetchRepos", () => {
  describe("クエリ構築", () => {
    it("単一リポのクエリが正しく構築される", async () => {
      setGraphQLResponse({
        repo_0: mockSecureRepo("owner/repo"),
      });

      const results = await batchFetchRepos(["owner/repo"]);
      expect(results).toHaveLength(1);
      expect(mockExecFile).toHaveBeenCalledTimes(1);
    });

    it("20リポは1クエリで処理される", async () => {
      const repos = Array.from({ length: 20 }, (_, i) => `owner/repo-${i}`);
      const data: Record<string, unknown> = {};
      for (let i = 0; i < 20; i++) {
        data[`repo_${i}`] = mockSecureRepo(`owner/repo-${i}`);
      }
      setGraphQLResponse(data);

      const results = await batchFetchRepos(repos);
      expect(results).toHaveLength(20);
      expect(mockExecFile).toHaveBeenCalledTimes(1);
    });

    it("21リポは2クエリに分割される", async () => {
      const repos = Array.from({ length: 21 }, (_, i) => `owner/repo-${i}`);

      // 1回目: 20リポ
      const data1: Record<string, unknown> = {};
      for (let i = 0; i < 20; i++) {
        data1[`repo_${i}`] = mockSecureRepo(`owner/repo-${i}`);
      }
      // 2回目: 1リポ
      const data2: Record<string, unknown> = {
        repo_0: mockSecureRepo("owner/repo-20"),
      };

      let callCount = 0;
      mockExecFile.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          cb: (err: Error | null, stdout: string, stderr: string) => void,
        ) => {
          const data = callCount === 0 ? data1 : data2;
          callCount++;
          cb(null, mockGraphQLResponse(data), "");
        },
      );

      const results = await batchFetchRepos(repos);
      expect(results).toHaveLength(21);
      expect(mockExecFile).toHaveBeenCalledTimes(2);
    });
  });

  describe("レスポンスのパース", () => {
    it("GraphQLレスポンスがGraphQLRepoData型に正しく変換される", async () => {
      setGraphQLResponse({
        repo_0: mockSecureRepo("owner/repo"),
      });

      const results = await batchFetchRepos(["owner/repo"]);
      const repo = results[0];

      expect(repo.nameWithOwner).toBe("owner/repo");
      expect(repo.isArchived).toBe(false);
      expect(repo.isFork).toBe(false);
      expect(repo.isPrivate).toBe(false);
      expect(repo.defaultBranchRef).not.toBeNull();
      expect(repo.defaultBranchRef!.name).toBe("main");
      expect(repo.defaultBranchRef!.branchProtectionRule).not.toBeNull();
      expect(
        repo.defaultBranchRef!.branchProtectionRule!.allowsForcePushes,
      ).toBe(false);
      expect(repo.deleteBranchOnMerge).toBe(true);
      expect(repo.hasVulnerabilityAlertsEnabled).toBe(true);
      expect(repo.isSecurityPolicyEnabled).toBe(true);
      expect(repo.licenseInfo).toEqual({ spdxId: "MIT", name: "MIT License" });
      expect(repo.codeowners).toEqual({ errors: [] });
      expect(repo.depBot).toEqual({ byteSize: 200 });
    });
  });

  describe("エラーハンドリング", () => {
    it("GraphQLエラーレスポンスでエラーをthrow", async () => {
      mockExecFile.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          cb: (err: Error | null, stdout: string, stderr: string) => void,
        ) => {
          cb(
            null,
            JSON.stringify({
              errors: [{ message: "Could not resolve to a Repository" }],
            }),
            "",
          );
        },
      );

      await expect(batchFetchRepos(["owner/nonexistent"])).rejects.toThrow();
    });
  });
});
