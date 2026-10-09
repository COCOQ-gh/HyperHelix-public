// Git environment isolation (TASK-main-20261002-001).
// Git exports repository-locating variables into hook processes — in a linked
// worktree, pre-push/pre-commit receive an absolute GIT_DIR (and pre-commit a
// GIT_INDEX_FILE). A child `git` launched with that env targets the HOOK's
// repository regardless of its cwd: `git init` in a temp dir "reinitializes" the
// real repo and `git config user.email` lands in the shared .git/config
// (measured: a real commit authored "HyperHelix Test"; backlog env-gap row:
// core.bare flipped + 4 stray fixture commits). Strip them so cwd decides.

const REPO_LOCATING = /^GIT_(DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|COMMON_DIR|NAMESPACE|PREFIX|QUARANTINE_PATH|CONFIG_PARAMETERS|CONFIG_COUNT|CONFIG_KEY_\d+|CONFIG_VALUE_\d+)$/;

export function cleanGitEnv(env = process.env) {
  const out = { ...env };
  for (const key of Object.keys(out)) {
    if (REPO_LOCATING.test(key)) delete out[key];
  }
  return out;
}
