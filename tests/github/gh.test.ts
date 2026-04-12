import { ghApi, ghGraphQL, checkGhAuth } from "../../src/github/gh.js";
import {
  GhCliError,
  GhNotFoundError,
  GhNotAuthenticatedError,
} from "../../src/types.js";

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

describe("ghApi", () => {
  it('execFileが正しいargs（"gh", ["api", endpoint]）で呼ばれる', async () => {
    mockExecFile.mockImplementation(
      (
        _cmd: string,
        _args: string[],
        cb: (err: Error | null, stdout: string, stderr: string) => void,
      ) => {
        cb(null, '{"ok": true}', "");
      },
    );

    await ghApi("/repos/owner/repo");

    expect(mockExecFile).toHaveBeenCalledWith(
      "gh",
      expect.arrayContaining(["api", "/repos/owner/repo"]),
      expect.any(Function),
    );
  });

  it("JSONレスポンスが正しくパースされる", async () => {
    mockExecFile.mockImplementation(
      (
        _cmd: string,
        _args: string[],
        cb: (err: Error | null, stdout: string, stderr: string) => void,
      ) => {
        cb(null, '{"name": "repo", "id": 123}', "");
      },
    );

    const result = await ghApi("/repos/owner/repo");
    expect(result).toEqual({ name: "repo", id: 123 });
  });

  it("stderrありでGhCliErrorをthrow", async () => {
    mockExecFile.mockImplementation(
      (
        _cmd: string,
        _args: string[],
        cb: (err: Error | null, stdout: string, stderr: string) => void,
      ) => {
        const error = new Error("command failed") as Error & { code: number };
        error.code = 1;
        cb(error, "", "gh: Not Found (HTTP 404)");
      },
    );

    await expect(ghApi("/repos/owner/repo")).rejects.toThrow(GhCliError);
  });

  it("gh not found（ENOENT）でGhNotFoundErrorをthrow", async () => {
    mockExecFile.mockImplementation(
      (
        _cmd: string,
        _args: string[],
        cb: (err: Error | null, stdout: string, stderr: string) => void,
      ) => {
        const error = new Error("spawn gh ENOENT") as Error & { code: string };
        error.code = "ENOENT";
        cb(error, "", "");
      },
    );

    await expect(ghApi("/repos/owner/repo")).rejects.toThrow(GhNotFoundError);
  });
});

describe("ghGraphQL", () => {
  it("GraphQLクエリが正しく送信される", async () => {
    mockExecFile.mockImplementation(
      (
        _cmd: string,
        _args: string[],
        cb: (err: Error | null, stdout: string, stderr: string) => void,
      ) => {
        cb(null, '{"data": {"viewer": {"login": "user"}}}', "");
      },
    );

    const result = await ghGraphQL("query { viewer { login } }");
    expect(result).toEqual({ data: { viewer: { login: "user" } } });
  });

  it("execFileがgraphqlサブコマンドで呼ばれる", async () => {
    mockExecFile.mockImplementation(
      (
        _cmd: string,
        _args: string[],
        cb: (err: Error | null, stdout: string, stderr: string) => void,
      ) => {
        cb(null, '{"data": {}}', "");
      },
    );

    await ghGraphQL("query { viewer { login } }");

    expect(mockExecFile).toHaveBeenCalledWith(
      "gh",
      expect.arrayContaining(["api", "graphql"]),
      expect.any(Function),
    );
  });
});

describe("checkGhAuth", () => {
  it("認証OKで正常完了", async () => {
    mockExecFile.mockImplementation(
      (
        _cmd: string,
        _args: string[],
        cb: (err: Error | null, stdout: string, stderr: string) => void,
      ) => {
        cb(null, "", "");
      },
    );

    await expect(checkGhAuth()).resolves.toBeUndefined();
  });

  it("認証NGでGhNotAuthenticatedErrorをthrow", async () => {
    mockExecFile.mockImplementation(
      (
        _cmd: string,
        _args: string[],
        cb: (err: Error | null, stdout: string, stderr: string) => void,
      ) => {
        const error = new Error("auth failed") as Error & { code: number };
        error.code = 1;
        cb(
          error,
          "",
          "You are not logged into any GitHub hosts. Run gh auth login to authenticate.",
        );
      },
    );

    await expect(checkGhAuth()).rejects.toThrow(GhNotAuthenticatedError);
  });

  it("gh not found（ENOENT）でGhNotFoundErrorをthrow", async () => {
    mockExecFile.mockImplementation(
      (
        _cmd: string,
        _args: string[],
        cb: (err: Error | null, stdout: string, stderr: string) => void,
      ) => {
        const error = new Error("spawn gh ENOENT") as Error & { code: string };
        error.code = "ENOENT";
        cb(error, "", "");
      },
    );

    await expect(checkGhAuth()).rejects.toThrow(GhNotFoundError);
  });
});
