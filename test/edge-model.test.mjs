// HH-075: positive detector fixtures (HH-028) for the typed-edge generic
// checker — every legacy guard code must FIRE through the new registry before
// the old per-guard implementations may stay deleted (parity condition 4 of the
// HH-075 ratification). Fixtures inject synthetic extraction results via
// `overrides`; the negative/parity half is the live repo reading green
// (validate 0 error) plus the L1-L4 verify chain.
import test from "node:test";
import assert from "node:assert/strict";

import { EDGE_CODES, EDGE_RULES, checkTypedEdges, extractPathRefs } from "../tools/lib/edge-model.mjs";

const ROOT = "Z:/nonexistent-fixture-root"; // rules must not touch the fs when overrides supply everything

function firing(codes, overrides) {
  return checkTypedEdges(ROOT, { codes, overrides });
}

test("HH-075 registry covers the seven relocated codes plus REF_PATH_EXISTS", () => {
  assert.deepEqual(EDGE_CODES, [
    "GATE_DEAD_CONFIG",
    "PHASE_CONSISTENCY",
    "STEP_CONSISTENCY",
    "TOOL_DOC_CONSISTENCY",
    "CHECK_DOC_CONSISTENCY",
    "NOTE_FIELD_SCHEMA",
    "AMEND_LIFECYCLE_CONSUMER",
    "REF_PATH_EXISTS",
  ]);
  for (const rule of EDGE_RULES) assert.ok(rule.edge.includes("--"), `${rule.code} carries a typed edge annotation`);
});

test("GATE_DEAD_CONFIG fires on a declared-but-unconsumed gate param", () => {
  const issues = firing(["GATE_DEAD_CONFIG"], {
    files: { "core/gates.yaml": "present" },
    gates: { ok: true, value: { search: { dead_param_xyz: 6 } } },
    gateCorpus: "corpus without the param",
  });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "GATE_DEAD_CONFIG");
  assert.equal(issues[0].level, "warn");
  assert.match(issues[0].message, /dead_param_xyz.*dead config/);
});

test("PHASE_CONSISTENCY fires on dangling evidence (error) and ungated artifact (warn)", () => {
  const phases = {};
  for (const p of ["search", "plan", "execute", "evaluate", "distill"]) phases[p] = { artifacts: [], steps: {} };
  phases.search.artifacts = ["ghost-artifact"];
  const table = {};
  for (const p of ["search", "plan", "execute", "evaluate", "distill"]) table[p] = { evidence: [] };
  table.plan.evidence = ["phantom-evidence"];
  const issues = firing(["PHASE_CONSISTENCY"], {
    loop: { ok: true, value: { phases, phase_gate: { table }, depth_modes: {} } },
  });
  const dangling = issues.find((i) => i.message.includes("phantom-evidence"));
  const ungated = issues.find((i) => i.message.includes("ghost-artifact"));
  assert.equal(dangling?.level, "error");
  assert.equal(ungated?.level, "warn");
  assert.ok(issues.every((i) => i.code === "PHASE_CONSISTENCY"));
});

test("STEP_CONSISTENCY fires on a depth-mode step ref with no definition", () => {
  const phases = {};
  for (const p of ["search", "plan", "execute", "evaluate", "distill"]) phases[p] = { artifacts: [], steps: {} };
  const table = {};
  for (const p of ["search", "plan", "execute", "evaluate", "distill"]) table[p] = { evidence: [] };
  const issues = firing(["STEP_CONSISTENCY"], {
    loop: { ok: true, value: { phases, phase_gate: { table }, depth_modes: { ghost: { required_steps: ["S9"], minimum_outputs: [] } } } },
  });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "STEP_CONSISTENCY");
  assert.equal(issues[0].level, "error");
  assert.match(issues[0].message, /step 'S9'/);
});

test("TOOL_DOC_CONSISTENCY fires on an undocumented subcommand and on an unparseable dispatch", () => {
  const orphan = firing(["TOOL_DOC_CONSISTENCY"], {
    toolText: 'if (command === "ghost-subcmd") {}',
    docCorpus: "no mention of it anywhere",
  });
  assert.equal(orphan.length, 1);
  assert.match(orphan[0].message, /ghost-subcmd.*orphan tool/);
  const unparsed = firing(["TOOL_DOC_CONSISTENCY"], { toolText: "", docCorpus: "" });
  assert.match(unparsed[0].message, /no subcommands parsed/);
});

