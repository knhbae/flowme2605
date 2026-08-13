import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const CONTRACT_URL = new URL(
  "../../../docs/specs/2026-08-13-flowme-text-authoring-p1-g-linked-lineage/linked-flow-lineage-contract-v1.json",
  import.meta.url,
);
const FIXTURE_URL = new URL(
  "../../../docs/specs/2026-08-13-flowme-text-authoring-p1-g-linked-lineage/fixtures/customs-vehicle-linked-lineage.synthetic.json",
  import.meta.url,
);

type JsonRecord = Record<string, unknown>;

type EvaluationResult = {
  status: "blocked" | "linked" | "omitted" | "return_to_parent";
  relation: JsonRecord | null;
  childFlowIds: string[];
  writes: 0;
  issues: string[];
  parentBranches: string[];
  activeTarget: { flowId: string; itemId: string } | null;
  completionByOwnerId: JsonRecord;
};

const contract = readJson(CONTRACT_URL);
const fixture = readJson(FIXTURE_URL);

test("formal contract and fixture stay spec-only, closed, and rights bounded", () => {
  assert.equal(
    contract.$schema,
    "https://json-schema.org/draft/2020-12/schema",
  );
  assert.equal(contract.type, "object");
  assert.equal(contract.additionalProperties, false);
  assert.equal(fixture.contractVersion, "p1-g-linked-flow-lineage-v1");
  assert.equal(fixture.trackId, "P1-G-LINKED-LINEAGE");
  assert.equal(fixture.scope, "spec_fixture_only");

  const schemaProperties = record(contract.properties, "contract.properties");
  assert.deepEqual(
    Object.keys(fixture).sort(),
    Object.keys(schemaProperties).sort(),
    "the fixture package must not add undeclared runtime fields",
  );
  const casesSchema = record(schemaProperties.cases, "properties.cases");
  assert.equal(casesSchema.minItems, 6);
  assert.equal(casesSchema.maxItems, 6);
  assert.ok(
    strings(contract["x-flowme-invariants"], "x-flowme-invariants").length >= 8,
  );

  const evidence = record(fixture.evidenceTrace, "evidenceTrace");
  const rights = record(fixture.rightsBoundary, "rightsBoundary");
  assert.equal(evidence.provider, "관세청");
  assert.match(
    requiredString(evidence, "url", "evidenceTrace"),
    /^https:\/\/www\.customs\.go\.kr\//u,
  );
  assert.equal(evidence.rightsStatus, "UNKNOWN_LINK_ONLY");
  assert.equal(evidence.rawBodyIncluded, false);
  assert.equal(evidence.executionRecheckRequired, true);
  assert.deepEqual(evidence.evidenceIds, ["S15", "M5"]);
  assert.equal(rights.rawMaterialMode, "synthetic_paraphrase");
  assert.equal(rights.privateValuesIncluded, false);
  assert.equal(rights.legalOutcomeInvented, false);
  assert.equal(rights.taxAmountInvented, false);
  assert.equal(rights.externalWrites, 0);
  assert.equal(JSON.stringify(fixture).includes("assigneeId"), false);
  assert.equal(JSON.stringify(fixture).includes("sharedCompletion"), false);
  assert.equal(JSON.stringify(fixture).includes("dependencies"), false);
});

test("all synthetic locators resolve to exact UTF-8 bytes and SHA-256", () => {
  const source = record(fixture.syntheticSource, "syntheticSource");
  const rawText = requiredString(source, "rawText", "syntheticSource");
  const rawBytes = Buffer.from(rawText, "utf8");
  const rows = records(source.rows, "syntheticSource.rows");

  assert.equal(source.encoding, "UTF-8");
  assert.equal(source.lineEnding, "LF");
  assert.equal(source.finalNewline, true);
  assert.equal(
    source.contentSha256,
    sha256(rawBytes),
    "whole-source hash must cover the exact synthetic bytes",
  );
  assert.equal(rows.length, 8);

  let expectedStart = 0;
  rows.forEach((row, index) => {
    const start = requiredInteger(row, "startOffset", `rows[${index}]`);
    const end = requiredInteger(row, "endOffsetExclusive", `rows[${index}]`);
    const text = requiredString(row, "text", `rows[${index}]`);
    const rowBytes = rawBytes.subarray(start, end);

    assert.equal(start, expectedStart);
    assert.ok(end > start);
    assert.deepEqual(rowBytes, Buffer.from(text, "utf8"));
    assert.equal(row.sha256, sha256(rowBytes));
    assert.equal(row.line, index + 1);
    assert.equal(rawBytes[end], 0x0a, "every fixture row ends with LF");
    expectedStart = end + 1;
  });
  assert.equal(expectedStart, rawBytes.length);
});

