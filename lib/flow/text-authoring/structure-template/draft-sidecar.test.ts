import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryTextAuthoringStorage } from "../storage";
import {
  findStructureTemplateDefinition,
  getBundledStructureTemplateCatalog,
} from "./catalog";
import {
  createStructureDraft,
  reduceStructureDraft,
  serializeStructureDraft,
  StructureDraftMutationError,
} from "./draft";
import {
  createStructureTemplateSidecarRepository,
  STRUCTURE_TEMPLATE_SIDECAR_STORAGE_KEY,
  StructureTemplateSidecarFingerprintError,
  StructureTemplateSidecarReadError,
  StructureTemplateSidecarWriteError,
} from "./sidecar";
import type {
  StructureDraft,
  StructureTemplateDefinition,
} from "./types";

const EMPTY_RAW_FINGERPRINT = "raw-v1:0:0ztntfp";
const T0 = "2026-08-29T12:00:00.000Z";

function definition(templateId: string): StructureTemplateDefinition {
  const found = findStructureTemplateDefinition(
    getBundledStructureTemplateCatalog(),
    templateId,
  );
  assert.ok(found, `missing template ${templateId}`);
  return found;
}

function draftFixture(
  draftId = "draft-sidecar-a",
  templateId = "travel-itinerary-prep-v1",
): StructureDraft {
  return createStructureDraft(definition(templateId), {
    draftId,
    sourceFingerprint: EMPTY_RAW_FINGERPRINT,
    updatedAt: T0,
  });
}

test("seed groups receive deterministic recursive sidecar IDs and empty values", () => {
  const first = draftFixture();
  const second = draftFixture();

  assert.equal(serializeStructureDraft(first), serializeStructureDraft(second));
  assert.deepEqual(
    first.groups.map((group) => ({
      groupId: group.groupId,
      instanceId: group.instanceId,
      values: group.values,
      children: group.children.map((child) => ({
        groupId: child.groupId,
        instanceId: child.instanceId,
        values: child.values,
      })),
    })),
    [
      {
        groupId: "preparation",
        instanceId: first.groups[0].instanceId,
        values: {},
        children: [{
          groupId: "tasks",
          instanceId: first.groups[0].children[0].instanceId,
          values: {},
        }],
      },
      {
        groupId: "itinerary_days",
        instanceId: first.groups[1].instanceId,
        values: {},
        children: [{
          groupId: "schedule_items",
          instanceId: first.groups[1].children[0].instanceId,
          values: {},
        }],
      },
    ],
  );
  assert.equal(new Set([
    ...first.groups.map((group) => group.instanceId),
    ...first.groups.flatMap((group) =>
      group.children.map((child) => child.instanceId),
    ),
  ]).size, 4);
  assert.equal("rawText" in first, false);
});

test("an empty seed stays a sidecar-only empty structure", () => {
  const source = definition("exercise-weekly-repeat-v1");
  const emptyDefinition: StructureTemplateDefinition = {
    ...source,
    instanceDefaults: {
      ...source.instanceDefaults,
      values: {},
      seedGroups: [],
    },
  };
  const draft = createStructureDraft(emptyDefinition, {
    draftId: "draft-empty-seed",
    sourceFingerprint: EMPTY_RAW_FINGERPRINT,
    updatedAt: T0,
  });

  assert.deepEqual(draft.values, {});
  assert.deepEqual(draft.groups, []);
  assert.equal("rawText" in draft, false);
  assert.equal(JSON.stringify(draft).includes("Step"), false);
  assert.equal(JSON.stringify(draft).includes("Item"), false);
});