test("CHECK_DOC_CONSISTENCY fires on a guard code missing from framework-review R1", () => {
  const reviewListingEdgeCodes = EDGE_CODES.join(" ");
  const issues = firing(["CHECK_DOC_CONSISTENCY"], {
    files: { "assets/checklists/framework-review.md": reviewListingEdgeCodes },
    toolText: 'issues.push(error("GHOST_GUARD", "x"));',
  });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "CHECK_DOC_CONSISTENCY");
  assert.match(issues[0].message, /GHOST_GUARD/);
});

test("CHECK_DOC_CONSISTENCY self-lists the relocated edge codes (they cannot silently vanish)", () => {
  const issues = firing(["CHECK_DOC_CONSISTENCY"], {
    files: { "assets/checklists/framework-review.md": "GATE_DEAD_CONFIG only" },
    toolText: "",
  });
  const flagged = issues.map((i) => i.message.match(/guard '([A-Z_]+)'/)[1]).sort();
  const expected = EDGE_CODES.filter((c) => c !== "GATE_DEAD_CONFIG").sort();
  assert.deepEqual(flagged, expected);
});

test("NOTE_FIELD_SCHEMA fires both directions (phantom header field / undocumented data field)", () => {
  const header = "NOTE FIELDS\n#   id        : the id\n#   ghost     : phantom field\nPER-TASK";
  const issues = firing(["NOTE_FIELD_SCHEMA"], {
    knowledgeHeader: header,
    knowledge: { ok: true, value: { notes: [{ id: "N-1", mystery: "y", sourceFile: "core/knowledge.yaml" }] } },
  });
  assert.ok(issues.some((i) => i.message.includes("'ghost'") && i.message.includes("phantom field")));
  assert.ok(issues.some((i) => i.message.includes("'mystery'") && i.message.includes("undocumented field")));
  assert.ok(issues.every((i) => i.code === "NOTE_FIELD_SCHEMA" && i.level === "warn"));
});

test("AMEND_LIFECYCLE_CONSUMER fires on a missing consumer file and on too few needle hits", () => {
  const issues = firing(["AMEND_LIFECYCLE_CONSUMER"], {
    files: { "present.md": "needle appears once" },
    lifecycleConsumers: [
      { path: "missing.md", needle: "x", min_hits: 1 },
      { path: "present.md", needle: "needle", min_hits: 2 },
    ],
  });
  assert.equal(issues.length, 2);
  assert.ok(issues.every((i) => i.code === "AMEND_LIFECYCLE_CONSUMER" && i.level === "error"));
  assert.match(issues[0].message, /missing\.md is missing/);
  assert.match(issues[1].message, /at least 2 time\(s\); found 1/);
});

test("REF_PATH_EXISTS fires on a missing file and a missing directory, and only on those", () => {
  const text = [
    "see assets/workflows/gone.md and core/loop.yaml,",
    "route to assets/templates/ (retired) but keep assets/checklists/ ;",
    "globs like assets/workflows/*.md, placeholders like core/knowledge/<project>.yaml,",
    "nested host paths like doc/HyperHelix/tools/compaction-hooks.mjs, and bare words like tools/ are not references to check here",
  ].join("\n");
  const issues = firing(["REF_PATH_EXISTS"], {
    refCorpus: [{ rel: "assets/checklists/fixture.md", text }],
    files: { "core/loop.yaml": "present", "assets/checklists": "present", tools: "present" },
  });
  assert.deepEqual(
    issues.map((i) => i.message.match(/references '([^']+)'/)[1]).sort(),
    ["assets/templates/", "assets/workflows/gone.md"],
  );
  assert.ok(issues.every((i) => i.code === "REF_PATH_EXISTS" && i.level === "warn"));
  assert.match(issues[0].message, /^assets\/checklists\/fixture\.md references/);
});

test("extractPathRefs keeps files and directories, drops globs / placeholders / elisions", () => {
  assert.deepEqual(
    extractPathRefs("a `tools/hyperhelix.mjs` b core/knowledge/ c test/*.mjs d docs/... e .claude/commands/skills/cycle.md").sort(),
    [".claude/commands/skills/cycle.md", "core/knowledge/", "tools/hyperhelix.mjs"],
  );
});

test("code filter preserves registry order and unknown codes select nothing", () => {
  const issues = firing(["NOT_A_CODE"], {});
  assert.deepEqual(issues, []);
});