test("the exact six rights-safe scenarios evaluate deterministically", () => {
  const expectedCaseIds = [
    "p1g-s15-no-vehicle",
    "p1g-s15-with-vehicle",
    "p1g-s15-parent-done-child-pending",
    "p1g-s15-child-done-parent-pending",
    "p1g-s15-inspection-tax-branch",
    "p1g-s15-return-contract",
  ];
  const cases = records(fixture.cases, "cases");
  assert.deepEqual(
    cases.map((entry) => entry.caseId),
    expectedCaseIds,
  );
  assert.equal(new Set(expectedCaseIds).size, 6);

  for (const caseEntry of cases) {
    const first = evaluateCase(fixture, caseEntry);
    const second = evaluateCase(fixture, structuredClone(caseEntry));
    const expected = record(caseEntry.expected, `${caseEntry.caseId}.expected`);

    assert.deepEqual(second, first, `${caseEntry.caseId} must replay exactly`);
    assert.equal(first.status, expected.status);
    assert.equal(
      first.relation === null ? 0 : 1,
      expected.emittedRelationCount,
    );
    assert.equal(first.childFlowIds.length, expected.childFlowCount);
    assert.equal(first.writes, expected.runtimeWrites);
    assert.deepEqual(first.parentBranches, expected.parentBranches);
    assert.deepEqual(first.activeTarget, expected.activeTarget);
    assert.deepEqual(first.completionByOwnerId, caseEntry.completionByOwnerId);
  }
});

test("vehicle false emits child zero and vehicle true emits exactly one stable child", () => {
  const noVehicle = evaluateCase(fixture, caseById("p1g-s15-no-vehicle"));
  assert.equal(noVehicle.status, "omitted");
  assert.equal(noVehicle.relation, null);
  assert.deepEqual(noVehicle.childFlowIds, []);

  const withVehicle = evaluateCase(fixture, caseById("p1g-s15-with-vehicle"));
  assert.equal(withVehicle.status, "linked");
  assert.deepEqual(withVehicle.childFlowIds, ["flow:p1g:vehicle-child"]);
  assert.equal(withVehicle.relation?.relationId, fixtureRelation().relationId);
  assert.deepEqual(withVehicle.activeTarget, {
    flowId: "flow:p1g:vehicle-child",
    itemId: "item:p1g:vehicle-entry",
  });
});

test("parent and child identities share lineage but retain independent versions and owners", () => {
  const relation = fixtureRelation();
  const parent = record(relation.parent, "relation.parent");
  const child = record(relation.child, "relation.child");
  const lineage = record(relation.sourceLineage, "relation.sourceLineage");
  const source = record(fixture.syntheticSource, "syntheticSource");

  assert.notEqual(parent.flowId, child.flowId);
  assert.notEqual(parent.versionId, child.versionId);
  assert.notEqual(parent.completionOwnerId, child.completionOwnerId);
  assert.equal(relation.rootFlowId, parent.flowId);
  assert.equal(lineage.sourceId, source.sourceId);
  assert.equal(lineage.snapshotId, source.snapshotId);
  assert.equal(lineage.sourceVersion, source.sourceVersion);

  const rowSets = [
    strings(lineage.commonSourceRowIds, "commonSourceRowIds"),
    strings(lineage.conditionSourceRowIds, "conditionSourceRowIds"),
    strings(lineage.childSourceRowIds, "childSourceRowIds"),
  ];
  const combined = rowSets.flat();
  assert.equal(new Set(combined).size, combined.length);
  const sourceRowIds = new Set(
    records(source.rows, "source.rows").map((row) => row.rowId),
  );
  combined.forEach((rowId) => assert.ok(sourceRowIds.has(rowId)));

  assert.deepEqual(validateRelation(fixture, relation), []);
});

