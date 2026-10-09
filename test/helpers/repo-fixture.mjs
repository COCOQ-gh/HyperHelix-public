import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { cleanGitEnv } from "../../tools/lib/git-env.mjs";

export const cliPath = fileURLToPath(new URL("../../tools/hyperhelix.mjs", import.meta.url));
const frameworkRoot = path.dirname(fileURLToPath(new URL("../../entrypoint.md", import.meta.url)));

export function copyFrameworkFixture(dir) {
  for (const relative of ["core", "assets", "tools", "docs", "governance", ".github", ".codex"]) {
    fs.cpSync(path.join(frameworkRoot, relative), path.join(dir, relative), { recursive: true });
  }
  for (const relative of [
    "constitution.md", "amendments.md", "AGENTS.md", "CLAUDE.md", "entrypoint.md", "README.md", ".gitignore",
  ]) {
    fs.copyFileSync(path.join(frameworkRoot, relative), path.join(dir, relative));
  }
  fs.mkdirSync(path.join(dir, ".claude"), { recursive: true });
  fs.copyFileSync(path.join(frameworkRoot, ".claude", "settings.json"), path.join(dir, ".claude", "settings.json"));
  fs.cpSync(path.join(frameworkRoot, ".claude", "commands"), path.join(dir, ".claude", "commands"), { recursive: true });
  fs.mkdirSync(path.join(dir, "tasks"), { recursive: true });
  fs.copyFileSync(path.join(frameworkRoot, "package.json"), path.join(dir, "package.json"));
  fs.copyFileSync(path.join(frameworkRoot, "package-lock.json"), path.join(dir, "package-lock.json"));
  linkNodeModules(dir);
}

// SC-01/02: the copied tools/ tree imports `yaml`/`ajv`; a fixture repo gets the
// real node_modules via a link (junction works unprivileged on Windows), so
// in-repo CLI spawns resolve dependencies without a per-test npm install.
export function linkNodeModules(dir) {
  const source = path.join(frameworkRoot, "node_modules");
  if (!fs.existsSync(source)) return;
  fs.symlinkSync(source, path.join(dir, "node_modules"), "junction");
}

// Fixture git calls must target `dir` even when the suite runs inside a git hook
// that exported GIT_DIR (linked worktree pre-push) — tools/lib/git-env.mjs.
export function gitInRepo(dir, args, options = {}) {
  return execFileSync("git", ["-c", "core.excludesfile=", "-c", "core.autocrlf=false", ...args], {
    cwd: dir,
    ...options,
    env: cleanGitEnv(options.env ?? process.env),
  });
}

export function withTempDir(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hyperhelix-test-"));
  try {
    return callback(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function initGitRepo(dir, branch = "main") {
  gitInRepo(dir, ["init", "-b", branch], { stdio: "ignore" });
  // Fail closed before writing identity: the repo must live inside `dir`. Compare
  // git's own relative answer, not absolute paths — Windows CI hands out 8.3 temp
  // paths (RUNNER~1) that git reports in long form (runneradmin).
  const gitDir = gitInRepo(dir, ["rev-parse", "--git-dir"], { encoding: "utf8" }).trim();
  if (gitDir !== ".git") {
    throw new Error(`initGitRepo: git dir ${gitDir} escaped fixture ${dir}`);
  }
  gitInRepo(dir, ["config", "user.email", "hyperhelix-test@example.invalid"]);
  gitInRepo(dir, ["config", "user.name", "HyperHelix Test"]);
  return dir;
}

export function runCli(cwd, args, options = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...cleanGitEnv(process.env), ...options.env },
    input: options.input,
  });
}

export function installFakeGh(dir) {
  const script = path.join(dir, "fake-gh.mjs");
  const log = path.join(dir, "fake-gh.log");
  fs.writeFileSync(script, `
import fs from "node:fs";
const args = process.argv.slice(2);
fs.appendFileSync(process.env.HH_TEST_GH_LOG, args.join(" ") + "\\n", "utf8");
if (args[0] === "auth" && args[1] === "status" && process.env.HH_TEST_GH_FAIL_AUTH === "1") process.exit(1);
if (args[0] === "api" && args[1] === "user") {
  console.log(process.env.HH_TEST_GH_LOGIN || "hyperhelix-bot");
  process.exit(0);
}
if (args[0] === "pr" && args[1] === "list") {
  if (process.env.HH_TEST_GH_EXISTING_PR) console.log(process.env.HH_TEST_GH_EXISTING_PR);
  process.exit(0);
}
if (args[0] === "pr" && args[1] === "checks" && process.env.HH_TEST_GH_FAIL_CHECKS === "1") process.exit(1);
if (args[0] === "pr" && args[1] === "create") console.log("https://example.invalid/hyperhelix/pull/1");
`, "utf8");
  return {
    log,
    env: {
      NODE_ENV: "test",
      HH_TEST_ASSUME_VALID_FRAMEWORK: "1",
      HH_TEST_GH_INLINE: "1",
      HH_TEST_GH_WRAPPER: script,
      HH_TEST_GH_LOG: log,
    },
  };
}
