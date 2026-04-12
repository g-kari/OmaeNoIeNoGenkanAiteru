import type { CliOptions } from "../../src/types.js";
import { parseArgs } from "../../src/cli/args.js";

describe("parseArgs", () => {
  describe("デフォルト値", () => {
    it("引数なしでデフォルト値が設定される", () => {
      const opts = parseArgs([]);
      expect(opts.format).toBe("console");
      expect(opts.severity).toBe("low");
      expect(opts.includeArchived).toBe(false);
      expect(opts.includeFork).toBe(false);
      expect(opts.createIssues).toBe(false);
      expect(opts.dryRun).toBe(false);
    });

    it("org, user, repoはundefined", () => {
      const opts = parseArgs([]);
      expect(opts.org).toBeUndefined();
      expect(opts.user).toBeUndefined();
      expect(opts.repo).toBeUndefined();
    });
  });

  describe("--org, --user, --repo", () => {
    it("--orgが正しくパースされる", () => {
      const opts = parseArgs(["--org", "my-org"]);
      expect(opts.org).toBe("my-org");
    });

    it("--userが正しくパースされる", () => {
      const opts = parseArgs(["--user", "my-user"]);
      expect(opts.user).toBe("my-user");
    });

    it("--repoが正しくパースされる", () => {
      const opts = parseArgs(["--repo", "owner/repo"]);
      expect(opts.repo).toBe("owner/repo");
    });

    it("--orgと--userを同時に指定できる（相互排他は強制しない）", () => {
      const opts = parseArgs(["--org", "my-org", "--user", "my-user"]);
      expect(opts.org).toBe("my-org");
      expect(opts.user).toBe("my-user");
    });
  });

  describe("--format", () => {
    it("--format consoleが正しくパースされる", () => {
      const opts = parseArgs(["--format", "console"]);
      expect(opts.format).toBe("console");
    });

    it("--format jsonが正しくパースされる", () => {
      const opts = parseArgs(["--format", "json"]);
      expect(opts.format).toBe("json");
    });

    it("不正な--format値でエラー", () => {
      expect(() => parseArgs(["--format", "xml"])).toThrow();
    });
  });

  describe("--severity", () => {
    it.each(["low", "medium", "high", "critical"] as const)(
      "--severity %s が正しくパースされる",
      (level) => {
        const opts = parseArgs(["--severity", level]);
        expect(opts.severity).toBe(level);
      },
    );
  });

  describe("booleanフラグ", () => {
    it("--include-archivedがtrueになる", () => {
      const opts = parseArgs(["--include-archived"]);
      expect(opts.includeArchived).toBe(true);
    });

    it("--include-forkがtrueになる", () => {
      const opts = parseArgs(["--include-fork"]);
      expect(opts.includeFork).toBe(true);
    });

    it("--create-issuesがtrueになる", () => {
      const opts = parseArgs(["--create-issues"]);
      expect(opts.createIssues).toBe(true);
    });

    it("--dry-runがtrueになる", () => {
      const opts = parseArgs(["--dry-run"]);
      expect(opts.dryRun).toBe(true);
    });
  });

  describe("複合オプション", () => {
    it("全オプションを同時に指定できる", () => {
      const opts = parseArgs([
        "--org",
        "my-org",
        "--format",
        "json",
        "--severity",
        "high",
        "--include-archived",
        "--include-fork",
        "--create-issues",
        "--dry-run",
      ]);
      expect(opts.org).toBe("my-org");
      expect(opts.format).toBe("json");
      expect(opts.severity).toBe("high");
      expect(opts.includeArchived).toBe(true);
      expect(opts.includeFork).toBe(true);
      expect(opts.createIssues).toBe(true);
      expect(opts.dryRun).toBe(true);
    });
  });
});
