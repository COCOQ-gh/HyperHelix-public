// HH-071: pure bounded/full selection for process-backlog reporting.
const BACKLOG_OPEN_HEADING = "## 未決・繰延(open)";
// R8c destination marker (2026-08-24). A project branch's backlog carries rows whose
// remediation lives on `main` (tool/CLI edits, main-owned notes, cross-branch sync).
// Those rows can never be burned HERE, yet the ratchet counted them as accretion and
// R8d tallied their class — both gauges over-reported on every project-branch /cycle.
// `dest:main` excludes a row from THIS branch's burn obligation while keeping it in the
// global open count (main's own /cycle still owns it).
const DEST_RE = /\bdest:(main|here)\b/;
const BACKLOG_CLOSED_HEADING = "## 完了・棄却(closed)";

// `mainLineage` (2026-10-02 /cycle ordinal 18): on main and its PR staging branches
// (hyperhelix/*) a dest:main row IS burnable here — main owns it. Without this the gauge
// reported "unburnable" on the very branch that owns the work.
export function countOpenBacklogItems(text, { mainLineage = false } = {}) {
  const lines = String(text || "").split(/\r?\n/);
  const openIndexes = lines.flatMap((line, index) => line === BACKLOG_OPEN_HEADING ? [index] : []);
  const closedIndexes = lines.flatMap((line, index) => line === BACKLOG_CLOSED_HEADING ? [index] : []);
  const errors = [];
  if (openIndexes.length !== 1) errors.push(`expected exactly one '${BACKLOG_OPEN_HEADING}' heading; found ${openIndexes.length}`);
  if (closedIndexes.length !== 1) errors.push(`expected exactly one '${BACKLOG_CLOSED_HEADING}' heading; found ${closedIndexes.length}`);
  if (errors.length === 0 && openIndexes[0] >= closedIndexes[0]) errors.push("open heading must precede closed heading");
  if (errors.length) return { ok: false, errors };

  const openLines = lines.slice(openIndexes[0] + 1, closedIndexes[0]);
  const completedRows = openLines.filter((line) => /^- ~~\[(?:high|med|low|ref)\]/.test(line));
  if (completedRows.length) {
    return { ok: false, errors: [`open section contains ${completedRows.length} completed row(s); move them to source-task history pointers`] };
  }
  // A priority row ABOVE the open heading is never counted and never enters the R8c
  // burn-down set — silently invisible, not merely misplaced (TASK-main-20260728-010: an
  // Project001 [high] row sat above the standing-practices heading and escaped every cycle).
  // Rows BELOW the closed heading stay legitimate history pointers and are not flagged.
  const strayRows = lines.slice(0, openIndexes[0]).filter((line) => /^- \[(?:high|med|low)\]/.test(line));
  if (strayRows.length) {
    return { ok: false, errors: [`${strayRows.length} priority row(s) sit ABOVE '${BACKLOG_OPEN_HEADING}' and are never counted or burned down; move them into the open section`] };
  }
  const priorityRows = openLines.filter((line) => /^- \[(?:high|med|low)\]/.test(line));
  const mainDestined = priorityRows.filter((line) => (line.match(DEST_RE) || [])[1] === "main");
  return {
    ok: true,
    count: priorityRows.length,
    mainDestinedCount: mainDestined.length,
    burnableHereCount: mainLineage ? priorityRows.length : priorityRows.length - mainDestined.length,
    mainLineage,
    referenceCount: openLines.filter((line) => /^- \[ref\]/.test(line)).length,
  };
}

// Off main-lineage, rows burnable HERE sort first: a decision set filled with dest:main
// rows could never be processed on a project branch (backlog measurement-gap row).
export function selectOpenBacklogItems(text, { full = false, limit = 5, mainLineage = false } = {}) {
  const lines = String(text || "").split(/\r?\n/);
  const openIndex = lines.indexOf(BACKLOG_OPEN_HEADING);
  const closedIndex = lines.indexOf(BACKLOG_CLOSED_HEADING);
  const contract = countOpenBacklogItems(text);
  if (!contract.ok) return contract;
  const priority = { high: 0, med: 1, low: 2 };
  const items = lines.slice(openIndex + 1, closedIndex).flatMap((line, order) => {
    const match = line.match(/^- \[(high|med|low)\]\s+(.+)$/);
    if (!match) return [];
    const dates = [...match[2].matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)].map((item) => item[1]);
    const dest = (line.match(DEST_RE) || [])[1] || null;
    return [{ priority: match[1], text: line, dest, oldestDate: dates.sort()[0] || "9999-99-99", order }];
  }).sort((left, right) => (mainLineage ? 0 : Number(left.dest === "main") - Number(right.dest === "main"))
    || priority[left.priority] - priority[right.priority]
    || left.oldestDate.localeCompare(right.oldestDate)
    || left.order - right.order);
  return { ok: true, total: items.length, items: full ? items : items.slice(0, limit) };
}
