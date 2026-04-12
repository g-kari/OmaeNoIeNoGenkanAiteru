// Severity levels ordered from low to high
export type Severity = "low" | "medium" | "high" | "critical";

export const SEVERITY_ORDER: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

// Individual check identifiers
export type CheckId =
  // GitHub settings
  | "branch-protection"
  | "secret-scanning"
  | "force-push-protection"
  | "secret-scanning-push-protection"
  | "vulnerability-alerts"
  | "dependabot-security-updates"
  | "actions-default-permissions"
  | "private-vulnerability-reporting"
  | "security-policy"
  | "dependabot-config"
  | "codeowners"
  | "delete-branch-on-merge"
  | "license"
  // package.json settings
  | "pkg-lockfile-exists"
  | "pkg-lifecycle-scripts"
  | "pkg-private-field"
  | "pkg-engines-field"
  | "pkg-exact-versions"
  // GitHub Actions
  | "actions-pinned-versions"
  | "actions-trusted-sources"
  | "actions-permissions-scoped";

// A single check definition
export interface CheckDefinition {
  id: CheckId;
  name: string;
  description: string;
  severity: Severity;
  source: "graphql" | "rest" | "contents";
  supplyChainRelevance: string;
}

// Result of running one check on one repo
export interface CheckResult {
  checkId: CheckId;
  passed: boolean;
  severity: Severity;
  message: string;
  details?: Record<string, unknown>;
}

// GraphQL batch response for one repo
export interface GraphQLRepoData {
  nameWithOwner: string;
  isArchived: boolean;
  isFork: boolean;
  isPrivate: boolean;
  defaultBranchRef: {
    name: string;
    branchProtectionRule: {
      allowsForcePushes: boolean;
      requiresApprovingReviews: boolean;
      requiredApprovingReviewCount: number;
      requiresStatusChecks: boolean;
      isAdminEnforced: boolean;
    } | null;
  } | null;
  deleteBranchOnMerge: boolean;
  hasVulnerabilityAlertsEnabled: boolean;
  isSecurityPolicyEnabled: boolean;
  licenseInfo: { spdxId: string; name: string } | null;
  codeowners: { errors: Array<{ path: string; message: string }> } | null;
  depBot: { byteSize?: number } | null;
}

// REST response shapes
export interface SecurityAnalysis {
  dependabot_security_updates?: { status: string };
  secret_scanning?: { status: string };
  secret_scanning_push_protection?: { status: string };
}

export interface WorkflowPermissions {
  default_workflow_permissions: "read" | "write";
  can_approve_pull_request_reviews: boolean;
}

export interface PrivateVulnReporting {
  enabled: boolean;
}

// package.json shape (relevant fields only)
export interface PackageJson {
  name?: string;
  version?: string;
  private?: boolean;
  engines?: Record<string, string>;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

// GitHub Actions workflow shape (relevant fields)
export interface WorkflowFile {
  name: string;
  path: string;
  content: string;
}

// Full audit result for one repo
export interface RepoAuditResult {
  repo: string;
  isArchived: boolean;
  isFork: boolean;
  isPrivate: boolean;
  checks: CheckResult[];
  score: number;
  worstSeverity: Severity | null;
  error?: string;
}

// Full scan output
export interface ScanResult {
  timestamp: string;
  target: string;
  totalRepos: number;
  auditedRepos: number;
  skippedRepos: number;
  results: RepoAuditResult[];
  summary: {
    passing: number;
    failing: number;
    averageScore: number;
    checkBreakdown: Partial<Record<CheckId, { passed: number; failed: number }>>;
  };
}

// CLI options
export interface CliOptions {
  org?: string;
  user?: string;
  repo?: string;
  format: "console" | "json";
  severity: Severity;
  includeArchived: boolean;
  includeFork: boolean;
  createIssues: boolean;
  dryRun: boolean;
}

// Error types
export class GhCliError extends Error {
  constructor(
    message: string,
    public readonly exitCode?: number,
    public readonly stderr?: string,
  ) {
    super(message);
    this.name = "GhCliError";
  }
}

export class GhNotFoundError extends Error {
  constructor() {
    super(
      "gh CLI not found. Install it from: https://cli.github.com/\nThen run: gh auth login",
    );
    this.name = "GhNotFoundError";
  }
}

export class GhNotAuthenticatedError extends Error {
  constructor() {
    super("gh CLI is not authenticated. Run: gh auth login");
    this.name = "GhNotAuthenticatedError";
  }
}