test("completion transitions are owner-scoped and never bulk-propagate", () => {
  const parentDone = caseById("p1g-s15-parent-done-child-pending");
  const childDone = caseById("p1g-s15-child-done-parent-pending");
  assert.deepEqual(parentDone.completionByOwnerId, {
    "owner:p1g:customs-common": "completed",
    "owner:p1g:vehicle-child": "pending",
  });
  assert.deepEqual(childDone.completionByOwnerId, {
    "owner:p1g:customs-common": "pending",
    "owner:p1g:vehicle-child": "completed",
  });

  const starting = structuredClone(
    record(parentDone.completionByOwnerId, "completionByOwnerId"),
  );
  const denied = transitionCompletion(
    fixture,
    starting,
    "owner:p1g:customs-common",
    "owner:p1g:vehicle-child",
    "completed",
  );
  assert.equal(denied.status, "blocked");
  assert.equal(denied.writes, 0);
  assert.deepEqual(denied.completionByOwnerId, starting);
  assert.deepEqual(denied.issues, ["OWNER_SCOPE_MISMATCH"]);

  const allowed = transitionCompletion(
    fixture,
    starting,
    "owner:p1g:vehicle-child",
    "owner:p1g:vehicle-child",
    "completed",
  );
  assert.equal(allowed.status, "applied");
  assert.equal(
    allowed.completionByOwnerId["owner:p1g:customs-common"],
    "completed",
  );
  assert.equal(
    allowed.completionByOwnerId["owner:p1g:vehicle-child"],
    "completed",
  );
});

test("inspection and taxation remain same-parent branches and never emit a child", () => {
  const branchCase = evaluateCase(
    fixture,
    caseById("p1g-s15-inspection-tax-branch"),
  );
  assert.equal(branchCase.status, "omitted");
  assert.deepEqual(branchCase.childFlowIds, []);
  assert.deepEqual(branchCase.parentBranches, ["inspection", "taxation"]);
});

test("child completion or exit resolves to the exact parent return pointer", () => {
  for (const caseId of [
    "p1g-s15-child-done-parent-pending",
    "p1g-s15-return-contract",
  ]) {
    const result = evaluateCase(fixture, caseById(caseId));
    assert.equal(result.status, "return_to_parent");
    assert.deepEqual(result.activeTarget, {
      flowId: "flow:p1g:customs-common",
      itemId: "item:p1g:common-next",
    });
  }
});

test("missing, unknown, or non-boolean conditions fail closed with zero writes", () => {
  const sourceCase = caseById("p1g-s15-with-vehicle");
  const mutations: Array<[string, (input: JsonRecord) => void]> = [
    ["missing", (input) => delete input.vehicleIncluded],
    ["wrong type", (input) => (input.vehicleIncluded = "true")],
    [
      "unknown field",
      (input) => {
        delete input.vehicleIncluded;
        input.vehiclePresent = true;
      },
    ],
  ];

  for (const [label, mutate] of mutations) {
    const candidate = structuredClone(sourceCase);
    mutate(record(candidate.input, `${label}.input`));
    const result = evaluateCase(fixture, candidate);
    assert.equal(result.status, "blocked", label);
    assert.equal(result.relation, null, label);
    assert.deepEqual(result.childFlowIds, [], label);
    assert.equal(result.writes, 0, label);
    assert.ok(result.issues.length > 0, label);
  }
});

