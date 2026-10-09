// SC-01 (HH-067 / structured-canon-migration-plan): the ONE formal parser + schema
// runtime every structured-canon consumer goes through. Design principles enforced
// here (plan §設計原則 3/7):
//   - YAML is parsed with the `yaml` package Document API — never line regex.
//   - JSON Schema validation is Ajv 2020-12 in strict mode; type coercion and
//     default mutation are DISABLED (a string "1" never becomes the number 1).
//   - fail-closed: parse errors, schema violations, unknown/missing/future
//     schema_version all return ok:false with path-qualified messages; callers
//     must treat that as nonzero, never as "skip".
// Live consumers are wired in SC-02+; until then the test suite is the consumer.

import { parseAllDocuments, visit } from "yaml";
import Ajv2020Module from "ajv/dist/2020.js";

const Ajv2020 = Ajv2020Module.default ?? Ajv2020Module;

// --- YAML parsing (strict, single-document, alias-free) ---

// Returns { ok: true, value } or { ok: false, errors: [string] }.
// Strictness is explicit (plan SC-01): duplicate keys are errors, exactly one
// document is required, and anchors/aliases are rejected outright — the canon
// files never need them and alias expansion is a classic parser-abuse vector.
export function parseYamlStrict(text, { source = "<yaml>" } = {}) {
  const errors = [];
  let docs;
  try {
    docs = parseAllDocuments(String(text ?? ""), {
      schema: "core",
      uniqueKeys: true,
      merge: false,
    });
  } catch (error) {
    return { ok: false, errors: [`${source}: YAML parse threw: ${error.message}`] };
  }
  if (docs.length !== 1) {
    return { ok: false, errors: [`${source}: expected exactly 1 YAML document, got ${docs.length}`] };
  }
  const doc = docs[0];
  for (const issue of [...doc.errors, ...doc.warnings]) {
    const [start] = issue.linePos ?? [];
    const at = start ? `:${start.line}:${start.col}` : "";
    errors.push(`${source}${at}: ${issue.code}: ${issue.message.split("\n")[0]}`);
  }
  visit(doc, {
    Alias(_key, node) {
      errors.push(`${source}: alias '*${node.source}' is not allowed in canon files (fail-closed)`);
    },
  });
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: doc.toJS() };
}

// --- JSON Schema validation (Ajv 2020-12, strict, no coercion/mutation) ---

export function createStrictValidator() {
  return new Ajv2020({
    strict: true,
    allErrors: true,
    coerceTypes: false,     // SC-RT-03: "1" is NOT the number 1
    useDefaults: false,     // validation never mutates the instance
    allowUnionTypes: false,
  });
}

// Compile once, reuse; a schema that itself violates strict mode throws here
// (that is a programming error, not a data error — let it propagate).
export function compileSchema(ajv, schema) {
  return ajv.compile(schema);
}

export function formatSchemaErrors(validateFn, source) {
  return (validateFn.errors ?? []).map((e) => {
    const path = e.instancePath || "/";
    const extra = e.keyword === "additionalProperties" && e.params?.additionalProperty
      ? ` ('${e.params.additionalProperty}')`
      : "";
    return `${source}: ${path}: ${e.message}${extra}`;
  });
}

// Returns { ok: true } or { ok: false, errors: [path-qualified string] }.
export function validateWithSchema(validateFn, data, { source = "<data>" } = {}) {
  if (validateFn(data)) return { ok: true };
  return { ok: false, errors: formatSchemaErrors(validateFn, source) };
}

// --- schema_version dispatch (fail-closed on missing / unknown / future) ---

// handlers: { [integerVersion]: value } — typically compiled validators or
// upgrade functions. Anything not explicitly registered is an error, including
// a syntactically valid FUTURE version (plan §設計原則 7 / 不変条件 2).
export function dispatchSchemaVersion(handlers, version, { source = "<data>" } = {}) {
  if (!Number.isInteger(version)) {
    return { ok: false, errors: [`${source}: schema_version is missing or not an integer (got ${JSON.stringify(version)}) — fail-closed`] };
  }
  if (!Object.prototype.hasOwnProperty.call(handlers, version)) {
    const known = Object.keys(handlers).join(", ") || "(none)";
    return { ok: false, errors: [`${source}: schema_version ${version} is not supported (known: ${known}) — fail-closed`] };
  }
  return { ok: true, handler: handlers[version] };
}

// Convenience: parse YAML text and validate it in one call.
export function parseAndValidateYaml(text, validateFn, { source = "<yaml>" } = {}) {
  const parsed = parseYamlStrict(text, { source });
  if (!parsed.ok) return parsed;
  const checked = validateWithSchema(validateFn, parsed.value, { source });
  if (!checked.ok) return checked;
  return { ok: true, value: parsed.value };
}
