import {
  fetchSecurityAnalysis,
  fetchWorkflowPermissions,
  fetchPrivateVulnReporting,
} from "../../src/github/rest.js";
import type {
  SecurityAnalysis,
  WorkflowPermissions,
  PrivateVulnReporting,
} from "../../src/types.js";
import { GhCliError } from "../../src/types.js";
import {
  mockSecurityAnalysisEnabled,
  mockSecurityAnalysisDisabled,
  mockWorkflowPermissionsRead,
  mockWorkflowPermissionsWrite,
  mockPrivateVulnReportingEnabled,
  mockPrivateVulnReportingDisabled,
  mockApiResponse,
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

// ヘルパー: 正常レスポンスをセット
function setApiResponse(data: unknown) {
  mockExecFile.mockImplementation(
    (
      _cmd: string,
      _args: string[],
      cb: (err: Error | null, stdout: string, stderr: string) => void,
    ) => {
      cb(null, mockApiResponse(data), "");
    },
  );
}

// ヘルパー: エラーレスポンスをセット
function setApiError(statusCode: number, message: string) {
  mockExecFile.mockImplementation(
    (
      _cmd: string,
      _args: string[],
      cb: (err: Error | null, stdout: string, stderr: string) => void,
    ) => {
      const error = new Error("command failed") as Error & { code: number };
      error.code = 1;
      cb(error, "", `gh: ${message} (HTTP ${statusCode})`);
    },
  );
}

describe("fetchSecurityAnalysis", () => {
  it("正常レスポンスでSecurityAnalysis型を返す", async () => {
    setApiResponse(mockSecurityAnalysisEnabled());

    const result = await fetchSecurityAnalysis("owner/repo");

    expect(result).not.toBeNull();
    expect(result!.secret_scanning!.status).toBe("enabled");
    expect(result!.secret_scanning_push_protection!.status).toBe("enabled");
    expect(result!.dependabot_security_updates!.status).toBe("enabled");
  });

  it("無効なセキュリティ設定も正しく返す", async () => {
    setApiResponse(mockSecurityAnalysisDisabled());

    const result = await fetchSecurityAnalysis("owner/repo");

    expect(result).not.toBeNull();
    expect(result!.secret_scanning!.status).toBe("disabled");
  });

  it("403エラー（権限不足）でnullを返す", async () => {
    setApiError(403, "Must have admin rights");

    const result = await fetchSecurityAnalysis("owner/repo");
    expect(result).toBeNull();
  });

  it("404エラーでnullを返す", async () => {
    setApiError(404, "Not Found");

    const result = await fetchSecurityAnalysis("owner/repo");
    expect(result).toBeNull();
  });
});

describe("fetchWorkflowPermissions", () => {
  it("正常レスポンス（read）でWorkflowPermissions型を返す", async () => {
    setApiResponse(mockWorkflowPermissionsRead);

    const result = await fetchWorkflowPermissions("owner/repo");

    expect(result).not.toBeNull();
    expect(result!.default_workflow_permissions).toBe("read");
    expect(result!.can_approve_pull_request_reviews).toBe(false);
  });

  it("正常レスポンス（write）でWorkflowPermissions型を返す", async () => {
    setApiResponse(mockWorkflowPermissionsWrite);

    const result = await fetchWorkflowPermissions("owner/repo");

    expect(result).not.toBeNull();
    expect(result!.default_workflow_permissions).toBe("write");
    expect(result!.can_approve_pull_request_reviews).toBe(true);
  });

  it("エラーでnullを返す", async () => {
    setApiError(403, "Resource not accessible");

    const result = await fetchWorkflowPermissions("owner/repo");
    expect(result).toBeNull();
  });
});

describe("fetchPrivateVulnReporting", () => {
  it("enabled:trueを正しく返す", async () => {
    setApiResponse(mockPrivateVulnReportingEnabled);

    const result = await fetchPrivateVulnReporting("owner/repo");

    expect(result).not.toBeNull();
    expect(result!.enabled).toBe(true);
  });

  it("enabled:falseを正しく返す", async () => {
    setApiResponse(mockPrivateVulnReportingDisabled);

    const result = await fetchPrivateVulnReporting("owner/repo");

    expect(result).not.toBeNull();
    expect(result!.enabled).toBe(false);
  });

  it("エラーでnullを返す", async () => {
    setApiError(404, "Not Found");

    const result = await fetchPrivateVulnReporting("owner/repo");
    expect(result).toBeNull();
  });
});