test("invalid lineage, graph, pointer, permission, and collaboration shapes fail closed", () => {
  const invalidRelations: Array<[string, (draft: JsonRecord) => void]> = [
    ["missing predicate", (draft) => delete draft.predicate],
    [
      "self link",
      (draft) => {
        const child = record(draft.child, "child");
        child.flowId = record(draft.parent, "parent").flowId;
      },
    ],
    [
      "source mismatch",
      (draft) => {
        record(draft.sourceLineage, "sourceLineage").snapshotId =
          "snapshot:wrong:v1";
      },
    ],
    [
      "source version mismatch",
      (draft) => {
        record(draft.sourceLineage, "sourceLineage").sourceVersion =
          "synthetic-v2";
      },
    ],
    [
      "endpoint version mismatch",
      (draft) => {
        record(draft.child, "child").versionId =
          "flow-version:p1g:vehicle-child:v2";
      },
    ],
    [
      "reused owner",
      (draft) => {
        record(draft.child, "child").completionOwnerId = record(
          draft.parent,
          "parent",
        ).completionOwnerId;
      },
    ],
    [
      "unresolved return pointer",
      (draft) => {
        const navigation = record(draft.navigation, "navigation");
        const returnTo = record(navigation.returnTo, "returnTo");
        record(returnTo.target, "returnTo.target").itemId = "item:missing";
      },
    ],
    [
      "second child",
      (draft) => {
        record(draft.bounds, "bounds").maxChildren = 2;
      },
    ],
    [
      "cycle enabled",
      (draft) => {
        record(draft.bounds, "bounds").acyclic = false;
      },
    ],
    ["generic dependency", (draft) => (draft.dependencies = ["anything"])],
    ["assignee", (draft) => (draft.assigneeId = "actor:any")],
    ["shared completion", (draft) => (draft.sharedCompletion = true)],
  ];

  for (const [label, mutate] of invalidRelations) {
    const draft = structuredClone(fixtureRelation());
    mutate(draft);
    const issues = validateRelation(fixture, draft);
    assert.ok(issues.length > 0, label);
    assert.deepEqual(blockedResult(issues), {
      status: "blocked",
      relation: null,
      childFlowIds: [],
      writes: 0,
      issues,
    });
  }

  const duplicated = [fixtureRelation(), structuredClone(fixtureRelation())];
  assert.equal(new Set(duplicated.map((entry) => entry.relationId)).size, 1);
  assert.deepEqual(blockedResult(["DUPLICATE_RELATION"]), {
    status: "blocked",
    relation: null,
    childFlowIds: [],
    writes: 0,
    issues: ["DUPLICATE_RELATION"],
  });

  const locatorMutations: Array<
    [string, (candidatePackage: JsonRecord) => void]
  > = [
    [
      "row hash mismatch",
      (candidatePackage) => {
        const source = record(
          candidatePackage.syntheticSource,
          "syntheticSource",
        );
        records(source.rows, "source.rows")[0].sha256 = "0".repeat(64);
      },
    ],
    [
      "row offset mismatch",
      (candidatePackage) => {
        const source = record(
          candidatePackage.syntheticSource,
          "syntheticSource",
        );
        records(source.rows, "source.rows")[0].endOffsetExclusive = 1;
      },
    ],
    [
      "whole source hash mismatch",
      (candidatePackage) => {
        record(
          candidatePackage.syntheticSource,
          "syntheticSource",
        ).contentSha256 = "F".repeat(64);
      },
    ],
  ];
  for (const [label, mutate] of locatorMutations) {
    const candidatePackage = structuredClone(fixture);
    mutate(candidatePackage);
    const issues = validateRelation(
      candidatePackage,
      record(candidatePackage.relationTemplate, "relationTemplate"),
    );
    assert.ok(
      issues.some((issue) => issue.includes("LOCATOR")),
      label,
    );
    assert.equal(blockedResult(issues).writes, 0, label);
    assert.equal(blockedResult(issues).relation, null, label);
  }
});

function readJson(url: URL): JsonRecord {
  const parsed: unknown = JSON.parse(readFileSync(url, "utf8"));
  return record(parsed, url.pathname);
}

