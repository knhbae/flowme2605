const fs = require("node:fs");
const path = require("node:path");

const base = __dirname;
const defaultAjvRoot = path.join(
  process.env.TEMP || process.env.TMP || "",
  "flowme-ajv-schema-check",
  "node_modules",
  "ajv",
);
const ajvRoot = process.env.FLOWME_AJV_ROOT || defaultAjvRoot;

if (!fs.existsSync(path.join(ajvRoot, "package.json"))) {
  console.error(
    [
      "Ajv 8 is required for strict Draft 2020-12 validation.",
      "Install it outside the project dependency graph, then retry:",
      "npm.cmd install --prefix $env:TEMP\\flowme-ajv-schema-check --no-save --no-audit --no-fund ajv@8.17.1",
      "Or set FLOWME_AJV_ROOT to an Ajv package directory.",
    ].join("\n"),
  );
  process.exit(2);
}

const Ajv2020 = require(path.join(ajvRoot, "dist", "2020")).default;
const ajvPackage = JSON.parse(fs.readFileSync(path.join(ajvRoot, "package.json"), "utf8"));
const read = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(base, relativePath), "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

const schemas = {
  current: read("current-canonical-v1.schema.json"),
  shared: read("item-shared-context-v1.schema.json"),
  literal: read("literal-ics-graph-v1.schema.json"),
};

const ajv = new Ajv2020({ allErrors: true, strict: true });
const compiled = [];
for (const schema of Object.values(schemas)) {
  ajv.addSchema(schema);
  compiled.push(schema.$id);
}

const suites = [
  {
    key: "current",
    schemaId: schemas.current.$id,
    runPath: "runs/current-canonical/results-v1.json",
  },
  {
    key: "shared",
    schemaId: schemas.shared.$id,
    runPath: "runs/item-shared-context/results-v1.json",
  },
  {
    key: "literal",
    schemaId: schemas.literal.$id,
    runPath: "runs/literal-ics-first/results-v1.json",
  },
];

const positive = [];
for (const suite of suites) {
  const validate = ajv.getSchema(suite.schemaId);
  const records = read(suite.runPath).records;
  let passed = 0;
  const failures = [];
  for (const record of records) {
    if (validate(record)) {
      passed += 1;
    } else {
      failures.push({ bundleId: record.bundleId, errors: clone(validate.errors || []) });
    }
  }
  positive.push({
    architecture: suite.key,
    runPath: suite.runPath,
    passed,
    total: records.length,
    failures,
  });
}

const currentRecord = read(suites[0].runPath).records[0];
const currentUnscheduledRecord = read(suites[0].runPath).records.find((record) =>
  record.flows.some((flow) =>
    flow.steps.some((step) =>
      step.items.some((item) => item.schedule === null),
    ),
  ),
);
const sharedRecord = read(suites[1].runPath).records[0];
const literalRecord = read(suites[2].runPath).records[0];

const negativeCases = [
  {
    id: "reject_primary_artifact_hybrid",
    schemaId: schemas.current.$id,
    mutate(record) {
      record.taxonomy.primaryArtifact = "hybrid";
    },
    source: currentRecord,
  },
  {
    id: "reject_missing_item_provenance",
    schemaId: schemas.current.$id,
    mutate(record) {
      delete record.flows[0].steps[0].items[0].sourceRefs;
    },
    source: currentRecord,
  },
  {
    id: "reject_calendar_projection_without_schedule",
    schemaId: schemas.current.$id,
    mutate(record) {
      const item = record.flows
        .flatMap((flow) => flow.steps)
        .flatMap((step) => step.items)
        .find((candidate) => candidate.schedule === null);
      item.projectionPolicy.calendar = "per_item";
    },
    source: currentUnscheduledRecord,
  },
  {
    id: "reject_invalid_effective_schedule",
    schemaId: schemas.shared.$id,
    mutate(record) {
      record.flows[0].steps[0].items[0].scheduleBinding.effectiveSchedule.kind = "floating";
    },
    source: sharedRecord,
  },
  {
    id: "reject_scheduleless_vevent",
    schemaId: schemas.literal.$id,
    mutate(record) {
      const component = record.calendar.components.find((candidate) => candidate.kind === "VEVENT");
      delete component.dtstart;
    },
    source: literalRecord,
  },
  {
    id: "reject_nested_ics_component",
    schemaId: schemas.literal.$id,
    mutate(record) {
      record.calendar.components[0].children = [];
    },
    source: literalRecord,
  },
];

const negative = negativeCases.map((testCase) => {
  const record = clone(testCase.source);
  testCase.mutate(record);
  const validate = ajv.getSchema(testCase.schemaId);
  const accepted = validate(record);
  return {
    id: testCase.id,
    passed: accepted === false,
    accepted,
    errors: clone(validate.errors || []),
  };
});

const positivePassed = positive.reduce((sum, suite) => sum + suite.passed, 0);
const positiveTotal = positive.reduce((sum, suite) => sum + suite.total, 0);
const negativePassed = negative.filter((testCase) => testCase.passed).length;
const passed =
  compiled.length === 3 &&
  positivePassed === positiveTotal &&
  negativePassed === negative.length;

const result = {
  schemaVersion: "flowme-item-map-schema-validation-results-v1",
  generatedAt: new Date().toISOString(),
  validator: {
    name: "ajv",
    version: ajvPackage.version,
    draft: "2020-12",
    strict: true,
  },
  compile: {
    passed: compiled.length,
    total: 3,
    schemaIds: compiled,
  },
  positive: {
    passed: positivePassed,
    total: positiveTotal,
    suites: positive,
  },
  negative: {
    passed: negativePassed,
    total: negative.length,
    cases: negative,
  },
  passed,
};

const output = path.join(base, "schema-validation-results-v1.json");
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(
  [
    `COMPILE ${result.compile.passed}/${result.compile.total}`,
    ...positive.map((suite) => `${suite.runPath}: ${suite.passed}/${suite.total}`),
    `POSITIVE ${positivePassed}/${positiveTotal}`,
    `NEGATIVE ${negativePassed}/${negative.length}`,
    `OUTPUT ${output}`,
  ].join("\n"),
);
if (!passed) process.exitCode = 1;
