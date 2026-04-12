import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExecFile } = vi.hoisted(() => {
  const mockExecFile = vi.fn();
  return { mockExecFile };
});

vi.mock("child_process", () => ({
  execFile: mockExecFile,
}));

import { loadRepoConfig } from "../../src/config/loader.js";
import { createMockExecFile } from "../helpers/mock-gh.js";

const encode = (s: string) => Buffer.from(s).toString("base64");

describe("loadRepoConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ファイルが存在しない場合は空のconfigを返す", async () => {
    mockExecFile.mockImplementation(
      createMockExecFile({ exitCode: 1, stderr: "HTTP 404" }),
    );
    const config = await loadRepoConfig("owner/repo");
    expect(config).toEqual({});
  });

  it("有効なYAMLをパースしてconfigを返す", async () => {
    const yaml = `
checks:
  license:
    enabled: false
  pkg-exact-versions:
    severity: low
`;
    mockExecFile.mockImplementation(
      createMockExecFile({
        stdout: JSON.stringify({ content: encode(yaml), encoding: "base64" }),
      }),
    );
    const config = await loadRepoConfig("owner/repo");
    expect(config.checks?.license?.enabled).toBe(false);
    expect(config.checks?.["pkg-exact-versions"]?.severity).toBe("low");
  });

  it("不正なseverityは無視する", async () => {
    const yaml = `
checks:
  license:
    severity: invalid-value
`;
    mockExecFile.mockImplementation(
      createMockExecFile({
        stdout: JSON.stringify({ content: encode(yaml), encoding: "base64" }),
      }),
    );
    const config = await loadRepoConfig("owner/repo");
    expect(config.checks?.license?.severity).toBeUndefined();
  });

  it("不正なYAMLは空のconfigを返す", async () => {
    mockExecFile.mockImplementation(
      createMockExecFile({
        stdout: JSON.stringify({ content: encode("{{invalid yaml{{"), encoding: "base64" }),
      }),
    );
    const config = await loadRepoConfig("owner/repo");
    expect(config).toEqual({});
  });
});
