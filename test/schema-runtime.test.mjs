// SC-01 acceptance: the formal parser + schema runtime has positive/negative
// fixtures of its own (SC-RT-01/02/03 initial coverage; live consumers arrive
// in SC-02+). Invalid fixtures must fail with a path-qualified message;
// valid fixtures must parse to identical objects regardless of presentation.
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseYamlStrict,
  createStrictValidator,
  compileSchema,
  validateWithSchema,
  dispatchSchemaVersion,
  parseAndValidateYaml,
} from "../tools/lib/schema-runtime.mjs";

const ajv = createStrictValidator();

test("SC-RT-01: key order, comments, and scalar style do not change the parsed object", () => {
  const a = parseYamlStrict("alpha: 1\nbeta: two\ntext: hello world\n", { source: "a" });
  const b = parseYamlStrict(
    "# comment\nbeta: two   # trailing comment\ntext: >-\n  hello\n  world\nalpha: 1\n",
    { source: "b" },
  );
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.deepEqual(a.value, b.value);
});

test("SC-RT-01: duplicate keys are a fail-closed error with source position", () => {
  const r = parseYamlStrict("key: 1\nkey: 2\n", { source: "dup.yaml" });
  assert.equal(r.ok, false);
  assert.match(r.errors.join("\n"), /^dup\.yaml:\d+:\d+: DUPLICATE_KEY/m);
});

test("SC-RT-01: multi-document and alias inputs are rejected", () => {
  const multi = parseYamlStrict("a: 1\n---\nb: 2\n", { source: "multi.yaml" });
  assert.equal(multi.ok, false);
  assert.match(multi.errors[0], /expected exactly 1 YAML document, got 2/);

  const alias = parseYamlStrict("base: &x 1\ncopy: *x\n", { source: "alias.yaml" });
  assert.equal(alias.ok, false);
  assert.match(alias.errors[0], /alias '\*x' is not allowed/);
});

const SAMPLE_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["schema_version", "name", "count"],
  properties: {
    schema_version: { type: "integer" },
    name: { type: "string" },
    count: { type: "integer" },
  },
};
const validateSample = compileSchema(ajv, SAMPLE_SCHEMA);

test("SC-RT-02: missing / unknown / wrong-type are rejected with instance paths", () => {
  const missing = validateWithSchema(validateSample, { schema_version: 1, name: "x" }, { source: "m" });
  assert.equal(missing.ok, false);
  assert.match(missing.errors[0], /^m: \/: must have required property 'count'/);

  const unknown = validateWithSchema(
    validateSample,
    { schema_version: 1, name: "x", count: 1, extra: true },
    { source: "u" },
  );
  assert.equal(unknown.ok, false);
  assert.match(unknown.errors[0], /^u: \/: must NOT have additional properties \('extra'\)/);

  const wrongType = validateWithSchema(
    validateSample,
    { schema_version: 1, name: 5, count: 1 },
    { source: "w" },
  );
  assert.equal(wrongType.ok, false);
  assert.match(wrongType.errors[0], /^w: \/name: must be string/);
});

test("SC-RT-03: strict data — the string \"1\" is never coerced to the number 1", () => {
  const r = validateWithSchema(
    validateSample,
    { schema_version: 1, name: "x", count: "1" },
    { source: "coerce" },
  );
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /^coerce: \/count: must be integer/);
  // and the YAML side keeps quoted scalars as strings
  const y = parseYamlStrict('count: "1"\n', { source: "y" });
  assert.equal(y.ok, true);
  assert.equal(typeof y.value.count, "string");
});

test("schema_version dispatch fails closed on missing, unknown, and future versions", () => {
  const handlers = { 1: "v1-handler" };
  assert.equal(dispatchSchemaVersion(handlers, 1, { source: "d" }).handler, "v1-handler");
  for (const bad of [undefined, null, "1", 2, 99]) {
    const r = dispatchSchemaVersion(handlers, bad, { source: "d" });
    assert.equal(r.ok, false, `version ${JSON.stringify(bad)} must fail closed`);
    assert.match(r.errors[0], /^d: schema_version .*fail-closed/);
  }
});

test("valid fixture is green end-to-end (parse + validate in one call)", () => {
  const r = parseAndValidateYaml(
    "# canon-like fixture\nschema_version: 1\nname: gates\ncount: 6\n",
    validateSample,
    { source: "fixture.yaml" },
  );
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { schema_version: 1, name: "gates", count: 6 });
});

test("parse failure and schema failure both surface through parseAndValidateYaml", () => {
  const parseFail = parseAndValidateYaml("key: 1\nkey: 2\n", validateSample, { source: "pf" });
  assert.equal(parseFail.ok, false);
  const schemaFail = parseAndValidateYaml("schema_version: 1\nname: x\n", validateSample, { source: "sf" });
  assert.equal(schemaFail.ok, false);
  assert.match(schemaFail.errors[0], /required property 'count'/);
});
