import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

export const REVIEW_SNAPSHOT_SCHEMA_VERSION = 1;
export const REVIEW_JOURNAL_SCHEMA_VERSION = 1;

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function git(root, args, options = {}) {
  return execFileSync("git", ["-c", "core.excludesfile=", ...args], { cwd: root, ...options });
}

function normalizeRepoPath(value) {
  return String(value).replaceAll("\\", "/");
}

function parsePorcelainV1Z(buffer) {
  const fields = buffer.toString("utf8").split("\0");
  const entries = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (!field) continue;
    if (field.length < 4 || field[2] !== " ") throw new Error("unsupported git status --porcelain=v1 record");
    const code = field.slice(0, 2);
    const repoPath = normalizeRepoPath(field.slice(3));
    if (!repoPath || repoPath.includes("\uFFFD")) throw new Error("git status contains an unsupported path encoding");
    const entry = { code, path: repoPath };
    if (/[RC]/.test(code)) {
      const originalPath = fields[index + 1];
      if (!originalPath) throw new Error("git rename/copy status is incomplete");
      entry.original_path = normalizeRepoPath(originalPath);
      index += 1;
    }
    entries.push(entry);
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function worktreeFingerprint(root, repoPath) {
  const absolute = path.join(root, ...repoPath.split("/"));
  if (!fs.existsSync(absolute)) return "missing";
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) return `symlink:${digest(fs.readlinkSync(absolute, "utf8"))}`;
  if (stat.isFile()) return `file:${digest(fs.readFileSync(absolute))}`;
  if (stat.isDirectory()) return "directory";
  return `other:${stat.mode}:${stat.size}`;
}

function indexFingerprint(root, repoPath) {
  const value = git(root, ["ls-files", "--stage", "-z", "--", repoPath]);
  return value.length === 0 ? "untracked" : digest(value);
}

function snapshotPayload(snapshot) {
  return {
    schema_version: snapshot.schema_version,
    head: snapshot.head,
    paths: snapshot.paths,
  };
}

export function reviewSnapshotDigest(snapshot) {
  return digest(JSON.stringify(snapshotPayload(snapshot)));
}

export function captureReviewSnapshot(root) {
  const head = git(root, ["rev-parse", "--verify", "HEAD"], { encoding: "utf8" }).trim();
  if (!/^[0-9a-f]{40,64}$/i.test(head)) throw new Error("baseline HEAD is unavailable");
  const status = parsePorcelainV1Z(git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]));
  const paths = status.map((entry) => ({
    ...entry,
    index_fingerprint: indexFingerprint(root, entry.path),
    worktree_fingerprint: worktreeFingerprint(root, entry.path),
  }));
  const snapshot = { schema_version: REVIEW_SNAPSHOT_SCHEMA_VERSION, head, paths };
  return { ...snapshot, snapshot_digest: reviewSnapshotDigest(snapshot) };
}

function invalidResult(code, message) {
  return { verdict: "unverified", exit_code: 3, reasons: [{ code, message }] };
}

function validateSnapshot(snapshot, label) {
  if (!snapshot || typeof snapshot !== "object") return `${label} snapshot is unavailable`;
  if (snapshot.schema_version !== REVIEW_SNAPSHOT_SCHEMA_VERSION) return `${label} snapshot schema_version is invalid`;
  if (typeof snapshot.head !== "string" || !/^[0-9a-f]{40,64}$/i.test(snapshot.head)) return `${label} HEAD is unavailable`;
  if (!Array.isArray(snapshot.paths)) return `${label} paths are unavailable`;
  const seen = new Set();
  for (const entry of snapshot.paths) {
    if (!entry || typeof entry !== "object" || typeof entry.path !== "string" || entry.path === "") return `${label} path entry is invalid`;
    if (seen.has(entry.path)) return `${label} contains duplicate path ${entry.path}`;
    seen.add(entry.path);
    if (typeof entry.code !== "string" || typeof entry.index_fingerprint !== "string" || typeof entry.worktree_fingerprint !== "string") {
      return `${label} fingerprint for ${entry.path} is invalid`;
    }
  }
  if (snapshot.snapshot_digest !== reviewSnapshotDigest(snapshot)) return `${label} snapshot digest is invalid`;
  return null;
}

