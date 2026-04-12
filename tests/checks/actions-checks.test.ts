import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockSafeWorkflow,
  mockUnsafeWorkflow,
} from "../helpers/mock-gh.js";

// gh CLI呼び出しをモック化
vi.mock("../../src/github/gh.js", () => ({
  ghApi: vi.fn(),
}));

import { ghApi } from "../../src/github/gh.js";
import { runActionsChecks } from "../../src/checks/actions-checks.js";

const mockedGhApi = vi.mocked(ghApi);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runActionsChecks", () => {
  describe("workflowsが存在しない場合", () => {
    it("全チェックをスキップして空配列を返す", async () => {
      mockedGhApi.mockRejectedValue(new Error("Not Found"));

      const results = await runActionsChecks("owner/repo");
      expect(results).toEqual([]);
    });
  });

  describe("アクションのバージョン固定チェック", () => {
    it("SHA固定の場合はpassを返す", async () => {
      mockedGhApi.mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("/contents/.github/workflows/ci.yml")) {
          return JSON.stringify({
            type: "file",
            encoding: "base64",
            content: Buffer.from(mockSafeWorkflow).toString("base64"),
          });
        }
        if (endpoint.includes("/contents/.github/workflows")) {
          return JSON.stringify([
            { name: "ci.yml", path: ".github/workflows/ci.yml" },
          ]);
        }
        throw new Error("Not Found");
      });

      const results = await runActionsChecks("owner/repo");
      const pinnedCheck = results.find(
        (r) => r.checkId === "actions-pinned-versions",
      );
      expect(pinnedCheck).toBeDefined();
      expect(pinnedCheck!.passed).toBe(true);
    });

    it("タグ指定(v4)の場合はfail(critical)を返す", async () => {
      mockedGhApi.mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("/contents/.github/workflows/ci.yml")) {
          return JSON.stringify({
            type: "file",
            encoding: "base64",
            content: Buffer.from(mockUnsafeWorkflow).toString("base64"),
          });
        }
        if (endpoint.includes("/contents/.github/workflows")) {
          return JSON.stringify([
            { name: "ci.yml", path: ".github/workflows/ci.yml" },
          ]);
        }
        throw new Error("Not Found");
      });

      const results = await runActionsChecks("owner/repo");
      const pinnedCheck = results.find(
        (r) => r.checkId === "actions-pinned-versions",
      );
      expect(pinnedCheck).toBeDefined();
      expect(pinnedCheck!.passed).toBe(false);
      expect(pinnedCheck!.severity).toBe("critical");
    });

    it("ブランチ指定(main)の場合はfail(critical)を返す", async () => {
      const branchWorkflow = `
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@main
`;
      mockedGhApi.mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("/contents/.github/workflows/ci.yml")) {
          return JSON.stringify({
            type: "file",
            encoding: "base64",
            content: Buffer.from(branchWorkflow).toString("base64"),
          });
        }
        if (endpoint.includes("/contents/.github/workflows")) {
          return JSON.stringify([
            { name: "ci.yml", path: ".github/workflows/ci.yml" },
          ]);
        }
        throw new Error("Not Found");
      });

      const results = await runActionsChecks("owner/repo");
      const pinnedCheck = results.find(
        (r) => r.checkId === "actions-pinned-versions",
      );
      expect(pinnedCheck).toBeDefined();
      expect(pinnedCheck!.passed).toBe(false);
      expect(pinnedCheck!.severity).toBe("critical");
    });
  });

  describe("permissionsブロックチェック", () => {
    it("permissionsが定義されている場合はpassを返す", async () => {
      mockedGhApi.mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("/contents/.github/workflows/ci.yml")) {
          return JSON.stringify({
            type: "file",
            encoding: "base64",
            content: Buffer.from(mockSafeWorkflow).toString("base64"),
          });
        }
        if (endpoint.includes("/contents/.github/workflows")) {
          return JSON.stringify([
            { name: "ci.yml", path: ".github/workflows/ci.yml" },
          ]);
        }
        throw new Error("Not Found");
      });

      const results = await runActionsChecks("owner/repo");
      const permCheck = results.find(
        (r) => r.checkId === "actions-permissions-scoped",
      );
      expect(permCheck).toBeDefined();
      expect(permCheck!.passed).toBe(true);
    });

    it("permissionsブロックがない場合はfail(high)を返す", async () => {
      // mockUnsafeWorkflowにはpermissionsブロックがない
      mockedGhApi.mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("/contents/.github/workflows/ci.yml")) {
          return JSON.stringify({
            type: "file",
            encoding: "base64",
            content: Buffer.from(mockUnsafeWorkflow).toString("base64"),
          });
        }
        if (endpoint.includes("/contents/.github/workflows")) {
          return JSON.stringify([
            { name: "ci.yml", path: ".github/workflows/ci.yml" },
          ]);
        }
        throw new Error("Not Found");
      });

      const results = await runActionsChecks("owner/repo");
      const permCheck = results.find(
        (r) => r.checkId === "actions-permissions-scoped",
      );
      expect(permCheck).toBeDefined();
      expect(permCheck!.passed).toBe(false);
      expect(permCheck!.severity).toBe("high");
    });
  });
});