test("the immutable reducer edits root and recursive groups without changing prior drafts", () => {
  const initial = draftFixture("draft-reducer", "exercise-phased-4w-v1");
  const before = structuredClone(initial);
  const phaseId = initial.groups[0].instanceId;
  const seedSessionId = initial.groups[0].children[0].instanceId;

  const withTitle = reduceStructureDraft(initial, {
    type: "set_value",
    scopeInstanceId: "root",
    slotId: "flow_title",
    value: "4주 러닝",
  }, "2026-08-29T12:01:00.000Z");
  const withPhase = reduceStructureDraft(withTitle, {
    type: "set_value",
    scopeInstanceId: phaseId,
    slotId: "phase_title",
    value: "적응",
  }, "2026-08-29T12:02:00.000Z");
  const added = reduceStructureDraft(withPhase, {
    type: "add_group_instance",
    parentScopeInstanceId: phaseId,
    groupId: "sessions",
    instanceId: "session-added",
    values: { item_title: "가볍게 달리기" },
  }, "2026-08-29T12:03:00.000Z");
  const dismissed = reduceStructureDraft(added, {
    type: "dismiss_slot",
    scopeInstanceId: "session-added",
    slotId: "detail",
  }, "2026-08-29T12:04:00.000Z");
  const restored = reduceStructureDraft(dismissed, {
    type: "restore_slot",
    scopeInstanceId: "session-added",
    slotId: "detail",
  }, "2026-08-29T12:05:00.000Z");
  const removed = reduceStructureDraft(restored, {
    type: "remove_group_instance",
    instanceId: seedSessionId,
  }, "2026-08-29T12:06:00.000Z");

  assert.deepEqual(initial, before, "the input draft must remain untouched");
  assert.equal(withTitle.values.flow_title, "4주 러닝");
  assert.equal(withPhase.groups[0].values.phase_title, "적응");
  assert.deepEqual(
    added.groups[0].children.map((child) => [child.instanceId, child.order]),
    [[seedSessionId, 0], ["session-added", 1]],
  );
  assert.deepEqual(dismissed.dismissedSlots, [{
    scopeInstanceId: "session-added",
    slotId: "detail",
  }]);
  assert.deepEqual(restored.dismissedSlots, []);
  assert.deepEqual(
    removed.groups[0].children.map((child) => [child.instanceId, child.order]),
    [["session-added", 0]],
  );
  assert.equal(removed.revision, 7);
});

test("generated added IDs replay deterministically and duplicate or missing targets fail", () => {
  const initial = draftFixture("draft-deterministic-add");
  const parentId = initial.groups[0].instanceId;
  const action = {
    type: "add_group_instance" as const,
    parentScopeInstanceId: parentId,
    groupId: "tasks",
  };
  const first = reduceStructureDraft(initial, action, "2026-08-29T12:01:00Z");
  const replay = reduceStructureDraft(initial, action, "2026-08-29T12:01:00Z");
  assert.equal(serializeStructureDraft(first), serializeStructureDraft(replay));

  assert.throws(
    () => reduceStructureDraft(first, {
      ...action,
      instanceId: first.groups[0].children.at(-1)?.instanceId,
    }, "2026-08-29T12:02:00Z"),
    (error: unknown) => error instanceof StructureDraftMutationError
      && error.code === "duplicate_instance_id",
  );
  assert.throws(
    () => reduceStructureDraft(initial, {
      type: "set_value",
      scopeInstanceId: "missing-group",
      slotId: "item_title",
      value: "실행되지 않음",
    }, "2026-08-29T12:02:00Z"),
    (error: unknown) => error instanceof StructureDraftMutationError
      && error.code === "missing_instance",
  );
});

test("materialization is explicit and any later draft edit invalidates its receipt", () => {
  const initial = draftFixture("draft-materialization");
  const materialized = reduceStructureDraft(initial, {
    type: "mark_materialized",
    materialization: {
      transactionId: "transaction-1",
      at: "2026-08-29T12:01:00Z",
      sourceRevisionId: "source-revision-2",
      insertedRange: { start: 0, end: 42 },
    },
  }, "2026-08-29T12:01:00Z");
  assert.notEqual(materialized.materialized, false);

  const edited = reduceStructureDraft(materialized, {
    type: "set_value",
    scopeInstanceId: "root",
    slotId: "flow_title",
    value: "다시 수정",
  }, "2026-08-29T12:02:00Z");
  assert.equal(edited.materialized, false);
});

