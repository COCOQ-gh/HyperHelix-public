// =============================================================================
// HyperHelix — tools/lib/edge-model.mjs
// HH-075: ONE typed-edge generic checker replacing seven graph-shaped validate
// guards (GATE_DEAD_CONFIG, PHASE_CONSISTENCY, STEP_CONSISTENCY,
// TOOL_DOC_CONSISTENCY, CHECK_DOC_CONSISTENCY, NOTE_FIELD_SCHEMA,
// AMEND_LIFECYCLE_CONSUMER). Every rule is one row of the typed-edge registry
// below: a FROM node set, a TO node set / corpus, and the membership predicate
// "every declared FROM node must reach a TO consumer" (AP-003
// declaration-without-consumer) — plus reverse rows where the legacy guard was
// bidirectional. Edge data is AUTO-EXTRACTED from the same materials the legacy
// guards parsed (no hand-maintained edge ledger — HH-075 condition 2). Legacy
// error codes remain the classification labels so the external contract
// (framework-review R1 enumeration, tests, generated docs) is unchanged.
// Dependency-free in-memory JS (no sqlite; HH-067 stays yaml+Ajv — HH-075
// condition 3 preferred path).
// =============================================================================
import fs from "node:fs";
import path from "node:path";
import { loadLoop, loadGates, gateParameterKeys, CORE_GATES } from "./core-model.mjs";
import { loadKnowledge } from "./knowledge.mjs";
import { AMENDMENTS_LIFECYCLE } from "./contracts.mjs";

// HH:ARCH-ALLOW reason="edge extraction reads the same doc-consistency surfaces the legacy guards read (ledger header text, corpus walks); note/loop/gates STATE still comes only from the repositories"
const KNOWLEDGE = "core/knowledge.yaml";
// /HH:ARCH-ALLOW

const err = (code, message) => ({ level: "error", code, message });
const wrn = (code, message) => ({ level: "warn", code, message });

function readRel(root, rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function walkFiles(root, rel, exts, exclude, out) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return out;
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    const childRel = `${rel}/${ent.name}`;
    if (ent.isDirectory()) walkFiles(root, childRel, exts, exclude, out);
    else if (exts.some((e) => ent.name.endsWith(e)) && childRel !== exclude) out.push(readRel(root, childRel));
  }
  return out;
}

// Lazy extraction context. Tests inject synthetic values via `overrides` to
// build POSITIVE fixtures (HH-028) without a filesystem; production leaves it
// empty and every value is extracted from the live materials.
function makeCtx(root, overrides = {}) {
  const memo = new Map();
  const lazy = (key, fn) => {
    if (key in overrides) return overrides[key];
    if (!memo.has(key)) memo.set(key, fn());
    return memo.get(key);
  };
  return {
    exists: (rel) => ("files" in overrides ? overrides.files[rel] != null : fs.existsSync(path.join(root, rel))),
    read: (rel) => ("files" in overrides ? overrides.files[rel] : readRel(root, rel)),
    gates: () => lazy("gates", () => loadGates()),
    loop: () => lazy("loop", () => loadLoop()),
    knowledge: () => lazy("knowledge", () => loadKnowledge(root)),
    knowledgeHeader: () => lazy("knowledgeHeader", () => readRel(root, KNOWLEDGE)),
    toolText: () => lazy("toolText", () => readRel(root, "tools/hyperhelix.mjs")),
    gateCorpus: () =>
      lazy("gateCorpus", () => {
        const corpus = [];
        // HH:ARCH-ALLOW reason="consumption-corpus scan carried over from the legacy GATE_DEAD_CONFIG guard — the CORE_GATES exclusion keeps the theta canon out of its own corpus"
        walkFiles(root, "core", [".yaml", ".md"], CORE_GATES, corpus);
        // /HH:ARCH-ALLOW
        walkFiles(root, "assets", [".md"], null, corpus);
        walkFiles(root, "tools", [".mjs"], null, corpus);
        return corpus.join("\n");
      }),
    docCorpus: () =>
      lazy("docCorpus", () => {
        const corpus = [];
        for (const rel of ["README.md", "AGENTS.md", "CLAUDE.md", "entrypoint.md", "amendments.md"]) {
          if (fs.existsSync(path.join(root, rel))) corpus.push(readRel(root, rel));
        }
        walkFiles(root, "core", [".md", ".yaml"], null, corpus);
        walkFiles(root, "assets", [".md", ".yaml"], null, corpus);
        walkFiles(root, ".claude/commands", [".md", ".yaml"], null, corpus);
        return corpus.join("\n");
      }),
    lifecycleConsumers: () => lazy("lifecycleConsumers", () => AMENDMENTS_LIFECYCLE.requiredConsumers),
    refCorpus: () => lazy("refCorpus", () => referenceCorpus(root)),
  };
}

