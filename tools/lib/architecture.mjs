// SC-07 (structured-canon-migration-plan): the architecture gate.
// Boundaries enforced as RESPONSIBILITIES, not as "regex count 0":
//   R1 ARCH_DIRECT  (SC-RT-13): a direct fs/git access that NAMES a canonical
//      domain path (literal or accessor/alias token) outside that domain's
//      repository module.
//   R2 ARCH_STATE_READER (SC-RT-14): Markdown-table/state-extraction readers
//      (parseMarkdownTables / splitMarkdownRow / the retired knowledge line
//      parsers) outside the designated legacy-adapter modules.
// Escape hatch: an intentional crossing carries `HH:ARCH-ALLOW reason="..."`
// on the same or the immediately preceding line — the reason is REQUIRED, so
// every exception is visible and auditable (the plan's "explicit reserved
// declaration"). Known limitation (documented, on purpose): access routed
// through a variable (e.g. `const p = path.join(root, X); fs.readFileSync(p)`)
// is not resolved — this gate is a tripwire on direct-named access, and the
// repository APIs remain the only sanctioned front door.
// Detectors ship with positive fixtures (test/architecture.test.mjs).

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  KNOWLEDGE_CONTRACT,
  GOVERNANCE_CONTRACT,
} from "./contracts.mjs";
import { CORE_LOOP, CORE_ROUTING, CORE_GATES } from "./core-model.mjs";

// Domain map: canonical path VALUES + source-token spellings -> the one module
// allowed to touch them directly. contracts.mjs is the contract repository and
// is exempt as a whole (it bootstraps every accessor).
const DOMAINS = [
  {
    domain: "knowledge",
    repository: "tools/lib/knowledge.mjs",
    literals: [KNOWLEDGE_CONTRACT.manifest, KNOWLEDGE_CONTRACT.mainLedger, KNOWLEDGE_CONTRACT.ledgerDir],
    tokens: [/\bKNOWLEDGE_CONTRACT\./, /\bKNOWLEDGE\b/, /\bKNOWLEDGE_DIR\b/],
  },
  {
    domain: "governance",
    repository: "tools/lib/governance.mjs",
    literals: [GOVERNANCE_CONTRACT.registry, GOVERNANCE_CONTRACT.bodiesDir, GOVERNANCE_CONTRACT.viewTemplate, GOVERNANCE_CONTRACT.view],
    tokens: [/\bGOVERNANCE_CONTRACT\./],
  },
  {
    domain: "core",
    repository: "tools/lib/core-model.mjs",
    literals: [CORE_LOOP, CORE_ROUTING, CORE_GATES],
    tokens: [/\bCORE_LOOP\b/, /\bCORE_ROUTING\b/, /\bCORE_GATES\b/, /\bGATES\b/],
  },
  {
    domain: "contract",
    repository: "tools/lib/contracts.mjs",
    literals: ["core/contracts.json"],
    tokens: [/\bCONTRACTS\b/],
  },
];

// fs/git calls that constitute ACCESS when they name a canonical path.
const ACCESS_RE = /\b(?:readFileSync|writeFileSync|appendFileSync|copyFileSync|cpSync|renameSync|rmSync|readFile|writeFile)\s*\(|\bgit\(\[/;

// State-extraction readers: allowed only inside the legacy-adapter modules. Since
// HH-081 stage 4 there are none (the Markdown brief/evidence adapters were retired),
// so every reader outside an annotated crossing is a violation — the detectors stay
// as a tripwire against reintroducing Markdown-table state.
const STATE_READER_RES = [
  /\bparseMarkdownTables\s*\(/,
  /\bsplitMarkdownRow\s*\(/,
  /function parseNotes\b/,
  /function loadAllNotes\b/,
  /function ledgerFiles\b/,
];
const LEGACY_ADAPTER_FILES = new Set();

const EXEMPT_FILES = new Set(["tools/lib/contracts.mjs", "tools/lib/architecture.mjs"]);

const ALLOW_RE = /HH:ARCH-ALLOW\s+reason="[^"]+"/;
const ALLOW_MENTION_RE = /HH:ARCH-ALLOW/;

function normalize(relative) {
  return relative.replaceAll("\\", "/");
}

export function scanSourceLines(text, { file }) {
  const relative = normalize(file);
  if (EXEMPT_FILES.has(relative)) return [];
  const lines = String(text).split(/\r?\n/);
  const violations = [];
  const allowed = (index) => ALLOW_RE.test(lines[index]) || (index > 0 && ALLOW_RE.test(lines[index - 1]));
  const mentionsAllow = (index) => ALLOW_MENTION_RE.test(lines[index]) || (index > 0 && ALLOW_MENTION_RE.test(lines[index - 1]));
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (ACCESS_RE.test(line)) {
      for (const spec of DOMAINS) {
        if (relative === spec.repository) continue;
        const named = spec.literals.some((literal) => line.includes(literal)) || spec.tokens.some((re) => re.test(line));
        if (!named) continue;
        if (allowed(index)) continue;
        violations.push(`${relative}:${index + 1}: direct ${spec.domain}-canon access outside ${spec.repository}${mentionsAllow(index) ? " (HH:ARCH-ALLOW needs a reason=\"...\")" : ""} — go through the domain repository or annotate HH:ARCH-ALLOW reason=\"...\"`);
        break;
      }
    }
    if (!LEGACY_ADAPTER_FILES.has(relative)) {
      for (const re of STATE_READER_RES) {
        if (!re.test(line)) continue;
        if (allowed(index)) continue;
        violations.push(`${relative}:${index + 1}: state-extraction reader (${re.source}) outside the legacy adapter${mentionsAllow(index) ? " (HH:ARCH-ALLOW needs a reason=\"...\")" : ""} — structured state comes from domain repositories (SC-07)`);
        break;
      }
    }
  }
  return violations;
}

function listSourceFiles(root, relative, out) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const childRelative = `${relative}/${entry.name}`;
    if (entry.isDirectory()) listSourceFiles(root, childRelative, out);
    else if (entry.name.endsWith(".mjs")) out.push(childRelative);
  }
}

export function validateArchitecture(root = process.cwd()) {
  const files = [];
  listSourceFiles(root, "tools", files);
  const violations = [];
  for (const file of files) {
    violations.push(...scanSourceLines(fs.readFileSync(path.join(root, file), "utf8"), { file }));
  }
  return violations;
}