test("an empty raw source restores its exact sidecar draft", () => {
  const storage = createMemoryTextAuthoringStorage();
  const repository = createStructureTemplateSidecarRepository(storage);
  const draft = reduceStructureDraft(draftFixture("draft-empty-raw"), {
    type: "set_value",
    scopeInstanceId: "root",
    slotId: "flow_title",
    value: "빈 원문에서 복구",
  }, "2026-08-29T12:01:00Z");

  repository.save(draft, EMPTY_RAW_FINGERPRINT);
  assert.deepEqual(
    repository.restore(draft.draftId, EMPTY_RAW_FINGERPRINT),
    draft,
  );
  assert.equal(repository.remove(draft.draftId), true);
  assert.equal(
    repository.restore(draft.draftId, EMPTY_RAW_FINGERPRINT),
    undefined,
  );
});

test("a fresh repository finds the latest exact-fingerprint unmaterialized draft without its ID", () => {
  const storage = createMemoryTextAuthoringStorage();
  const writer = createStructureTemplateSidecarRepository(storage);
  const travel = reduceStructureDraft(
    draftFixture("draft-empty-reload-travel", "travel-itinerary-prep-v1"),
    {
      type: "set_value",
      scopeInstanceId: "root",
      slotId: "flow_title",
      value: "여행 준비",
    },
    "2026-08-29T12:01:00Z",
  );
  const moving = reduceStructureDraft(
    draftFixture("draft-empty-reload-moving", "moving-dday-v1"),
    {
      type: "set_value",
      scopeInstanceId: "root",
      slotId: "flow_title",
      value: "이사 준비",
    },
    "2026-08-29T12:02:00Z",
  );
  writer.save(travel, EMPTY_RAW_FINGERPRINT);
  writer.save(moving, EMPTY_RAW_FINGERPRINT);

  const reloaded = createStructureTemplateSidecarRepository(storage);
  assert.deepEqual(
    reloaded.restoreLatestUnmaterialized(EMPTY_RAW_FINGERPRINT),
    moving,
  );
  assert.deepEqual(
    reloaded.restoreLatestUnmaterialized(EMPTY_RAW_FINGERPRINT, {
      templateId: travel.templateId,
      templateVersion: travel.templateVersion,
    }),
    travel,
  );
  assert.equal(
    reloaded.restoreLatestUnmaterialized(EMPTY_RAW_FINGERPRINT, {
      templateId: travel.templateId,
      templateVersion: "0.0.0",
    }),
    undefined,
  );
  assert.equal(
    reloaded.restoreLatestUnmaterialized("raw-v1:1:different"),
    undefined,
    "a different current source fingerprint must not recover stale bytes",
  );
  assert.deepEqual(
    reloaded.restore(travel.draftId, EMPTY_RAW_FINGERPRINT),
    travel,
    "latest lookup must not replace the earlier draft ID",
  );
});

test("latest recovery has a stable tie-break independent of save order", () => {
  const first = reduceStructureDraft(draftFixture("draft-empty-tie-a"), {
    type: "set_value",
    scopeInstanceId: "root",
    slotId: "flow_title",
    value: "동률 A",
  }, "2026-08-29T12:01:00Z");
  const second = reduceStructureDraft(draftFixture("draft-empty-tie-b"), {
    type: "set_value",
    scopeInstanceId: "root",
    slotId: "flow_title",
    value: "동률 B",
  }, "2026-08-29T12:01:00Z");
  const expected = first.draftId < second.draftId ? second : first;

  for (const order of [[first, second], [second, first]]) {
    const storage = createMemoryTextAuthoringStorage();
    const writer = createStructureTemplateSidecarRepository(storage);
    order.forEach((draft) => writer.save(draft, EMPTY_RAW_FINGERPRINT));
    const reloaded = createStructureTemplateSidecarRepository(storage);
    assert.equal(
      reloaded.restoreLatestUnmaterialized(EMPTY_RAW_FINGERPRINT)?.draftId,
      expected.draftId,
    );
  }
});

