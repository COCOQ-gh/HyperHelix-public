// SC-06 (structured-canon-migration-plan): the migrate-canon engine + domain
// epoch closure. Per domain it reads the legacy surface READ-ONLY, checks the
// structured canon (schema / ID uniqueness / reference integrity are enforced by
// each domain repository), semantic-diffs canon vs generated view, and reports
// the mandatory counts: total / converted / equivalent / rejected / legacy-live.
// Invariants (plan 移行規則): total === converted + rejected; a green domain has
// equivalent === converted, rejected === 0, legacy-live === 0. --apply writes
// only when green (view repairs are the one repairable divergence) and then
// advances the domain epoch; epoch state itself lives in core/contracts.json
// (accessors: tools/lib/contracts.mjs). fail-closed everywhere: unknown epoch,
// unreadable canon, or unclassified legacy source is nonzero, never a skip.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  EPOCH_CONTRACT,
  EPOCH_DOMAINS,
  domainEpoch,
} from "./contracts.mjs";
import { loadGovernanceRegistry, amendmentsViewDrift, writeAmendmentsView } from "./governance.mjs";
import { loadKnowledge } from "./knowledge.mjs";

export const EPOCH_PARITY_STATE = "semantic-parity-confirmed";

function emptyCounts() {
  return { total: 0, converted: 0, equivalent: 0, rejected: 0, legacyLive: 0 };
}


// --- governance domain: canon = registry + bodies; legacy surface = amendments.md ---
function migrateGovernanceDomain(root) {
  const counts = emptyCounts();
  const issues = [];
  const repairs = [];
  const loaded = loadGovernanceRegistry(root);
  if (!loaded.ok) {
    counts.total = 1;
    counts.rejected = 1;
    issues.push(...loaded.errors);
    return { counts, issues, repairs, info: [] };
  }
  counts.total = loaded.value.entries.length;
  counts.converted = counts.total;
  const drift = amendmentsViewDrift(root);
  if (drift.drifted) {
    issues.push(...drift.errors);
    repairs.push({ kind: "amendments-view" });
  } else {
    counts.equivalent = counts.converted;
  }
  return { counts, issues, repairs, info: [] };
}

// --- knowledge domain: canon = manifest + ledgers (the ledgers ARE the single
// form since SC-05c removed the legacy line parser: legacy-adapter-removed) ---
function migrateKnowledgeDomain(root) {
  const counts = emptyCounts();
  const issues = [];
  const loaded = loadKnowledge(root);
  if (!loaded.ok) {
    counts.total = 1;
    counts.rejected = 1;
    issues.push(...loaded.errors);
    return { counts, issues, repairs: [], info: [] };
  }
  counts.total = loaded.value.notes.length;
  counts.converted = counts.total;
  counts.equivalent = counts.total;
  return { counts, issues, repairs: [], info: [] };
}

const DOMAIN_RUNNERS = {
  governance: migrateGovernanceDomain,
  knowledge: migrateKnowledgeDomain,
};

export function domainGreen(result) {
  const { counts } = result;
  return counts.rejected === 0 && counts.legacyLive === 0 && counts.equivalent === counts.converted;
}

export function migrateCanon(root = process.cwd(), { domains = EPOCH_DOMAINS, epochs = null } = {}) {
  const results = [];
  for (const domain of domains) {
    const runner = DOMAIN_RUNNERS[domain];
    if (!runner) throw new Error(`migrate-canon: unknown domain '${domain}' — fail-closed`);
    const epoch = domainEpoch(domain, epochs ? { epochs } : {});
    const outcome = runner(root);
    if (outcome.counts.total !== outcome.counts.converted + outcome.counts.rejected) {
      throw new Error(`migrate-canon: ${domain} count invariant broken (total=${outcome.counts.total}, converted=${outcome.counts.converted}, rejected=${outcome.counts.rejected})`);
    }
    results.push({ domain, epoch, ...outcome });
  }
  return { ok: results.every(domainGreen), results };
}

// Repairable divergences are generated-view drift ONLY (the canon stays the
// authority). Canon-side problems (rejected / legacy-live) are never "repaired"
// here — they go back to their producing tool.
export function applyMigrationRepairs(root, results, { epochs = null } = {}) {
  const written = [];
  const errors = [];
  for (const result of results) {
    for (const repair of result.repairs) {
      if (repair.kind === "amendments-view") {
        const outcome = writeAmendmentsView(root, epochs ? { epochs } : {});
        if (outcome.ok) written.push(outcome.relative);
        else errors.push(...outcome.errors);
      } else {
        errors.push(`unknown repair kind '${repair.kind}'`);
      }
    }
  }
  return { ok: errors.length === 0, written, errors };
}

// Advance a domain's epoch in <root>/core/contracts.json (forward-only, atomic,
// re-validated after the rename). The edit is a single-occurrence string
// replacement so the hand-formatted contract file keeps its exact layout.
export function advanceEpoch(root, domain, toState) {
  if (!EPOCH_CONTRACT.states.includes(toState)) {
    return { ok: false, errors: [`epoch: unknown target state '${toState}' — fail-closed`] };
  }
  const relative = "core/contracts.json";
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return { ok: false, errors: [`${relative} is missing`] };
  const text = fs.readFileSync(absolute, "utf8");
  let fromState;
  try {
    const parsed = JSON.parse(text);
    fromState = parsed?.structures?.epochs?.domains?.[domain];
  } catch (err) {
    return { ok: false, errors: [`${relative}: ${err.message}`] };
  }
  if (typeof fromState !== "string" || !EPOCH_CONTRACT.states.includes(fromState)) {
    return { ok: false, errors: [`${relative}: domain '${domain}' has no valid declared epoch — fail-closed`] };
  }
  if (EPOCH_CONTRACT.states.indexOf(toState) <= EPOCH_CONTRACT.states.indexOf(fromState)) {
    return { ok: false, errors: [`epoch: domain '${domain}' is already at '${fromState}' — advance must move forward (target '${toState}')`] };
  }
  const needle = `"${domain}": "${fromState}"`;
  if (text.split(needle).length - 1 !== 1) {
    return { ok: false, errors: [`${relative}: expected exactly one '${needle}' — refusing an ambiguous edit (fail-closed)`] };
  }
  const nextText = text.replace(needle, `"${domain}": "${toState}"`);
  try {
    JSON.parse(nextText);
  } catch (err) {
    return { ok: false, errors: [`${relative}: post-edit parse failed — not writing: ${err.message}`] };
  }
  const temp = `${absolute}.tmp-${process.pid}`;
  try {
    const fd = fs.openSync(temp, "w");
    try {
      fs.writeSync(fd, nextText);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(temp, absolute);
  } catch (err) {
    try { fs.rmSync(temp, { force: true }); } catch { /* best effort */ }
    return { ok: false, errors: [`epoch: atomic write failed: ${err.message}`] };
  }
  const verified = JSON.parse(fs.readFileSync(absolute, "utf8"));
  if (verified?.structures?.epochs?.domains?.[domain] !== toState) {
    return { ok: false, errors: [`${relative}: post-write verification failed for domain '${domain}'`] };
  }
  return { ok: true, domain, from: fromState, to: toState, relative };
}