// REF_PATH_EXISTS corpus: the live procedure materials (entry points, core loop /
// routing / gates, checklists, workflows, launch commands). Ledgers and failure
// catalogs are excluded — they cite retired paths as history on purpose.
function referenceCorpus(root) {
  const out = [];
  const add = (rel) => {
    const text = readRel(root, rel);
    if (/HH:ACTIVE-SCAN-ALLOW-FILE|DEPRECATED/.test(text.split(/\r?\n/).slice(0, 20).join("\n"))) return;
    out.push({ rel, text });
  };
  for (const rel of ["entrypoint.md", "constitution.md"]) if (fs.existsSync(path.join(root, rel))) add(rel);
  const dir = (rel, keep) => {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return;
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      if (ent.isFile() && keep(ent.name)) add(`${rel}/${ent.name}`);
    }
  };
  dir("core", (name) => name.endsWith(".yaml") && !name.startsWith("knowledge") && !name.startsWith("dictionary"));
  dir("assets/checklists", (name) => name.endsWith(".md"));
  dir("assets/workflows", (name) => name.endsWith(".md"));
  dir(".claude/commands/skills", (name) => name.endsWith(".md"));
  return out;
}

// A path reference = a repository-rooted token that names a file (has an extension) or a
// directory (trailing slash). Globs, placeholders and elided paths are not references.
const PATH_REF_RE = /(?<![A-Za-z0-9_.\-/<>])((?:assets|core|tools|docs|governance|test|test-e2e|\.claude\/commands|\.codex|\.github)\/[A-Za-z0-9_.\-/]*[A-Za-z0-9_/])/g;
export function extractPathRefs(text) {
  const refs = new Set();
  for (const match of String(text).matchAll(PATH_REF_RE)) {
    const ref = match[1];
    const next = text[match.index + match[0].length] ?? "";
    if (/[*<{$]/.test(next) || ref.includes("...")) continue;
    if (ref.endsWith("/") || /\.[a-z]{2,5}$/.test(ref)) refs.add(ref);
  }
  return [...refs];
}

// --- the typed-edge registry -------------------------------------------------
// One row per rule: code (legacy classification label), edge (type annotation),
// check(root, ctx) extracting FROM/TO and returning membership failures.
export const EDGE_RULES = [
  {
    code: "GATE_DEAD_CONFIG",
    edge: "gates.param --consumed-by--> core|assets|tools corpus",
    check(root, ctx) {
      const issues = [];
      if (!ctx.exists(CORE_GATES)) return issues;
      const gates = ctx.gates();
      if (!gates.ok) return gates.errors.map((message) => err("CORE_MODEL", message));
      const params = gateParameterKeys(gates.value);
      if (params.length === 0) return issues;
      const hay = ctx.gateCorpus();
      for (const key of params) {
        if (!hay.includes(key)) {
          issues.push(wrn("GATE_DEAD_CONFIG", `core/gates.yaml param '${key}' is declared but referenced nowhere in core/assets/tools — dead config? (AP-003: wire a consumer in the same change, or remove it via a theta amendment)`));
        }
      }
      return issues;
    },
  },
  {
    code: "PHASE_CONSISTENCY",
    edge: "phase_gate.evidence --declared-by--> phase.artifacts; phase.artifacts --gated-by--> next phase_gate",
    check(root, ctx) {
      const issues = [];
      const PHASES = ["search", "plan", "execute", "evaluate", "distill"];
      const CONDITIONAL = new Set(["risk-list"]); // HH-036: intentionally not gated by the next phase
      const GATE_ONLY = new Set(["task-request"]); // gate evidence that is not a produced artifact
      const model = ctx.loop();
      if (!model.ok) return model.errors.map((message) => err("CORE_MODEL", message));
      const loop = model.value;
      const artByPhase = {};
      for (const phase of PHASES) artByPhase[phase] = loop.phases[phase].artifacts ?? [];
      const gates = {};
      for (const phase of PHASES) gates[phase] = loop.phase_gate.table[phase].evidence ?? [];
      const allArts = new Set(Object.values(artByPhase).flat());
      for (const [phase, ev] of Object.entries(gates)) {
        for (const name of ev) {
          if (!allArts.has(name) && !GATE_ONLY.has(name)) {
            issues.push(err("PHASE_CONSISTENCY", `phase_gate ${phase} evidence '${name}' is not a produced artifact (typo or renamed artifact?)`));
          }
        }
      }
      for (let i = 0; i < PHASES.length - 1; i++) {
        const phase = PHASES[i], next = PHASES[i + 1];
        const nextEv = new Set(gates[next] || []);
        for (const a of artByPhase[phase]) {
          if (!CONDITIONAL.has(a) && !nextEv.has(a)) {
            issues.push(wrn("PHASE_CONSISTENCY", `artifact '${a}' produced by ${phase} is not gated by ${next} (declare<->consume gap — add to phase_gate ${next} evidence, or mark conditional; HH-036)`));
          }
        }
      }
      return issues;
    },
  },
  {
    code: "STEP_CONSISTENCY",
    edge: "depth_modes.step-ref --defined-by--> loop.phases.steps",
    check(root, ctx) {
      const model = ctx.loop();
      if (!model.ok) return model.errors.map((message) => err("CORE_MODEL", message));
      const loop = model.value;
      const defined = new Set(Object.values(loop.phases).flatMap((phase) => Object.keys(phase.steps ?? {})));
      const referenced = new Set();
      for (const mode of Object.values(loop.depth_modes)) {
        for (const list of [mode.required_steps, mode.minimum_outputs]) {
          if (!Array.isArray(list)) continue; // `required_steps: all` and absent lists reference nothing
          for (const s of list) {
            if (/^[SPEVD]\d[a-z]?$/.test(s)) referenced.add(s);
          }
        }
      }
      const issues = [];
      for (const s of referenced) {
        if (!defined.has(s)) {
          issues.push(err("STEP_CONSISTENCY", `depth_modes references step '${s}' that is not defined in loop.yaml phases (dangling step ref; define it or fix the required_steps/minimum_outputs list)`));
        }
      }
      return issues;
    },
  },
  {
    code: "TOOL_DOC_CONSISTENCY",
    edge: "cli.subcommand --documented-by--> README|core|assets|.claude/commands corpus",
    check(root, ctx) {
      const issues = [];
      const subs = [...new Set([...ctx.toolText().matchAll(/command === "([a-z][a-z-]*)"/g)].map((m) => m[1]))];
      if (subs.length === 0) { issues.push(wrn("TOOL_DOC_CONSISTENCY", "no subcommands parsed from tools/hyperhelix.mjs dispatch")); return issues; }
      const hay = ctx.docCorpus();
      for (const s of subs) {
        if (!hay.includes(s)) {
          issues.push(wrn("TOOL_DOC_CONSISTENCY", `hyperhelix.mjs subcommand '${s}' is referenced by no material (README/core/assets/.claude/commands) — orphan tool? (AP-003: document it where operators look, or remove the subcommand)`));
        }
      }
      return issues;
    },
  },
  {
    code: "CHECK_DOC_CONSISTENCY",
    edge: "validate.guard-code --listed-by--> framework-review R1 enumeration",
    check(root, ctx) {
      const issues = [];
      if (!ctx.exists("assets/checklists/framework-review.md")) return issues;
      const BASIC = new Set(["MISSING_FILE", "ENTRYPOINT", "SCHEMA", "COUNTER", "NOTE_ID", "NOTE_FIELD", "FRAMEWORK_REVIEW", "TASK_LIST", "ANCHOR", "ACTIVE_SCAN"]);
      // Codes = literal error()/warn() calls remaining in the CLI + this
      // registry's own rows (the seven relocated codes must stay documented —
      // the self-referential half of the legacy CHECK_DOC guard).
      const codes = [...new Set([
        ...[...ctx.toolText().matchAll(/(?:error|warn)\("([A-Z_]+)"/g)].map((m) => m[1]),
        ...EDGE_RULES.map((r) => r.code),
      ])];
      const review = ctx.read("assets/checklists/framework-review.md");
      for (const c of codes.filter((c) => !BASIC.has(c))) {
        if (!review.includes(c)) {
          issues.push(wrn("CHECK_DOC_CONSISTENCY", `validate guard '${c}' is not listed in assets/checklists/framework-review.md R1 mechanical guards — reviewers won't know it exists (add it to the R1 guard enumeration, or add it to BASIC if it is a low-level schema check)`));
        }
      }
      return issues;
    },
  },
  {
    code: "NOTE_FIELD_SCHEMA",
    edge: "ledger.header.field <--documents--> ledger.note.field (bidirectional)",
    check(root, ctx) {
      const issues = [];
      const text = ctx.knowledgeHeader();
      const s = text.indexOf("NOTE FIELDS");
      const e = text.indexOf("PER-TASK", s);
      if (s < 0 || e < 0) { issues.push(wrn("NOTE_FIELD_SCHEMA", `${KNOWLEDGE} header NOTE FIELDS block not found`)); return issues; }
      const declared = new Set([...text.slice(s, e).matchAll(/^#[ \t]{2,}([a-z_]+)[ \t]*:/gm)].map((m) => m[1]));
      const fieldState = ctx.knowledge();
      const used = new Set();
      if (fieldState.ok) for (const note of fieldState.value.notes) for (const key of Object.keys(note)) { if (key !== "sourceFile") used.add(key); }
      if (declared.size === 0 || used.size === 0) { issues.push(wrn("NOTE_FIELD_SCHEMA", `could not parse declared (${declared.size}) / used (${used.size}) note fields`)); return issues; }
      for (const d of declared) {
        if (!used.has(d)) issues.push(wrn("NOTE_FIELD_SCHEMA", `header documents note field '${d}' but no note uses it (phantom field — remove from header or use it)`));
      }
      for (const u of used) {
        if (!declared.has(u)) issues.push(wrn("NOTE_FIELD_SCHEMA", `note field '${u}' is used but not in the header NOTE FIELDS list (undocumented field — document it, and wire its D7 procedure per HH-039)`));
      }
      return issues;
    },
  },
  {
    code: "AMEND_LIFECYCLE_CONSUMER",
    edge: "contracts.amendments_lifecycle.required_consumer --consumed-by--> consumer file content",
    check(root, ctx) {
      const issues = [];
      for (const consumer of ctx.lifecycleConsumers()) {
        if (!ctx.exists(consumer.path)) {
          issues.push(err("AMEND_LIFECYCLE_CONSUMER", `${consumer.path} is missing`));
          continue;
        }
        const hits = ctx.read(consumer.path).split(consumer.needle).length - 1;
        if (hits < consumer.min_hits) {
          issues.push(err("AMEND_LIFECYCLE_CONSUMER", `${consumer.path} must contain '${consumer.needle}' at least ${consumer.min_hits} time(s); found ${hits}`));
        }
      }
      return issues;
    },
  },
  {
    // Added after HH-081 stage 4 left three dangling references found by three separate
    // manual sweeps (routing destination, task-list schema, an e2e import): the mechanical
    // half of framework-review R1 "every referenced path exists" / (a4).
    code: "REF_PATH_EXISTS",
    edge: "material.path-reference --resolves-to--> repository file|directory",
    check(root, ctx) {
      const issues = [];
      for (const { rel, text } of ctx.refCorpus()) {
        for (const ref of extractPathRefs(text)) {
          if (!ctx.exists(ref.replace(/\/$/, ""))) {
            issues.push(wrn("REF_PATH_EXISTS", `${rel} references '${ref}', which does not exist — rewire or remove the reference in the change that removed its target (framework-review R1 a4)`));
          }
        }
      }
      return issues;
    },
  },
];

export const EDGE_CODES = EDGE_RULES.map((r) => r.code);

// Generic evaluation loop — the ONLY execution path for the seven codes.
// `codes` filters (preserving registry order) so validate() can keep the legacy
// issue ordering around interleaved non-graph guards; `overrides` is test-only.
export function checkTypedEdges(root, { codes = null, overrides = {} } = {}) {
  const ctx = makeCtx(root, overrides);
  const selected = codes ? EDGE_RULES.filter((r) => codes.includes(r.code)) : EDGE_RULES;
  const issues = [];
  for (const rule of selected) issues.push(...rule.check(root, ctx));
  return issues;
}
