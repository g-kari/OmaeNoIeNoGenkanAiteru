import type { ScanResult } from "../../src/types.js";
import { formatJson } from "../../src/output/json.js";

function makeScanResult(overrides?: Partial<ScanResult>): ScanResult {
  return {
    timestamp: "2026-04-12T00:00:00.000Z",
    target: "org:my-org",
    totalRepos: 2,
    auditedRepos: 2,
    skippedRepos: 0,
    results: [
      {
        repo: "my-org/repo1",
        isArchived: false,
        isFork: false,
        isPrivate: false,
        checks: [
          {
            checkId: "branch-protection",
            passed: true,
            severity: "critical",
            message: "ブランチ保護が有効です",
          },
        ],
        score: 100,
        worstSeverity: null,
      },
      {
        repo: "my-org/repo2",
        isArchived: false,
        isFork: false,
        isPrivate: true,
        checks: [
          {
            checkId: "secret-scanning",
            passed: false,
            severity: "critical",
            message: "シークレットスキャンが無効です",
          },
        ],
        score: 45,
        worstSeverity: "critical",
      },
    ],
    summary: {
      passing: 1,
      failing: 1,
      averageScore: 72.5,
      checkBreakdown: {
        "branch-protection": { passed: 1, failed: 0 },
        "secret-scanning": { passed: 0, failed: 1 },
      },
    },
    ...overrides,
  };
}

describe("formatJson", () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it("process.stdout.writeにJSON文字列を書き出す", () => {
    const result = makeScanResult();
    formatJson(result);

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const output = writeSpy.mock.calls[0][0] as string;
    // パース可能なJSONであること
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("2スペースインデントのJSON出力", () => {
    const result = makeScanResult();
    formatJson(result);

    const output = writeSpy.mock.calls[0][0] as string;
    const expected = JSON.stringify(result, null, 2) + "\n";
    expect(output).toBe(expected);
  });

  it("タイムスタンプが含まれる", () => {
    const result = makeScanResult();
    formatJson(result);

    const output = writeSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.timestamp).toBe("2026-04-12T00:00:00.000Z");
  });

  it("ターゲットが含まれる", () => {
    const result = makeScanResult({ target: "user:someone" });
    formatJson(result);

    const output = writeSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.target).toBe("user:someone");
  });

  it("resultsが含まれる", () => {
    const result = makeScanResult();
    formatJson(result);

    const output = writeSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.results).toHaveLength(2);
    expect(parsed.results[0].repo).toBe("my-org/repo1");
    expect(parsed.results[1].repo).toBe("my-org/repo2");
  });

  it("summaryが含まれる", () => {
    const result = makeScanResult();
    formatJson(result);

    const output = writeSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.summary.passing).toBe(1);
    expect(parsed.summary.failing).toBe(1);
    expect(parsed.summary.averageScore).toBe(72.5);
  });

  it("空のresultsでも正常に出力される", () => {
    const result = makeScanResult({
      results: [],
      totalRepos: 0,
      auditedRepos: 0,
      summary: {
        passing: 0,
        failing: 0,
        averageScore: 0,
        checkBreakdown: {},
      },
    });
    formatJson(result);

    const output = writeSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.results).toEqual([]);
  });
});
