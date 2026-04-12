import { ghApi } from "../github/gh.js";
import type { CheckResult, PackageJson } from "../types.js";

interface ContentsApiResponse {
  type: string;
  encoding: string;
  content: string;
  name: string;
  path: string;
}

const DANGEROUS_PATTERNS = [
  "curl",
  "wget",
  "sh",
  "bash",
  "python",
  "ruby",
  "node -e",
  "eval",
];

const LIFECYCLE_SCRIPTS = [
  "preinstall",
  "install",
  "postinstall",
  "preuninstall",
  "uninstall",
  "postuninstall",
  "prepublish",
  "preprepare",
  "prepare",
  "postprepare",
];

async function fetchFileContent(repo: string, path: string): Promise<string> {
  const raw = await ghApi(`/repos/${repo}/contents/${path}`);
  const data = (
    typeof raw === "string" ? JSON.parse(raw) : raw
  ) as ContentsApiResponse;
  return Buffer.from(data.content, "base64").toString("utf-8");
}

async function fileExists(repo: string, path: string): Promise<boolean> {
  try {
    const raw = await ghApi(`/repos/${repo}/contents/${path}`);
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    return data && data.type === "file";
  } catch {
    return false;
  }
}

function checkLockfile(
  hasPackageLock: boolean,
  hasYarnLock: boolean,
): CheckResult {
  return {
    checkId: "pkg-lockfile-exists",
    passed: hasPackageLock || hasYarnLock,
    severity: "critical",
    message:
      hasPackageLock || hasYarnLock
        ? "ロックファイルが存在します"
        : "ロックファイルが存在しません",
  };
}

function checkLifecycleScripts(pkg: PackageJson): CheckResult {
  const dangerous: string[] = [];
  if (pkg.scripts) {
    for (const [name, cmd] of Object.entries(pkg.scripts)) {
      if (LIFECYCLE_SCRIPTS.includes(name) && cmd) {
        for (const pattern of DANGEROUS_PATTERNS) {
          if (cmd.includes(pattern)) {
            dangerous.push(`${name}: ${cmd}`);
            break;
          }
        }
      }
    }
  }
  return {
    checkId: "pkg-lifecycle-scripts",
    passed: dangerous.length === 0,
    severity: "critical",
    message:
      dangerous.length === 0
        ? "危険なlifecycleスクリプトは見つかりませんでした"
        : `危険なlifecycleスクリプトが見つかりました: ${dangerous.join(", ")}`,
    details: dangerous.length > 0 ? { dangerous } : undefined,
  };
}

function checkPrivateField(pkg: PackageJson): CheckResult {
  return {
    checkId: "pkg-private-field",
    passed: pkg.private === true,
    severity: "medium",
    message: pkg.private
      ? "private:trueが設定されています"
      : "private:trueが設定されていません",
  };
}

function checkEnginesField(pkg: PackageJson): CheckResult {
  return {
    checkId: "pkg-engines-field",
    passed: pkg.engines !== undefined && Object.keys(pkg.engines).length > 0,
    severity: "low",
    message: pkg.engines
      ? "enginesフィールドが設定されています"
      : "enginesフィールドが設定されていません",
  };
}

function checkExactVersions(pkg: PackageJson): CheckResult {
  const nonExact: string[] = [];
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  };
  for (const [name, version] of Object.entries(allDeps)) {
    if (version.startsWith("^") || version.startsWith("~") || version === "*" || version === "latest") {
      nonExact.push(`${name}@${version}`);
    }
  }
  return {
    checkId: "pkg-exact-versions",
    passed: nonExact.length === 0,
    severity: "medium",
    message:
      nonExact.length === 0
        ? "全依存パッケージのバージョンが固定されています"
        : `バージョンが固定されていない依存があります: ${nonExact.join(", ")}`,
    details: nonExact.length > 0 ? { nonExact } : undefined,
  };
}

export async function runPackageChecks(
  repo: string,
): Promise<CheckResult[]> {
  let pkgContent: string;
  try {
    pkgContent = await fetchFileContent(repo, "package.json");
  } catch {
    return [];
  }

  const pkg = JSON.parse(pkgContent) as PackageJson;

  const [hasPackageLock, hasYarnLock] = await Promise.all([
    fileExists(repo, "package-lock.json"),
    fileExists(repo, "yarn.lock"),
  ]);

  return [
    checkLockfile(hasPackageLock, hasYarnLock),
    checkLifecycleScripts(pkg),
    checkPrivateField(pkg),
    checkEnginesField(pkg),
    checkExactVersions(pkg),
  ];
}
