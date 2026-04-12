import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockSafePackageJson,
  mockDangerousPackageJson,
  mockContentsResponse,
  mockNotFound,
} from "../helpers/mock-gh.js";

// gh CLI呼び出しをモック化
vi.mock("../../src/github/gh.js", () => ({
  ghApi: vi.fn(),
}));

import { ghApi } from "../../src/github/gh.js";
import { runPackageChecks } from "../../src/checks/package-checks.js";

const mockedGhApi = vi.mocked(ghApi);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runPackageChecks", () => {
  describe("package.jsonが存在しない場合", () => {
    it("全チェックをスキップして空配列を返す", async () => {
      mockedGhApi.mockRejectedValue(new Error("Not Found"));

      const results = await runPackageChecks("owner/repo");
      expect(results).toEqual([]);
    });
  });

  describe("lockfileチェック", () => {
    it("package-lock.jsonが存在する場合はpassを返す", async () => {
      // package.json取得
      mockedGhApi.mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("/contents/package.json")) {
          return JSON.stringify(
            mockContentsResponse(JSON.stringify(mockSafePackageJson())),
          );
        }
        if (endpoint.includes("/contents/package-lock.json")) {
          return JSON.stringify({ type: "file" });
        }
        if (endpoint.includes("/contents/yarn.lock")) {
          throw new Error("Not Found");
        }
        // workflowsなど他のAPI呼び出しはデフォルトでエラー
        throw new Error("Not Found");
      });

      const results = await runPackageChecks("owner/repo");
      const lockfileCheck = results.find(
        (r) => r.checkId === "pkg-lockfile-exists",
      );
      expect(lockfileCheck).toBeDefined();
      expect(lockfileCheck!.passed).toBe(true);
    });

    it("yarn.lockが存在する場合もpassを返す", async () => {
      mockedGhApi.mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("/contents/package.json")) {
          return JSON.stringify(
            mockContentsResponse(JSON.stringify(mockSafePackageJson())),
          );
        }
        if (endpoint.includes("/contents/package-lock.json")) {
          throw new Error("Not Found");
        }
        if (endpoint.includes("/contents/yarn.lock")) {
          return JSON.stringify({ type: "file" });
        }
        throw new Error("Not Found");
      });

      const results = await runPackageChecks("owner/repo");
      const lockfileCheck = results.find(
        (r) => r.checkId === "pkg-lockfile-exists",
      );
      expect(lockfileCheck).toBeDefined();
      expect(lockfileCheck!.passed).toBe(true);
    });

    it("lockfileが一つも存在しない場合はfail(critical)を返す", async () => {
      mockedGhApi.mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("/contents/package.json")) {
          return JSON.stringify(
            mockContentsResponse(JSON.stringify(mockSafePackageJson())),
          );
        }
        // lockfileは全部404
        throw new Error("Not Found");
      });

      const results = await runPackageChecks("owner/repo");
      const lockfileCheck = results.find(
        (r) => r.checkId === "pkg-lockfile-exists",
      );
      expect(lockfileCheck).toBeDefined();
      expect(lockfileCheck!.passed).toBe(false);
      expect(lockfileCheck!.severity).toBe("critical");
    });
  });

  describe("lifecycleスクリプトチェック", () => {
    it("postinstallにcurlを含む場合はfail(critical)を返す", async () => {
      mockedGhApi.mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("/contents/package.json")) {
          return JSON.stringify(
            mockContentsResponse(
              JSON.stringify(mockDangerousPackageJson()),
            ),
          );
        }
        throw new Error("Not Found");
      });

      const results = await runPackageChecks("owner/repo");
      const lifecycleCheck = results.find(
        (r) => r.checkId === "pkg-lifecycle-scripts",
      );
      expect(lifecycleCheck).toBeDefined();
      expect(lifecycleCheck!.passed).toBe(false);
      expect(lifecycleCheck!.severity).toBe("critical");
    });

    it("危険なlifecycleスクリプトがない場合はpassを返す", async () => {
      mockedGhApi.mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("/contents/package.json")) {
          return JSON.stringify(
            mockContentsResponse(JSON.stringify(mockSafePackageJson())),
          );
        }
        throw new Error("Not Found");
      });

      const results = await runPackageChecks("owner/repo");
      const lifecycleCheck = results.find(
        (r) => r.checkId === "pkg-lifecycle-scripts",
      );
      expect(lifecycleCheck).toBeDefined();
      expect(lifecycleCheck!.passed).toBe(true);
    });
  });

  describe("privateフィールドチェック", () => {
    it("private:trueの場合はpassを返す", async () => {
      mockedGhApi.mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("/contents/package.json")) {
          return JSON.stringify(
            mockContentsResponse(JSON.stringify(mockSafePackageJson())),
          );
        }
        throw new Error("Not Found");
      });

      const results = await runPackageChecks("owner/repo");
      const privateCheck = results.find(
        (r) => r.checkId === "pkg-private-field",
      );
      expect(privateCheck).toBeDefined();
      expect(privateCheck!.passed).toBe(true);
    });

    it("privateフィールドがない場合はfail(medium)を返す", async () => {
      const pkgWithoutPrivate = mockSafePackageJson();
      delete pkgWithoutPrivate.private;

      mockedGhApi.mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("/contents/package.json")) {
          return JSON.stringify(
            mockContentsResponse(JSON.stringify(pkgWithoutPrivate)),
          );
        }
        throw new Error("Not Found");
      });

      const results = await runPackageChecks("owner/repo");
      const privateCheck = results.find(
        (r) => r.checkId === "pkg-private-field",
      );
      expect(privateCheck).toBeDefined();
      expect(privateCheck!.passed).toBe(false);
      expect(privateCheck!.severity).toBe("medium");
    });
  });

  describe("enginesフィールドチェック", () => {
    it("enginesフィールドがある場合はpassを返す", async () => {
      mockedGhApi.mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("/contents/package.json")) {
          return JSON.stringify(
            mockContentsResponse(JSON.stringify(mockSafePackageJson())),
          );
        }
        throw new Error("Not Found");
      });

      const results = await runPackageChecks("owner/repo");
      const enginesCheck = results.find(
        (r) => r.checkId === "pkg-engines-field",
      );
      expect(enginesCheck).toBeDefined();
      expect(enginesCheck!.passed).toBe(true);
    });

    it("enginesフィールドがない場合はfail(low)を返す", async () => {
      const pkgWithoutEngines = mockSafePackageJson();
      delete pkgWithoutEngines.engines;

      mockedGhApi.mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("/contents/package.json")) {
          return JSON.stringify(
            mockContentsResponse(JSON.stringify(pkgWithoutEngines)),
          );
        }
        throw new Error("Not Found");
      });

      const results = await runPackageChecks("owner/repo");
      const enginesCheck = results.find(
        (r) => r.checkId === "pkg-engines-field",
      );
      expect(enginesCheck).toBeDefined();
      expect(enginesCheck!.passed).toBe(false);
      expect(enginesCheck!.severity).toBe("low");
    });
  });

  describe("依存バージョン固定チェック", () => {
    it("固定バージョンのみの場合はpassを返す", async () => {
      // mockSafePackageJsonはexpress: "4.18.0"（固定）
      mockedGhApi.mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("/contents/package.json")) {
          return JSON.stringify(
            mockContentsResponse(JSON.stringify(mockSafePackageJson())),
          );
        }
        throw new Error("Not Found");
      });

      const results = await runPackageChecks("owner/repo");
      const versionCheck = results.find(
        (r) => r.checkId === "pkg-exact-versions",
      );
      expect(versionCheck).toBeDefined();
      expect(versionCheck!.passed).toBe(true);
    });

    it("^付きバージョンを含む場合はfail(medium)を返す", async () => {
      // mockDangerousPackageJsonはlodash: "^4.17.21"
      mockedGhApi.mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("/contents/package.json")) {
          return JSON.stringify(
            mockContentsResponse(
              JSON.stringify(mockDangerousPackageJson()),
            ),
          );
        }
        throw new Error("Not Found");
      });

      const results = await runPackageChecks("owner/repo");
      const versionCheck = results.find(
        (r) => r.checkId === "pkg-exact-versions",
      );
      expect(versionCheck).toBeDefined();
      expect(versionCheck!.passed).toBe(false);
      expect(versionCheck!.severity).toBe("medium");
    });
  });
});
