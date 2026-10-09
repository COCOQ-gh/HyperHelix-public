// SC-02 (structured-canon-migration-plan): the core-model repository — the ONLY
// reader for core/loop.yaml, core/routing.yaml, core/gates.yaml. Consumers receive
// validated objects; they never see YAML text, line positions, or regexes.
// Line-regex extraction of these three files is forbidden outside this module
// (architecture gate arrives in SC-07; until then tests + review enforce it).
// fail-closed: parse or schema failure returns ok:false — callers must surface
// it as an error, never fall back to defaults.

import fs from "node:fs";
import path from "node:path";
import {
  parseYamlStrict,
  createStrictValidator,
  compileSchema,
  validateWithSchema,
  dispatchSchemaVersion,
} from "./schema-runtime.mjs";

export const CORE_LOOP = "core/loop.yaml";
export const CORE_ROUTING = "core/routing.yaml";
export const CORE_GATES = "core/gates.yaml";

const arrayOfStrings = { type: "array", items: { type: "string" } };
const nonEmptyString = { type: "string", minLength: 1 };

// Step ids: S1, D2b, ... (the [SPEVD]\d[a-z]? vocabulary from the legacy regex).
const STEP_ID_PATTERN = "^[SPEVD]\\d[a-z]?$";

const PHASE_NAMES = ["search", "plan", "execute", "evaluate", "distill"];

const phaseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["purpose", "steps", "artifacts", "checklist"],
  properties: {
    purpose: nonEmptyString,
    steps: {
      type: "object",
      minProperties: 1,
      propertyNames: { pattern: STEP_ID_PATTERN },
      additionalProperties: nonEmptyString,
    },
    artifacts: arrayOfStrings,
    checklist: nonEmptyString,
    // named prose extensions present today; unknown keys stay rejected
    task_list_schema: nonEmptyString,
    agent_roles: nonEmptyString,
    async_delegation: nonEmptyString,
    failure_attribution: nonEmptyString,
  },
};

const depthModeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    use_when: arrayOfStrings,
    forbidden_when: arrayOfStrings,
    minimum_outputs: arrayOfStrings,
    required_steps: { anyOf: [arrayOfStrings, { const: "all" }] },
    conditional_steps: nonEmptyString,
    record_in: nonEmptyString,
    note: nonEmptyString,
    deliverable: nonEmptyString,
    handoff: nonEmptyString,
  },
};

const LOOP_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["schema_version", "loop", "depth_modes", "phase_gate", "phases", "exceptions", "meta_strand", "task_summary"],
  properties: {
    schema_version: { type: "integer" },
    loop: {
      type: "object",
      additionalProperties: false,
      required: ["phases", "rules"],
      properties: { phases: { type: "array", items: { enum: PHASE_NAMES } }, rules: arrayOfStrings },
    },
    depth_modes: {
      type: "object",
      minProperties: 1,
      additionalProperties: depthModeSchema,
    },
    phase_gate: {
      type: "object",
      additionalProperties: false,
      required: ["rule", "evidence", "table", "checklist"],
      properties: {
        rule: nonEmptyString,
        evidence: nonEmptyString,
        conditional_evidence: nonEmptyString,
        table: {
          type: "object",
          additionalProperties: false,
          required: PHASE_NAMES,
          properties: Object.fromEntries(PHASE_NAMES.map((phase) => [phase, {
            type: "object",
            additionalProperties: false,
            required: ["requires", "evidence"],
            properties: { requires: arrayOfStrings, evidence: arrayOfStrings },
          }])),
        },
        checklist: nonEmptyString,
      },
    },
    phases: {
      type: "object",
      additionalProperties: false,
      required: PHASE_NAMES,
      properties: Object.fromEntries(PHASE_NAMES.map((phase) => [phase, phaseSchema])),
    },
    exceptions: {
      type: "object",
      additionalProperties: false,
      required: ["reference"],
      properties: {
        reference: nonEmptyString,
        "EX-1": exceptionSchema(), "EX-2": exceptionSchema(), "EX-3": exceptionSchema(),
        "EX-4": exceptionSchema(), "EX-5": exceptionSchema(),
      },
    },
    meta_strand: {
      type: "object",
      additionalProperties: false,
      required: ["fold", "review_triggers", "review"],
      properties: {
        fold: nonEmptyString,
        review_triggers: arrayOfStrings,
        review: nonEmptyString,
        anti_self_purpose: nonEmptyString,
      },
    },
    task_summary: {
      type: "object",
      additionalProperties: false,
      required: ["required_when", "fields"],
      properties: { required_when: nonEmptyString, fields: arrayOfStrings },
    },
  },
};

function exceptionSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["name", "action"],
    properties: { name: nonEmptyString, action: nonEmptyString },
  };
}

