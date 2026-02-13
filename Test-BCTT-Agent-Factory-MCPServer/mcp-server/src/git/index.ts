// ============================================
// GIT OPERATIONS MODULE
// Wraps simple-git for agent git operations
// (branch, checkout, commit, push, diff, merge)
// ============================================

import { simpleGit, SimpleGit } from "simple-git";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || path.resolve(__dirname, '..', '..', '..', '..');

// Project paths
const PROJECTS: Record<string, string> = {
  core: path.join(WORKSPACE_ROOT, "TestAgentFactoryCore"),
  middleware: path.join(WORKSPACE_ROOT, "TestAgentFactoryMiddleware"),
  digitalChannels: path.join(WORKSPACE_ROOT, "TestAgentFactoryDigitalChannels"),
  digitalChannelsWithErrors: path.join(WORKSPACE_ROOT, "TestAgentFactoryDigitalChannelsWithErrors"),
  unitTest: path.join(WORKSPACE_ROOT, "TestAgentFactoryUnitTest"),
};

function getGit(project: string): SimpleGit {
  const projectPath = PROJECTS[project];
  if (!projectPath) {
    throw new Error(`Unknown project: ${project}. Valid: ${Object.keys(PROJECTS).join(", ")}`);
  }
  return simpleGit(projectPath);
}

// ============================================
// BRANCH OPERATIONS
// ============================================

export async function createBranch(project: string, branchName: string): Promise<string> {
  const git = getGit(project);
  await git.checkoutLocalBranch(branchName);
  return `Branch '${branchName}' created and checked out in ${project}`;
}

export async function checkoutBranch(project: string, branchName: string): Promise<string> {
  const git = getGit(project);
  await git.checkout(branchName);
  return `Checked out branch '${branchName}' in ${project}`;
}

export async function getCurrentBranch(project: string): Promise<string> {
  const git = getGit(project);
  const status = await git.status();
  return status.current || "HEAD (detached)";
}

export async function listBranches(project: string): Promise<string[]> {
  const git = getGit(project);
  const branches = await git.branchLocal();
  return branches.all;
}

// ============================================
// COMMIT OPERATIONS
// ============================================

export async function stageAndCommit(
  project: string,
  files: string[],
  message: string
): Promise<string> {
  const git = getGit(project);
  if (files.length === 0 || (files.length === 1 && files[0] === ".")) {
    await git.add(".");
  } else {
    await git.add(files);
  }
  const result = await git.commit(message);
  return `Committed in ${project}: ${result.summary.changes} changes, ${result.summary.insertions} insertions, ${result.summary.deletions} deletions [${result.commit}]`;
}

// ============================================
// DIFF OPERATIONS
// ============================================

export async function getDiff(project: string, base?: string): Promise<string> {
  const git = getGit(project);
  if (base) {
    return await git.diff([`${base}...HEAD`]);
  }
  return await git.diff();
}

export async function getDiffSummary(project: string, base?: string): Promise<{
  changed: number;
  insertions: number;
  deletions: number;
  files: string[];
}> {
  const git = getGit(project);
  const diff = base
    ? await git.diffSummary([`${base}...HEAD`])
    : await git.diffSummary();
  return {
    changed: diff.changed,
    insertions: diff.insertions,
    deletions: diff.deletions,
    files: diff.files.map((f) => f.file),
  };
}

// ============================================
// MERGE OPERATIONS
// ============================================

export async function mergeBranch(
  project: string,
  sourceBranch: string,
  targetBranch: string = "main"
): Promise<string> {
  const git = getGit(project);
  await git.checkout(targetBranch);
  const result = await git.merge([sourceBranch, "--no-ff"]);
  return `Merged '${sourceBranch}' into '${targetBranch}' in ${project}: ${result.result}`;
}

export async function mergeDryRun(
  project: string,
  sourceBranch: string,
  targetBranch: string = "main"
): Promise<{ canMerge: boolean; conflicts: string[] }> {
  const git = getGit(project);
  try {
    // Save current branch
    const status = await git.status();
    const currentBranch = status.current;

    await git.checkout(targetBranch);
    await git.merge(["--no-commit", "--no-ff", sourceBranch]);
    // Abort the merge (dry run)
    await git.merge(["--abort"]);
    // Restore original branch
    if (currentBranch) await git.checkout(currentBranch);

    return { canMerge: true, conflicts: [] };
  } catch (err: any) {
    try {
      await getGit(project).merge(["--abort"]);
    } catch {
      // Ignore abort errors
    }
    const conflicts = err.message?.match(/CONFLICT.*$/gm) || [];
    return { canMerge: false, conflicts };
  }
}

// ============================================
// STATUS & LOG
// ============================================

export async function getStatus(project: string): Promise<{
  branch: string;
  modified: string[];
  staged: string[];
  untracked: string[];
}> {
  const git = getGit(project);
  const status = await git.status();
  return {
    branch: status.current || "unknown",
    modified: status.modified,
    staged: status.staged,
    untracked: status.not_added,
  };
}

export async function getLog(project: string, count: number = 10): Promise<
  Array<{ hash: string; message: string; date: string; author: string }>
> {
  const git = getGit(project);
  const log = await git.log({ maxCount: count });
  return log.all.map((entry) => ({
    hash: entry.hash.substring(0, 8),
    message: entry.message,
    date: entry.date,
    author: entry.author_name,
  }));
}

// ============================================
// TAG & RESET OPERATIONS
// ============================================

export async function createTag(
  project: string,
  tagName: string,
  message?: string
): Promise<string> {
  const git = getGit(project);
  if (message) {
    await git.tag(["-a", tagName, "-m", message]);
  } else {
    await git.tag([tagName]);
  }
  return `Tag '${tagName}' created in ${project}`;
}

export async function listTags(project: string): Promise<string[]> {
  const git = getGit(project);
  const tags = await git.tags();
  return tags.all;
}

export async function resetToTag(
  project: string,
  tagName: string
): Promise<string> {
  const git = getGit(project);
  // Ensure we're on main
  await git.checkout("main");
  // Hard reset to the tag — restores all tracked files to the tag state
  await git.reset(["--hard", tagName]);
  // Note: git.clean() is intentionally skipped because Windows has reserved
  // filenames (nul, con, aux) that cannot be deleted, causing errors.
  // git reset --hard is sufficient for our use case (tracked files only).
  return `Project ${project} reset to tag '${tagName}' on main branch`;
}

// ============================================
// UTILITY
// ============================================

export function getProjectPath(project: string): string {
  const projectPath = PROJECTS[project];
  if (!projectPath) {
    throw new Error(`Unknown project: ${project}. Valid: ${Object.keys(PROJECTS).join(", ")}`);
  }
  return projectPath;
}

export function getAvailableProjects(): string[] {
  return Object.keys(PROJECTS);
}
