import { createHash } from "node:crypto";

export const VERIFICATION_RECEIPT_VERSION = 1;

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sortedFileEntries(fileHashes) {
  return Object.entries(fileHashes).sort(([left], [right]) => left.localeCompare(right));
}

export function fingerprintFileHashes(fileHashes, predicate = () => true) {
  const framed = sortedFileEntries(fileHashes)
    .filter(([file]) => predicate(file))
    .map(([file, hash]) => `${file.length}:${file}:${hash}`)
    .join("\n");
  return sha256(framed);
}

function isToolTestInput(file) {
  return file === "package.json" || file === "package-lock.json"
    || file.startsWith("tools/") || file.startsWith("test/") || file.startsWith("test-e2e/");
}

function requiredText(value, field) {
  if (typeof value !== "string" || !value) throw new Error(`${field} is required`);
  return value;
}

export function createVerificationSnapshot({
  taskId,
  head,
  indexFingerprint,
  platform,
  architecture,
  nodeVersion,
  lockfileHash,
  fileHashes,
}) {
  if (!fileHashes || typeof fileHashes !== "object" || Array.isArray(fileHashes)) {
    throw new Error("fileHashes must be an object");
  }
  const normalizedFiles = Object.fromEntries(sortedFileEntries(fileHashes));
  return {
    version: VERIFICATION_RECEIPT_VERSION,
    taskId: requiredText(taskId, "taskId"),
    head: requiredText(head, "head"),
    indexFingerprint: requiredText(indexFingerprint, "indexFingerprint"),
    environment: {
      platform: requiredText(platform, "platform"),
      architecture: requiredText(architecture, "architecture"),
      nodeVersion: requiredText(nodeVersion, "nodeVersion"),
    },
    lockfileHash: requiredText(lockfileHash, "lockfileHash"),
    toolTestFingerprint: fingerprintFileHashes(normalizedFiles, isToolTestInput),
    workspaceFingerprint: fingerprintFileHashes(normalizedFiles),
    fileHashes: normalizedFiles,
  };
}

function bindingMismatches(expected, actual) {
  const mismatches = [];
  for (const key of ["version", "taskId", "head", "indexFingerprint", "lockfileHash", "toolTestFingerprint"]) {
    if (expected?.[key] !== actual?.[key]) mismatches.push(`${key} mismatch`);
  }
  for (const key of ["platform", "architecture", "nodeVersion"]) {
    if (expected?.environment?.[key] !== actual?.environment?.[key]) mismatches.push(`environment.${key} mismatch`);
  }
  return mismatches;
}

export function changedFilePaths(before = {}, after = {}) {
  const paths = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...paths].filter((file) => before[file] !== after[file]).sort();
}

export function attestVerificationReceipt(before, after) {
  const reasons = bindingMismatches(before, after);
  if (before?.workspaceFingerprint !== after?.workspaceFingerprint) reasons.push("workspace changed during full verification");
  if (reasons.length) return { ok: false, reasons };
  const receipt = {
    ...before,
    verified: true,
    receiptDigest: sha256(JSON.stringify({
      version: before.version,
      taskId: before.taskId,
      head: before.head,
      indexFingerprint: before.indexFingerprint,
      environment: before.environment,
      lockfileHash: before.lockfileHash,
      toolTestFingerprint: before.toolTestFingerprint,
      workspaceFingerprint: before.workspaceFingerprint,
    })),
  };
  return { ok: true, receipt };
}

export function assessVerificationReuse({ receipt, current, allowedChangedPaths = [] }) {
  const reasons = [];
  if (!receipt || receipt.verified !== true) reasons.push("missing verified receipt");
  else reasons.push(...bindingMismatches(receipt, current));
  const changedPaths = receipt?.fileHashes && current?.fileHashes
    ? changedFilePaths(receipt.fileHashes, current.fileHashes)
    : [];
  const allow = new Set(allowedChangedPaths);
  const unauthorizedPaths = changedPaths.filter((file) => !allow.has(file));
  if (unauthorizedPaths.length) reasons.push(`unauthorized changed paths: ${unauthorizedPaths.join(", ")}`);
  if (receipt?.toolTestFingerprint !== current?.toolTestFingerprint
      && !reasons.includes("toolTestFingerprint mismatch")) {
    reasons.push("toolTestFingerprint mismatch");
  }
  return {
    ok: reasons.length === 0,
    reasons,
    changedPaths,
    unauthorizedPaths,
    receiptDigest: receipt?.receiptDigest ?? null,
  };
}