function record(value: unknown, label: string): JsonRecord {
  assert.ok(
    typeof value === "object" && value !== null && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value as JsonRecord;
}

function records(value: unknown, label: string): JsonRecord[] {
  assert.ok(Array.isArray(value), `${label} must be an array`);
  value.forEach((entry, index) => record(entry, `${label}[${index}]`));
  return value as JsonRecord[];
}

function strings(value: unknown, label: string): string[] {
  assert.ok(Array.isArray(value), `${label} must be an array`);
  value.forEach((entry, index) =>
    assert.equal(typeof entry, "string", `${label}[${index}]`),
  );
  return value as string[];
}

function requiredString(
  source: JsonRecord,
  key: string,
  label: string,
): string {
  const value = source[key];
  assert.equal(typeof value, "string", `${label}.${key} must be a string`);
  assert.notEqual(value, "", `${label}.${key} must not be empty`);
  return value as string;
}

function requiredInteger(
  source: JsonRecord,
  key: string,
  label: string,
): number {
  const value = source[key];
  assert.equal(
    Number.isInteger(value),
    true,
    `${label}.${key} must be an integer`,
  );
  return value as number;
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

function fixtureRelation(): JsonRecord {
  return record(fixture.relationTemplate, "relationTemplate");
}

function caseById(caseId: string): JsonRecord {
  const found = records(fixture.cases, "cases").find(
    (entry) => entry.caseId === caseId,
  );
  assert.ok(found, `missing case ${caseId}`);
  return found;
}

function evaluateCase(
  packageValue: JsonRecord,
  caseEntry: JsonRecord,
): EvaluationResult {
  const input = record(caseEntry.input, `${caseEntry.caseId}.input`);
  const completion = structuredClone(
    record(
      caseEntry.completionByOwnerId,
      `${caseEntry.caseId}.completionByOwnerId`,
    ),
  );
  const relation = record(packageValue.relationTemplate, "relationTemplate");
  const relationIssues = validateRelation(packageValue, relation);
  if (relationIssues.length > 0) {
    return {
      status: "blocked",
      relation: null,
      childFlowIds: [],
      writes: 0,
      issues: relationIssues,
      parentBranches: [],
      activeTarget: null,
      completionByOwnerId: completion,
    };
  }

  if (!("vehicleIncluded" in input)) {
    return evaluationBlocked("MISSING_CONDITION", completion);
  }
  if (typeof input.vehicleIncluded !== "boolean") {
    return evaluationBlocked("UNSUPPORTED_CONDITION_VALUE", completion);
  }

  const parentBranches = [
    input.inspectionRequired === true ? "inspection" : null,
    input.taxationRequired === true ? "taxation" : null,
  ].filter((value): value is string => value !== null);
  if (!input.vehicleIncluded) {
    return {
      status: "omitted",
      relation: null,
      childFlowIds: [],
      writes: 0,
      issues: [],
      parentBranches,
      activeTarget: null,
      completionByOwnerId: completion,
    };
  }

  const navigation = record(relation.navigation, "navigation");
  const interaction = caseEntry.interaction;
  const childOwnerId = requiredString(
    record(relation.child, "child"),
    "completionOwnerId",
    "child",
  );
  const returning =
    interaction === "exit_child" || completion[childOwnerId] === "completed";
  const navigationEntry = record(
    returning ? navigation.returnTo : navigation.nextAction,
    returning ? "returnTo" : "nextAction",
  );
  const target = record(navigationEntry.target, "navigation.target");

  return {
    status: returning ? "return_to_parent" : "linked",
    relation: structuredClone(relation),
    childFlowIds: [
      requiredString(record(relation.child, "child"), "flowId", "child"),
    ],
    writes: 0,
    issues: [],
    parentBranches,
    activeTarget: {
      flowId: requiredString(target, "flowId", "target"),
      itemId: requiredString(target, "itemId", "target"),
    },
    completionByOwnerId: completion,
  };
}

function evaluationBlocked(
  issue: string,
  completionByOwnerId: JsonRecord,
): EvaluationResult {
  return {
    status: "blocked",
    relation: null,
    childFlowIds: [],
    writes: 0,
    issues: [issue],
    parentBranches: [],
    activeTarget: null,
    completionByOwnerId,
  };
}

function validateRelation(
  packageValue: JsonRecord,
  relation: JsonRecord,
): string[] {
  const issues: string[] = [...validateSourceLocators(packageValue)];
  const forbidden = ["dependencies", "assigneeId", "sharedCompletion"];
  if (forbidden.some((key) => key in relation)) issues.push("FORBIDDEN_FIELD");
  if (!isRecord(relation.predicate)) issues.push("MISSING_PREDICATE");
  if (!isRecord(relation.parent) || !isRecord(relation.child)) {
    issues.push("MISSING_ENDPOINT");
    return issues;
  }

  const parent = relation.parent;
  const child = relation.child;
  if (parent.flowId === child.flowId) issues.push("SELF_LINK");
  if (parent.completionOwnerId === child.completionOwnerId)
    issues.push("REUSED_OWNER");
  if (relation.rootFlowId !== parent.flowId) issues.push("ROOT_MISMATCH");

  const source = record(packageValue.syntheticSource, "syntheticSource");
  if (!isRecord(relation.sourceLineage)) {
    issues.push("MISSING_SOURCE_LINEAGE");
  } else {
    if (relation.sourceLineage.sourceId !== source.sourceId)
      issues.push("SOURCE_MISMATCH");
    if (relation.sourceLineage.snapshotId !== source.snapshotId)
      issues.push("SNAPSHOT_MISMATCH");
    if (relation.sourceLineage.sourceVersion !== source.sourceVersion)
      issues.push("SOURCE_VERSION_MISMATCH");
  }

  if (!isRecord(relation.bounds)) {
    issues.push("MISSING_BOUNDS");
  } else {
    if (relation.bounds.maxChildren !== 1 || relation.bounds.maxDepth !== 1)
      issues.push("GRAPH_BOUND_EXCEEDED");
    if (relation.bounds.acyclic !== true) issues.push("CYCLE_ALLOWED");
    if (relation.bounds.genericDependencyGraph !== false)
      issues.push("DEPENDENCY_GRAPH_ALLOWED");
  }

  const catalog = record(packageValue.catalog, "catalog");
  const flows = records(catalog.flows, "catalog.flows");
  const items = records(catalog.items, "catalog.items");
  const owners = records(catalog.completionOwners, "catalog.completionOwners");
  for (const endpoint of [parent, child]) {
    const flow = flows.find((entry) => entry.flowId === endpoint.flowId);
    if (!flow || flow.versionId !== endpoint.versionId)
      issues.push("UNRESOLVED_FLOW_POINTER");
    const owner = owners.find(
      (entry) => entry.ownerId === endpoint.completionOwnerId,
    );
    if (!owner || owner.flowId !== endpoint.flowId)
      issues.push("UNRESOLVED_OWNER_POINTER");
    const item = items.find((entry) => entry.itemId === endpoint.itemId);
    if (!item || item.flowId !== endpoint.flowId)
      issues.push("UNRESOLVED_ITEM_POINTER");
  }

  if (!isRecord(relation.navigation)) {
    issues.push("MISSING_NAVIGATION");
  } else {
    for (const key of ["nextAction", "returnTo"] as const) {
      const entry = relation.navigation[key];
      if (!isRecord(entry) || !isRecord(entry.target)) {
        issues.push("UNRESOLVED_NAVIGATION_POINTER");
        continue;
      }
      const item = items.find(
        (candidate) => candidate.itemId === entry.target.itemId,
      );
      if (!item || item.flowId !== entry.target.flowId)
        issues.push("UNRESOLVED_NAVIGATION_POINTER");
    }
  }

  return [...new Set(issues)];
}

function validateSourceLocators(packageValue: JsonRecord): string[] {
  const issues: string[] = [];
  const source = record(packageValue.syntheticSource, "syntheticSource");
  if (typeof source.rawText !== "string" || !Array.isArray(source.rows)) {
    return ["INVALID_SOURCE_LOCATOR_PACKAGE"];
  }
  const rawBytes = Buffer.from(source.rawText, "utf8");
  if (source.contentSha256 !== sha256(rawBytes)) {
    issues.push("SOURCE_LOCATOR_HASH_MISMATCH");
  }

  let expectedStart = 0;
  records(source.rows, "source.rows").forEach((row, index) => {
    const start = row.startOffset;
    const end = row.endOffsetExclusive;
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      (start as number) !== expectedStart ||
      (end as number) <= (start as number) ||
      (end as number) > rawBytes.length ||
      typeof row.text !== "string"
    ) {
      issues.push("SOURCE_LOCATOR_RANGE_MISMATCH");
      return;
    }
    const rowBytes = rawBytes.subarray(start as number, end as number);
    if (!rowBytes.equals(Buffer.from(row.text, "utf8"))) {
      issues.push("SOURCE_LOCATOR_TEXT_MISMATCH");
    }
    if (row.sha256 !== sha256(rowBytes)) {
      issues.push("SOURCE_LOCATOR_ROW_HASH_MISMATCH");
    }
    if (row.line !== index + 1) {
      issues.push("SOURCE_LOCATOR_LINE_MISMATCH");
    }
    expectedStart = (end as number) + 1;
  });
  if (expectedStart !== rawBytes.length) {
    issues.push("SOURCE_LOCATOR_FINAL_RANGE_MISMATCH");
  }
  return [...new Set(issues)];
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function blockedResult(issues: string[]): {
  status: "blocked";
  relation: null;
  childFlowIds: [];
  writes: 0;
  issues: string[];
} {
  return {
    status: "blocked",
    relation: null,
    childFlowIds: [],
    writes: 0,
    issues,
  };
}

function transitionCompletion(
  packageValue: JsonRecord,
  completionByOwnerId: JsonRecord,
  actorOwnerId: string,
  targetOwnerId: string,
  state: "pending" | "completed",
): {
  status: "applied" | "blocked";
  writes: 0 | 1;
  issues: string[];
  completionByOwnerId: JsonRecord;
} {
  const owners = records(
    record(packageValue.catalog, "catalog").completionOwners,
    "completionOwners",
  );
  const knownTarget = owners.some((entry) => entry.ownerId === targetOwnerId);
  if (!knownTarget || actorOwnerId !== targetOwnerId) {
    return {
      status: "blocked",
      writes: 0,
      issues: ["OWNER_SCOPE_MISMATCH"],
      completionByOwnerId: structuredClone(completionByOwnerId),
    };
  }
  return {
    status: "applied",
    writes: 1,
    issues: [],
    completionByOwnerId: {
      ...structuredClone(completionByOwnerId),
      [targetOwnerId]: state,
    },
  };
}
