const GOVERNANCE_PR_PATH_RULES = [
  (file) => file.startsWith(".github/"),
  (file) => file === "constitution.md",
  (file) => file === "amendments.md",
  (file) => file === "core/gates.yaml",
  (file) => file.startsWith("governance/"),
];

export function governancePaths(paths) {
  return paths.filter((file) => GOVERNANCE_PR_PATH_RULES.some((matches) => matches(file)));
}

export function prSafeSegment(value) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "branch";
}

export function pullRequestDisposition({ checksPassed, governedPaths }) {
  if (!checksPassed) return "failed";
  return governedPaths.length ? "awaiting-human" : "merge";
}

export function publisherReady(login) {
  return typeof login === "string" && login.trim().length > 0;
}
