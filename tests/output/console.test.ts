import type { ScanResult, RepoAuditResult } from "../../src/types.js";
import { formatConsole } from "../../src/output/console.js";

// ascii-art.tsをモック（別エージェントが作成中）
vi.mock("../../src/output/ascii-art.js", () => ({
  getHeaderArt: () => "=== GENKAN HEADER ===",
  getArt: (severity: string) => ({
    art: `[AA:${severity}]`,
    comment: `[TAUNT:${severity}]`,
    label: severity.toUpperCase(),
  }),
}));

// ANSIカラーコード
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  gray: "\x1b[90m",
};

function makeRepo(overrides?: Partial<RepoAuditResult>): RepoAuditResult {
  return {
    repo: "owner/repo1",
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
      {
        checkId: "secret-scanning",
        passed: false,
        severity: "critical",
        message: "シークレットスキャンが無効です",
      },
    ],
    score: 50,
    grade: "F",
    worstSeverity: "critical",
    ...overrides,
  };
}

function makeScanResult(overrides?: Partial<ScanResult>): ScanResult {
  return {
    timestamp: "2026-04-12T00:00:00.000Z",
    target: "org:my-org",
    totalRepos: 2,
    auditedRepos: 2,
    skippedRepos: 0,
    results: [
      makeRepo(),
      makeRepo({
        repo: "owner/repo2",
        checks: [
          {
            checkId: "branch-protection",
            passed: true,
            severity: "critical",
            message: "ブランチ保護が有効です",
          },
        ],
        score: 100,
        grade: "A",
        worstSeverity: null,
      }),
    ],
    summary: {
      passing: 1,
      failing: 1,
      averageScore: 75,
      averageGrade: "C",
      checkBreakdown: {
        "branch-protection": { passed: 2, failed: 0 },
        "secret-scanning": { passed: 0, failed: 1 },
      },
    },
    ...overrides,
  };
}

function captureOutput(fn: () => void): string {
  const writeSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation(() => true);
  fn();
  const output = writeSpy.mock.calls.map((c) => c[0]).join("");
  writeSpy.mockRestore();
  return output;
}