test("latest recovery compares ISO instants instead of their string spelling", () => {
  const earlier = reduceStructureDraft(draftFixture("draft-empty-instant-a"), {
    type: "set_value",
    scopeInstanceId: "root",
    slotId: "flow_title",
    value: "먼저 저장한 초안",
  }, "2026-08-29T12:00:00Z");
  const later = reduceStructureDraft(draftFixture("draft-empty-instant-b"), {
    type: "set_value",
    scopeInstanceId: "root",
    slotId: "flow_title",
    value: "0.9초 뒤 초안",
  }, "2026-08-29T12:00:00.900Z");
  const storage = createMemoryTextAuthoringStorage();
  const writer = createStructureTemplateSidecarRepository(storage);
  writer.save(later, EMPTY_RAW_FINGERPRINT);
  writer.save(earlier, EMPTY_RAW_FINGERPRINT);

  assert.equal(
    writer.restoreLatestUnmaterialized(EMPTY_RAW_FINGERPRINT)?.draftId,
    later.draftId,
  );
});

test("latest empty-source recovery excludes materialized drafts", () => {
  const storage = createMemoryTextAuthoringStorage();
  const writer = createStructureTemplateSidecarRepository(storage);
  const unmaterialized = reduceStructureDraft(
    draftFixture("draft-empty-unmaterialized"),
    {
      type: "set_value",
      scopeInstanceId: "root",
      slotId: "flow_title",
      value: "아직 원문에 반영하지 않음",
    },
    "2026-08-29T12:01:00Z",
  );
  const materializedInput = reduceStructureDraft(
    draftFixture("draft-empty-materialized"),
    {
      type: "set_value",
      scopeInstanceId: "root",
      slotId: "flow_title",
      value: "이미 원문에 반영함",
    },
    "2026-08-29T12:02:00Z",
  );
  const materialized = reduceStructureDraft(materializedInput, {
    type: "mark_materialized",
    materialization: {
      transactionId: "transaction-empty-materialized",
      at: "2026-08-29T12:03:00Z",
      sourceRevisionId: "source-revision-empty-materialized",
      insertedRange: { start: 0, end: 10 },
    },
  }, "2026-08-29T12:03:00Z");
  writer.save(unmaterialized, EMPTY_RAW_FINGERPRINT);
  writer.save(materialized, EMPTY_RAW_FINGERPRINT);

  const reloaded = createStructureTemplateSidecarRepository(storage);
  assert.deepEqual(
    reloaded.restoreLatestUnmaterialized(EMPTY_RAW_FINGERPRINT),
    unmaterialized,
  );

  const materializedOnlyStorage = createMemoryTextAuthoringStorage();
  const materializedOnly = createStructureTemplateSidecarRepository(
    materializedOnlyStorage,
  );
  materializedOnly.save(materialized, EMPTY_RAW_FINGERPRINT);
  assert.equal(
    createStructureTemplateSidecarRepository(materializedOnlyStorage)
      .restoreLatestUnmaterialized(EMPTY_RAW_FINGERPRINT),
    undefined,
  );
});

test("draft IDs isolate equal empty-source fingerprints", () => {
  const repository = createStructureTemplateSidecarRepository(
    createMemoryTextAuthoringStorage(),
  );
  const first = reduceStructureDraft(draftFixture("draft-collision-a"), {
    type: "set_value",
    scopeInstanceId: "root",
    slotId: "flow_title",
    value: "첫 번째",
  }, "2026-08-29T12:01:00Z");
  const second = reduceStructureDraft(draftFixture("draft-collision-b"), {
    type: "set_value",
    scopeInstanceId: "root",
    slotId: "flow_title",
    value: "두 번째",
  }, "2026-08-29T12:02:00Z");
  repository.save(first, EMPTY_RAW_FINGERPRINT);
  repository.save(second, EMPTY_RAW_FINGERPRINT);

  assert.equal(
    repository.restore(first.draftId, EMPTY_RAW_FINGERPRINT)?.values.flow_title,
    "첫 번째",
  );
  assert.equal(
    repository.restore(second.draftId, EMPTY_RAW_FINGERPRINT)?.values.flow_title,
    "두 번째",
  );
});