function validatePathList(value, label) {
  if (!Array.isArray(value)) return { error: `${label} must be an array` };
  const normalized = value.map(normalizeRepoPath);
  if (normalized.some((item) => !item || item === "." || item.split("/").includes("..") || path.isAbsolute(item))) {
    return { error: `${label} contains an invalid repository-relative path` };
  }
  if (new Set(normalized).size !== normalized.length) return { error: `${label} contains duplicate paths` };
  return { value: normalized };
}

function validateJournal(journal, baseline) {
  if (!journal || typeof journal !== "object") return { error: "ownership journal is unavailable" };
  if (journal.schema_version !== REVIEW_JOURNAL_SCHEMA_VERSION) return { error: "ownership journal schema_version is invalid" };
  if (journal.baseline_digest !== baseline.snapshot_digest) return { error: "ownership journal is not bound to the baseline digest" };
  const owned = validatePathList(journal.owned_paths, "owned_paths");
  if (owned.error) return owned;
  const foreign = validatePathList(journal.foreign_paths, "foreign_paths");
  if (foreign.error) return foreign;
  const overlap = owned.value.filter((item) => foreign.value.includes(item));
  if (overlap.length) return { error: `owned/foreign ownership overlaps: ${overlap.join(", ")}` };
  return { owned: owned.value, foreign: foreign.value };
}

function entryFingerprint(entry) {
  return JSON.stringify(entry);
}

export function classifyReviewSession({ baseline, end, journal, isolated = false } = {}) {
  const baselineError = validateSnapshot(baseline, "baseline");
  if (baselineError) return invalidResult("baseline-unavailable", baselineError);
  const endError = validateSnapshot(end, "end");
  if (endError) return invalidResult("end-snapshot-invalid", endError);
  const journalState = validateJournal(journal, baseline);
  if (journalState.error) return invalidResult("journal-invalid", journalState.error);

  if (journalState.owned.length > 0) {
    return {
      verdict: "task-required",
      exit_code: 2,
      reasons: [{ code: "owned-write-recorded", message: `session-owned writes recorded: ${journalState.owned.join(", ")}` }],
    };
  }
  if (baseline.head !== end.head) return invalidResult("head-changed", "HEAD changed during the review session");

  const baselineMap = new Map(baseline.paths.map((entry) => [entry.path, entry]));
  const endMap = new Map(end.paths.map((entry) => [entry.path, entry]));
  const changedExisting = [];
  const added = [];
  for (const [repoPath, before] of baselineMap) {
    const after = endMap.get(repoPath);
    if (!after || entryFingerprint(before) !== entryFingerprint(after)) changedExisting.push(repoPath);
  }
  for (const repoPath of endMap.keys()) if (!baselineMap.has(repoPath)) added.push(repoPath);

  if (isolated) {
    if (journalState.foreign.length > 0) return invalidResult("isolated-foreign-journal", "isolated review cannot claim foreign writers");
    if (changedExisting.length || added.length) {
      return invalidResult("isolated-snapshot-changed", "isolated review requires exact start/end HEAD and path-state equality");
    }
    return { verdict: "review-only", exit_code: 0, reasons: [{ code: "isolated-equality", message: "isolated start/end snapshots are equal" }] };
  }

  if (changedExisting.length > 0) {
    return invalidResult(
      "ambiguous-same-path-delta",
      `pre-existing paths changed or disappeared after baseline: ${changedExisting.join(", ")}`,
    );
  }
  const unownedAdded = added.filter((repoPath) => !journalState.foreign.includes(repoPath));
  if (unownedAdded.length > 0) {
    return invalidResult("unverified-ownership", `new paths lack foreign ownership evidence: ${unownedAdded.join(", ")}`);
  }
  return {
    verdict: "review-only",
    exit_code: 0,
    reasons: [{
      code: added.length ? "foreign-delta-only" : "session-zero-write",
      message: added.length ? `only explicitly foreign paths were added: ${added.join(", ")}` : "no session-owned repository write detected",
    }],
  };
}
