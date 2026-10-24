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

describe("YAML parser compatibility", () => {
  const sha = "0123456789abcdef0123456789abcdef01234567";

  function mockWorkflows(contents: Record<string, string>) {
    mockedGhApi.mockImplementation(async (endpoint: string) => {
      if (endpoint.endsWith("/contents/.github/workflows")) {
        return JSON.stringify(
          Object.keys(contents).map((name) => ({
            name,
            path: `.github/workflows/${name}`,
          })),
        );
      }
      const name = endpoint.split("/").pop()!;
      if (!(name in contents)) throw new Error("Not Found");
      return JSON.stringify({
        type: "file",
        encoding: "base64",
        content: Buffer.from(contents[name]).toString("base64"),
      });
    });
  }

  it("quoted line continuations preserve pinned action references", async () => {
    mockWorkflows({
      "ci.yml": String.raw`name: CI
permissions: { contents: read }
jobs:
  build:
    steps:
      - uses: "actions/check\
          out@${sha}"
`,
    });

    expect(await runActionsChecks("owner/repo")).toEqual([
      {
        checkId: "actions-pinned-versions",
        passed: true,
        severity: "critical",
        message: "全ActionsがSHAで固定されています",
        details: undefined,
      },
      {
        checkId: "actions-permissions-scoped",
        passed: true,
        severity: "high",
        message: "permissionsブロックが定義されています",
      },
    ]);
  });

  it.each([
    [sha, true],
    ["v4", false],
  ] as const)("aliased steps retain the checked reference %s", async (ref, passed) => {
    mockWorkflows({
      "ci.yml": `name: CI
permissions: { contents: read }
x-steps: &steps
  - uses: actions/checkout@${ref}
jobs:
  build:
    steps: *steps
`,
    });

    const results = await runActionsChecks("owner/repo");
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      checkId: "actions-pinned-versions",
      passed,
      details: passed ? undefined : { unpinned: ["actions/checkout@v4"] },
    });
    expect(results[1]).toMatchObject({
      checkId: "actions-permissions-scoped",
      passed: true,
    });
  });

  it("a small YAML 1.1 merge preserves inherited steps and permissions", async () => {
    mockWorkflows({
      "ci.yml": `%YAML 1.1
---
defaults: &defaults
  permissions: { contents: read }
  steps:
    - uses: actions/checkout@${sha}
jobs:
  build:
    <<: *defaults
    name: explicit-job-name
`,
    });

    const results = await runActionsChecks("owner/repo");
    expect(results).toHaveLength(2);
    expect(results.map(({ checkId, passed }) => ({ checkId, passed }))).toEqual([
      { checkId: "actions-pinned-versions", passed: true },
      { checkId: "actions-permissions-scoped", passed: true },
    ]);
  });

  it("an invalid scalar does not discard a separate valid workflow", async () => {
    mockWorkflows({
      "bad.yml": String.raw`name: "\u00QQ"`,
      "ci.yml": `permissions: { contents: read }
jobs:
  build:
    steps:
      - uses: actions/checkout@${sha}
`,
    });
    const results = await runActionsChecks("owner/repo");
    expect(results).toHaveLength(2);
    expect(results.every(({ passed }) => passed)).toBe(true);
  });

  it("an all-invalid workflow list remains skipped", async () => {
    mockWorkflows({ "bad.yml": String.raw`name: "\u00QQ"` });
    expect(await runActionsChecks("owner/repo")).toEqual([]);
  });
});