describe("formatConsole", () => {
  describe("ヘッダー", () => {
    it("ヘッダーアートが出力される", () => {
      const output = captureOutput(() => formatConsole(makeScanResult()));
      expect(output).toContain("=== GENKAN HEADER ===");
    });
  });

  describe("リポジトリ別ブロック", () => {
    it("リポ名が太字で表示される", () => {
      const output = captureOutput(() => formatConsole(makeScanResult()));
      expect(output).toContain(`${C.bold}owner/repo1${C.reset}`);
    });

    it("チェック結果に✓が含まれる（pass）", () => {
      const output = captureOutput(() => formatConsole(makeScanResult()));
      expect(output).toContain("✓");
    });

    it("チェック結果に✗が含まれる（fail）", () => {
      const output = captureOutput(() => formatConsole(makeScanResult()));
      expect(output).toContain("✗");
    });

    it("チェックIDが表示される", () => {
      const output = captureOutput(() => formatConsole(makeScanResult()));
      expect(output).toContain("branch-protection");
      expect(output).toContain("secret-scanning");
    });

    it("チェックメッセージが表示される", () => {
      const output = captureOutput(() => formatConsole(makeScanResult()));
      expect(output).toContain("ブランチ保護が有効です");
      expect(output).toContain("シークレットスキャンが無効です");
    });
  });

  describe("重要度別カラー", () => {
    it("criticalはredで表示される", () => {
      const result = makeScanResult({
        results: [
          makeRepo({
            checks: [
              {
                checkId: "branch-protection",
                passed: false,
                severity: "critical",
                message: "fail",
              },
            ],
            worstSeverity: "critical",
          }),
        ],
      });
      const output = captureOutput(() => formatConsole(result));
      expect(output).toContain(C.red);
    });

    it("highはyellowで表示される", () => {
      const result = makeScanResult({
        results: [
          makeRepo({
            checks: [
              {
                checkId: "secret-scanning",
                passed: false,
                severity: "high",
                message: "fail",
              },
            ],
            worstSeverity: "high",
          }),
        ],
      });
      const output = captureOutput(() => formatConsole(result));
      expect(output).toContain(C.yellow);
    });

    it("mediumはcyanで表示される", () => {
      const result = makeScanResult({
        results: [
          makeRepo({
            checks: [
              {
                checkId: "dependabot-config",
                passed: false,
                severity: "medium",
                message: "fail",
              },
            ],
            worstSeverity: "medium",
          }),
        ],
      });
      const output = captureOutput(() => formatConsole(result));
      expect(output).toContain(C.cyan);
    });

    it("lowはgrayで表示される", () => {
      const result = makeScanResult({
        results: [
          makeRepo({
            checks: [
              {
                checkId: "license",
                passed: false,
                severity: "low",
                message: "fail",
              },
            ],
            worstSeverity: "low",
          }),
        ],
      });
      const output = captureOutput(() => formatConsole(result));
      expect(output).toContain(C.gray);
    });
  });

  describe("AAアートと煽り", () => {
    it("失敗チェックがある場合、重要度別AAアートが表示される", () => {
      const output = captureOutput(() => formatConsole(makeScanResult()));
      expect(output).toContain("[AA:critical]");
    });

    it("煽りコメントが表示される", () => {
      const output = captureOutput(() => formatConsole(makeScanResult()));
      expect(output).toContain("[TAUNT:critical]");
    });

    it("全チェック通過のリポにはAAアートが表示されない", () => {
      const result = makeScanResult({
        results: [
          makeRepo({
            repo: "owner/perfect",
            checks: [
              {
                checkId: "branch-protection",
                passed: true,
                severity: "critical",
                message: "OK",
              },
            ],
            score: 100,
            worstSeverity: null,
          }),
        ],
      });
      const output = captureOutput(() => formatConsole(result));
      // AAアートは失敗時のみ
      expect(output).not.toContain("[AA:");
      expect(output).not.toContain("[TAUNT:");
    });
  });

  describe("サマリーテーブル", () => {
    it("リポジトリ名・スコア・最悪度が表示される", () => {
      const output = captureOutput(() => formatConsole(makeScanResult()));
      expect(output).toContain("owner/repo1");
      expect(output).toContain("50%");
      expect(output).toContain("owner/repo2");
      expect(output).toContain("100%");
    });

    it("最悪度がnullのリポは-で表示される", () => {
      const output = captureOutput(() => formatConsole(makeScanResult()));
      // repo2はworstSeverity: null → "-"
      expect(output).toMatch(/owner\/repo2.*-/);
    });
  });

  describe("総合統計", () => {
    it("パス数・失敗数が表示される", () => {
      const output = captureOutput(() => formatConsole(makeScanResult()));
      // passing: 1, failing: 1
      expect(output).toMatch(/1/);
    });

    it("平均スコアが表示される", () => {
      const output = captureOutput(() => formatConsole(makeScanResult()));
      expect(output).toContain("75");
    });
  });

  describe("スナップショット", () => {
    it("全体出力がスナップショットと一致する", () => {
      const output = captureOutput(() => formatConsole(makeScanResult()));
      expect(output).toMatchSnapshot();
    });
  });

  describe("エッジケース", () => {
    it("結果が空の場合でもエラーにならない", () => {
      const result = makeScanResult({
        results: [],
        summary: {
          passing: 0,
          failing: 0,
          averageScore: 0,
          checkBreakdown: {},
        },
      });
      expect(() => {
        captureOutput(() => formatConsole(result));
      }).not.toThrow();
    });

    it("エラー付きリポが表示される", () => {
      const result = makeScanResult({
        results: [
          makeRepo({
            repo: "owner/error-repo",
            error: "API rate limit exceeded",
            checks: [],
            score: 0,
            grade: "F",
            worstSeverity: null,
          }),
        ],
      });
      const output = captureOutput(() => formatConsole(result));
      expect(output).toContain("owner/error-repo");
      expect(output).toContain("API rate limit exceeded");
    });
  });
});