const ROUTING_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["schema_version", "principles", "routing", "validation"],
  properties: {
    schema_version: { type: "integer" },
    principles: arrayOfStrings,
    routing: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "destination"],
        properties: { kind: nonEmptyString, destination: nonEmptyString },
      },
    },
    significant_discovery_parking: {
      type: "object",
      additionalProperties: false,
      required: ["triggers", "action", "transaction", "task_index", "review_only"],
      properties: {
        triggers: arrayOfStrings,
        action: nonEmptyString,
        transaction: {
          type: "object",
          additionalProperties: false,
          required: ["purpose", "depth_by_artifact", "micro_policy", "separation", "capture_record", "pending_hh_consumer"],
          properties: {
            purpose: nonEmptyString,
            depth_by_artifact: {
              type: "object",
              additionalProperties: false,
              required: ["non_governance", "pending_hh"],
              properties: {
                non_governance: { const: "standard" },
                pending_hh: { const: "full" },
              },
            },
            micro_policy: nonEmptyString,
            separation: nonEmptyString,
            capture_record: {
              type: "array",
              prefixItems: [
                { const: "capture_task_id" },
                { const: "capture_depth" },
                { const: "captured_artifact" },
                { const: "remediation_task_id_or_pending" },
              ],
              minItems: 4,
              maxItems: 4,
            },
            pending_hh_consumer: nonEmptyString,
          },
        },
        task_index: {
          type: "object",
          additionalProperties: false,
          required: ["inside_a_task", "outside_a_task"],
          properties: { inside_a_task: nonEmptyString, outside_a_task: nonEmptyString },
        },
        review_only: nonEmptyString,
      },
    },
    validation: {
      type: "object",
      additionalProperties: false,
      required: ["plan_before_execute", "by_change_type", "skip_policy", "secret_scan"],
      properties: {
        plan_before_execute: { type: "boolean" },
        check_against_acceptance_criteria: { type: "boolean" },
        never_claim_unrun_checks_passed: { type: "boolean" },
        by_change_type: { type: "object", additionalProperties: arrayOfStrings },
        test_skip_not_allowed_when: arrayOfStrings,
        skip_policy: {
          type: "object",
          additionalProperties: false,
          properties: { allowed_when: arrayOfStrings, must_report: arrayOfStrings },
        },
        secret_scan: {
          type: "object",
          additionalProperties: false,
          required: ["applies_to", "rule", "not_skippable"],
          properties: {
            applies_to: nonEmptyString,
            rule: nonEmptyString,
            commit_only: arrayOfStrings,
            on_detection: arrayOfStrings,
            command_ref: nonEmptyString,
            note: nonEmptyString,
            not_skippable: { type: "boolean" },
          },
        },
      },
    },
  },
};

const GATES_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["schema_version", "search", "convergence_ratchet", "external_value_gate", "human_actions"],
  properties: {
    schema_version: { type: "integer" },
    search: {
      type: "object",
      additionalProperties: false,
      required: ["top_n", "project_scope"],
      properties: {
        top_n: { type: "integer", minimum: 1 },
        project_scope: nonEmptyString,
      },
    },
    convergence_ratchet: {
      type: "object",
      additionalProperties: false,
      required: ["backlog_streak_k", "backlog_burn_m", "always_read_streak_k"],
      properties: {
        backlog_streak_k: { type: "integer", minimum: 1 },
        backlog_burn_m: { type: "integer", minimum: 1 },
        always_read_streak_k: { type: "integer", minimum: 1 },
      },
    },
    external_value_gate: {
      type: "object",
      additionalProperties: false,
      required: ["cycle_interval_n"],
      properties: { cycle_interval_n: { type: "integer", minimum: 1 } },
    },
    human_actions: arrayOfStrings,
  },
};

const ajv = createStrictValidator();
const VALIDATORS = {
  [CORE_LOOP]: compileSchema(ajv, LOOP_SCHEMA),
  [CORE_ROUTING]: compileSchema(ajv, ROUTING_SCHEMA),
  [CORE_GATES]: compileSchema(ajv, GATES_SCHEMA),
};
const SUPPORTED_SCHEMA_VERSIONS = { 1: true };

const cache = new Map(); // absolute path -> { mtimeMs, result }

// Pure text -> validated object (exported for fixtures; no filesystem access).
export function checkCoreDocument(relative, text) {
  if (!VALIDATORS[relative]) return { ok: false, errors: [`${relative}: not a core-model file`] };
  const parsed = parseYamlStrict(text, { source: relative });
  if (!parsed.ok) return parsed;
  const version = dispatchSchemaVersion(SUPPORTED_SCHEMA_VERSIONS, parsed.value?.schema_version, { source: relative });
  if (!version.ok) return version;
  const checked = validateWithSchema(VALIDATORS[relative], parsed.value, { source: relative });
  return checked.ok ? { ok: true, value: parsed.value } : checked;
}

function loadCoreFile(relative) {
  const absolute = path.join(process.cwd(), relative);
  let stat;
  try {
    stat = fs.statSync(absolute);
  } catch {
    return { ok: false, errors: [`${relative}: file is missing — fail-closed`] };
  }
  const cached = cache.get(absolute);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.result;

  const result = checkCoreDocument(relative, fs.readFileSync(absolute, "utf8"));
  cache.set(absolute, { mtimeMs: stat.mtimeMs, result });
  return result;
}

export function loadLoop() { return loadCoreFile(CORE_LOOP); }
export function loadRouting() { return loadCoreFile(CORE_ROUTING); }
export function loadGates() { return loadCoreFile(CORE_GATES); }

// Gate PARAMETER leaves for the dead-config guard: child keys of top-level
// sections whose values are scalars (the legacy regex matched indented
// "  key: scalar" lines; lists and top-level keys were skipped).
export function gateParameterKeys(gates) {
  const keys = [];
  for (const section of Object.values(gates)) {
    if (section === null || typeof section !== "object" || Array.isArray(section)) continue;
    for (const [key, value] of Object.entries(section)) {
      if (value === null || typeof value !== "object") keys.push(key);
    }
  }
  return keys;
}

export function depthModeNames(loop) {
  return Object.keys(loop.depth_modes ?? {});
}