test("save and restore fail closed on an exact fingerprint mismatch", () => {
  const storage = createMemoryTextAuthoringStorage();
  const repository = createStructureTemplateSidecarRepository(storage);
  const draft = draftFixture("draft-fingerprint");

  assert.throws(
    () => repository.save(draft, "raw-v1:1:different"),
    StructureTemplateSidecarFingerprintError,
  );
  assert.equal(repository.restore(draft.draftId, EMPTY_RAW_FINGERPRINT), undefined);

  repository.save(draft, EMPTY_RAW_FINGERPRINT);
  assert.throws(
    () => repository.restore(draft.draftId, "raw-v1:1:different"),
    (error: unknown) => error instanceof StructureTemplateSidecarFingerprintError
      && error.existingValuePreserved,
  );
  assert.deepEqual(
    repository.restore(draft.draftId, EMPTY_RAW_FINGERPRINT),
    draft,
  );
});

test("corrupt, schema-mismatched, and failed reads are explicit and preserve bytes", () => {
  for (const [label, raw, expectedCode] of [
    ["corrupt", "{not-json", "corrupted"],
    ["schema", JSON.stringify({ schemaVersion: 99, records: {} }), "schema_mismatch"],
  ] as const) {
    const storage = createMemoryTextAuthoringStorage({
      [STRUCTURE_TEMPLATE_SIDECAR_STORAGE_KEY]: raw,
    });
    const repository = createStructureTemplateSidecarRepository(storage);
    assert.throws(
      () => repository.restore(`draft-${label}`, EMPTY_RAW_FINGERPRINT),
      (error: unknown) => error instanceof StructureTemplateSidecarReadError
        && error.code === expectedCode
        && error.existingValuePreserved,
      label,
    );
    assert.equal(storage.getItem(STRUCTURE_TEMPLATE_SIDECAR_STORAGE_KEY), raw);
  }

  const readFailure = new Error("read denied");
  const repository = createStructureTemplateSidecarRepository({
    getItem() { throw readFailure; },
    setItem() { throw new Error("unreachable"); },
    removeItem() { throw new Error("unreachable"); },
  });
  assert.throws(
    () => repository.restore("draft-read-failure", EMPTY_RAW_FINGERPRINT),
    (error: unknown) => error instanceof StructureTemplateSidecarReadError
      && error.code === "read_failed"
      && error.originalError === readFailure,
  );
});

test("a mutate-then-throw storage failure rolls back the previous sidecar bytes", () => {
  const values = new Map<string, string>();
  let failWrites = false;
  const storage = {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
      if (failWrites) {
        const error = new Error("quota");
        error.name = "QuotaExceededError";
        throw error;
      }
    },
    removeItem(key: string) {
      values.delete(key);
    },
  };
  const repository = createStructureTemplateSidecarRepository(storage);
  const first = draftFixture("draft-write-failure");
  repository.save(first, EMPTY_RAW_FINGERPRINT);
  const previousRaw = values.get(STRUCTURE_TEMPLATE_SIDECAR_STORAGE_KEY);
  assert.ok(previousRaw);

  const next = reduceStructureDraft(first, {
    type: "set_value",
    scopeInstanceId: "root",
    slotId: "flow_title",
    value: "저장되면 안 됨",
  }, "2026-08-29T12:01:00Z");
  failWrites = true;
  assert.throws(
    () => repository.save(next, EMPTY_RAW_FINGERPRINT),
    (error: unknown) => error instanceof StructureTemplateSidecarWriteError
      && error.code === "quota_exceeded"
      && error.previousValuePreserved,
  );
  failWrites = false;

  assert.equal(values.get(STRUCTURE_TEMPLATE_SIDECAR_STORAGE_KEY), previousRaw);
  assert.deepEqual(
    repository.restore(first.draftId, EMPTY_RAW_FINGERPRINT),
    first,
  );
});
