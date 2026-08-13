import assert from "node:assert/strict";
import test from "node:test";

import {
  beginTextAuthoringExplicitSave,
  beginTextAuthoringWorkingSourceEdit,
  canExplicitlySaveTextAuthoring,
  canMarkTextAuthoringReady,
  completeTextAuthoringCalculation,
  createTextAuthoringExplicitSaveReceipt,
  createTextAuthoringRecoverySnapshot,
  createTextAuthoringServiceState,
  createTextAuthoringServiceStateFromDocument,
  getTextAuthoringRevisionPair,
  isTextAuthoringServiceStateCoherent,
  markTextAuthoringExplicitSaveFailed,
  markTextAuthoringExplicitSaveSucceeded,
  markTextAuthoringReady,
  markTextAuthoringRecoveryStored,
  hydrateTextAuthoringServiceStateFromRecord,
} from "./service-state";
import { applyAuthoringOperation } from "./operations";
import { createTextAuthoringDocument } from "./parser";
import {
  createMemoryTextAuthoringStorage,
  createTextAuthoringDraftRepository,
} from "./storage";

const NOW = "2026-08-11T00:00:00.000Z";
const RAW = [
  "# 출국 준비",
  "- [ ] 여권 확인",
  "  - 설명: 만료일을 확인합니다.",
  "  - 날짜: 2026-08-20",
].join("\n");

function saveCurrent(
  state: ReturnType<typeof createTextAuthoringServiceState>,
) {
  const saving = beginTextAuthoringExplicitSave(
    state,
    "2026-08-11T00:02:00.000Z",
  );
  const receipt = createTextAuthoringExplicitSaveReceipt(
    saving,
    "2026-08-11T00:03:00.000Z",
    "save-receipt-1",
  );
  return markTextAuthoringExplicitSaveSucceeded(saving, receipt);
}

test("P0-00 keeps SourceSnapshot, WorkingSource, CanonicalDraft, and Projection under separate owners", () => {
  const state = createTextAuthoringServiceState(RAW, {
    draftId: "draft-1",
    documentId: "document-1",
    ownership: "creator",
    now: NOW,
  });

  assert.equal(state.sourceSnapshot.owner, "source_provenance");
  assert.equal(state.workingSource.owner, "creator_draft");
  assert.equal(state.canonicalDraft.owner, "deterministic_parser");
  assert.equal(state.projection.owner, "projection_engine");
  assert.equal(state.sourceSnapshot.rawText, RAW);
  assert.equal(state.workingSource.rawText, RAW);
  assert.equal(isTextAuthoringServiceStateCoherent(state), true);
  assert.deepEqual(getTextAuthoringRevisionPair(state), {
    workingSourceRevisionId: state.workingSource.revisionId,
    canonicalRevisionId: state.canonicalDraft.revisionId,
    parserResultRevisionId:
      state.canonicalDraft.document.parseResult.parseResultId,
    projectionRevisionId: state.projection.revisionId,
  });
});

test("P0-01 creates a coherent service state from the supplied current document without reparsing away revisions or decisions", () => {
  const initialDocument = createTextAuthoringDocument(RAW, {
    documentId: "document-1",
    ownership: "creator",
    now: NOW,
  });
  const issueSource = createTextAuthoringDocument("분류할 원문 문장", {
    documentId: "document-issue",
    ownership: "creator",
    now: NOW,
  });
  const issueId = issueSource.parseResult.issues[0]?.issueId;
  assert.ok(issueId);
  const decided = applyAuthoringOperation(
    issueSource,
    {
      type: "classify_issue",
      issueId,
      outcome: "keep_source_only",
    },
    { now: "2026-08-11T00:00:01.000Z" },
  );
  const state = createTextAuthoringServiceStateFromDocument(decided, {
    draftId: "draft-issue",
    now: "2026-08-11T00:00:02.000Z",
  });

  assert.equal(initialDocument.revisionHistory.length, 1);
  assert.equal(
    state.canonicalDraft.document.revision.revisionId,
    decided.revision.revisionId,
  );
  assert.deepEqual(
    state.canonicalDraft.document.parseResult.issues[0]?.decision,
    decided.parseResult.issues[0]?.decision,
  );
  assert.equal(state.canonicalDraft.document.rawText, decided.rawText);
  assert.equal(isTextAuthoringServiceStateCoherent(state), true);
});

test("P0-01 editing never overwrites the first snapshot and disables explicit save while calculation is stale", () => {
  const initial = createTextAuthoringServiceState(RAW, {
    draftId: "draft-1",
    documentId: "document-1",
    now: NOW,
  });
  const firstSnapshot = structuredClone(initial.sourceSnapshot);
  const editedRaw = RAW.replace("여권 확인", "여권과 비자 확인");
  const calculating = beginTextAuthoringWorkingSourceEdit(
    initial,
    editedRaw,
    "2026-08-11T00:01:00.000Z",
  );

  assert.deepEqual(calculating.sourceSnapshot, firstSnapshot);
  assert.equal(calculating.workingSource.rawText, editedRaw);
  assert.equal(calculating.calculation.status, "calculating");
  assert.equal(isTextAuthoringServiceStateCoherent(calculating), false);
  assert.equal(canExplicitlySaveTextAuthoring(calculating), false);
  assert.throws(
    () => createTextAuthoringExplicitSaveReceipt(calculating),
    /current source\/canonical\/projection revision pair/iu,
  );

  const calculated = completeTextAuthoringCalculation(
    calculating,
    calculating.workingSource.revisionId,
    "2026-08-11T00:01:01.000Z",
  );
  assert.deepEqual(calculated.sourceSnapshot, firstSnapshot);
  assert.equal(calculated.canonicalDraft.document.rawText, editedRaw);
  assert.equal(
    calculated.canonicalDraft.document.parseResult.canonical.items[0]?.title,
    "여권과 비자 확인",
  );
  assert.equal(isTextAuthoringServiceStateCoherent(calculated), true);
  assert.equal(canExplicitlySaveTextAuthoring(calculated), true);
});

test("P0-01 rejects a completion from an older calculation token", () => {
  const initial = createTextAuthoringServiceState(RAW, {
    draftId: "draft-1",
    documentId: "document-1",
    now: NOW,
  });
  const firstEdit = beginTextAuthoringWorkingSourceEdit(
    initial,
    `${RAW}\n첫 번째 메모`,
    "2026-08-11T00:01:00.000Z",
  );
  const staleRevisionId = firstEdit.workingSource.revisionId;
  const secondEdit = beginTextAuthoringWorkingSourceEdit(
    firstEdit,
    `${RAW}\n두 번째 메모`,
    "2026-08-11T00:01:01.000Z",
  );

  assert.throws(
    () => completeTextAuthoringCalculation(secondEdit, staleRevisionId),
    /stale/iu,
  );
  assert.equal(secondEdit.workingSource.rawText.endsWith("두 번째 메모"), true);
});

test("P0-01 recovery records working text without becoming an explicit saved draft", () => {
  const initial = createTextAuthoringServiceState(RAW, {
    draftId: "draft-1",
    documentId: "document-1",
    now: NOW,
  });
  const calculating = beginTextAuthoringWorkingSourceEdit(
    initial,
    `${RAW}\n저장하지 않은 메모`,
    "2026-08-11T00:01:00.000Z",
  );
  const recovery = createTextAuthoringRecoverySnapshot(
    calculating,
    "2026-08-11T00:01:02.000Z",
    "recovery-1",
  );
  const recovered = markTextAuthoringRecoveryStored(calculating, recovery);

  assert.equal(recovery.owner, "local_recovery");
  assert.equal(recovery.recoveredAt, "2026-08-11T00:01:02.000Z");
  assert.equal("savedAt" in recovery, false);
  assert.equal(
    recovery.workingSource.rawText.endsWith("저장하지 않은 메모"),
    true,
  );
  assert.equal(recovery.currentRevisionPair, undefined);
  assert.equal(recovered.lastExplicitSave, undefined);
  assert.deepEqual(recovered.saveState, { status: "dirty" });
});

test("P0-01 explicit save success stores one coherent receipt and clears only matching recovery", () => {
  const initial = createTextAuthoringServiceState(RAW, {
    draftId: "draft-1",
    documentId: "document-1",
    now: NOW,
  });
  const recovery = createTextAuthoringRecoverySnapshot(
    initial,
    "2026-08-11T00:01:00.000Z",
    "recovery-1",
  );
  const withRecovery = markTextAuthoringRecoveryStored(initial, recovery);
  const saved = saveCurrent(withRecovery);

  assert.equal(saved.saveState.status, "saved");
  assert.equal(saved.lastExplicitSave?.owner, "creator_draft_persistence");
  assert.deepEqual(
    saved.lastExplicitSave?.revisionPair,
    getTextAuthoringRevisionPair(saved),
  );
  assert.equal(saved.recovery, undefined);
});

test("P0-01 save failure preserves current working source and recovery", () => {
  const initial = createTextAuthoringServiceState(RAW, {
    draftId: "draft-1",
    documentId: "document-1",
    now: NOW,
  });
  const recovery = createTextAuthoringRecoverySnapshot(
    initial,
    "2026-08-11T00:01:00.000Z",
    "recovery-1",
  );
  const saving = beginTextAuthoringExplicitSave(
    markTextAuthoringRecoveryStored(initial, recovery),
    "2026-08-11T00:02:00.000Z",
  );
  const failed = markTextAuthoringExplicitSaveFailed(
    saving,
    "quota exceeded",
    "2026-08-11T00:03:00.000Z",
  );

  assert.equal(failed.saveState.status, "save_failed");
  assert.equal(failed.workingSource.rawText, RAW);
  assert.equal(failed.recovery?.recoveryId, "recovery-1");
  assert.equal(failed.lastExplicitSave, undefined);
});

test("P0-01 ready is a status-only receipt and any working edit invalidates it immediately", () => {
  const initial = createTextAuthoringServiceState(RAW, {
    draftId: "draft-1",
    documentId: "document-1",
    now: NOW,
  });
  const saved = saveCurrent(initial);
  assert.equal(canMarkTextAuthoringReady(saved), true);
  const ready = markTextAuthoringReady(
    saved,
    "2026-08-11T00:04:00.000Z",
    "ready-receipt-1",
  );

  assert.deepEqual(ready.readyReceipt?.sideEffects, {
    publish: 0,
    network: 0,
    p35: 0,
  });
  assert.deepEqual(
    ready.readyReceipt?.revisionPair,
    ready.lastExplicitSave?.revisionPair,
  );

  const edited = beginTextAuthoringWorkingSourceEdit(
    ready,
    RAW.replace("여권 확인", "여권 다시 확인"),
    "2026-08-11T00:05:00.000Z",
  );
  assert.equal(edited.readyReceipt, undefined);
  assert.deepEqual(edited.saveState, { status: "dirty" });
  assert.equal(canMarkTextAuthoringReady(edited), false);
});

test("P0-01 repository rejects stale durable save and persists one coherent revision pair atomically", () => {
  const repository = createTextAuthoringDraftRepository(
    createMemoryTextAuthoringStorage(),
    {
      now: () => "2026-08-11T01:00:00.000Z",
      idFactory: (prefix) => `${prefix}-1`,
    },
  );
  const initial = createTextAuthoringServiceState(RAW, {
    draftId: "draft-1",
    documentId: "document-1",
    now: NOW,
  });
  const calculating = beginTextAuthoringWorkingSourceEdit(
    initial,
    `${RAW}\n저장 전 계산 중`,
    "2026-08-11T00:10:00.000Z",
  );

  assert.throws(
    () => repository.saveCoherentDraft(calculating),
    /current source\/canonical\/projection revision pair/iu,
  );
  assert.equal(repository.load("draft-1"), undefined);

  const calculated = completeTextAuthoringCalculation(
    calculating,
    calculating.workingSource.revisionId,
    "2026-08-11T00:10:01.000Z",
  );
  const record = repository.saveCoherentDraft(calculated);
  assert.deepEqual(
    record.coherentRevisionPair,
    getTextAuthoringRevisionPair(calculated),
  );
  assert.deepEqual(
    record.explicitSaveReceipt?.revisionPair,
    record.coherentRevisionPair,
  );
  assert.equal(record.sourceSnapshot?.rawText, RAW);
  assert.equal(record.workingSource?.rawText.endsWith("저장 전 계산 중"), true);
  assert.equal(repository.loadRecovery("draft-1"), undefined);
});

test("P0-01 repository recovery uses recoveredAt and never creates a durable draft", () => {
  const repository = createTextAuthoringDraftRepository(
    createMemoryTextAuthoringStorage(),
    {
      now: () => "2026-08-11T01:00:00.000Z",
      idFactory: (prefix) => `${prefix}-1`,
    },
  );
  const initial = createTextAuthoringServiceState(RAW, {
    draftId: "draft-1",
    documentId: "document-1",
    now: NOW,
  });
  const calculating = beginTextAuthoringWorkingSourceEdit(
    initial,
    `${RAW}\n복구 전용 변경`,
    "2026-08-11T00:10:00.000Z",
  );

  const recovery = repository.saveCoherentRecovery(calculating);
  assert.equal(recovery.recoveredAt, "2026-08-11T01:00:00.000Z");
  assert.equal(
    recovery.serviceRecovery?.workingSource.rawText.endsWith("복구 전용 변경"),
    true,
  );
  assert.equal(recovery.serviceRecovery?.currentRevisionPair, undefined);
  assert.equal(repository.load("draft-1"), undefined);
  assert.equal(repository.list().length, 0);
});

test("P0-01 repository ready receipt is status-only and a later coherent revision invalidates it", () => {
  let tick = 0;
  const repository = createTextAuthoringDraftRepository(
    createMemoryTextAuthoringStorage(),
    {
      now: () => `2026-08-11T01:00:0${tick++}.000Z`,
      idFactory: (prefix) => `${prefix}-${tick}`,
    },
  );
  const initial = createTextAuthoringServiceState(RAW, {
    draftId: "draft-1",
    documentId: "document-1",
    now: NOW,
  });
  repository.saveCoherentDraft(initial);
  const ready = repository.markReady("draft-1");
  assert.equal(ready.status, "ready");
  assert.deepEqual(ready.readyReceipt?.sideEffects, {
    publish: 0,
    network: 0,
    p35: 0,
  });

  const calculating = beginTextAuthoringWorkingSourceEdit(
    initial,
    RAW.replace("여권 확인", "여권 다시 확인"),
    "2026-08-11T00:10:00.000Z",
  );
  const calculated = completeTextAuthoringCalculation(
    calculating,
    calculating.workingSource.revisionId,
    "2026-08-11T00:10:01.000Z",
  );
  const next = repository.saveCoherentDraft(calculated);
  assert.notEqual(next.status, "ready");
  assert.equal(next.readyReceipt, undefined);
});

test("P0-01 blocking source issues fail closed before ready status", () => {
  const repository = createTextAuthoringDraftRepository(
    createMemoryTextAuthoringStorage(),
    {
      now: () => "2026-08-11T01:00:00.000Z",
      idFactory: (prefix) => `${prefix}-1`,
    },
  );
  const urlOnly = createTextAuthoringServiceState(
    "https://example.com/source",
    {
      draftId: "draft-url",
      documentId: "document-url",
      now: NOW,
    },
  );
  const saved = saveCurrent(urlOnly);
  repository.saveCoherentDraft(urlOnly);

  assert.equal(canMarkTextAuthoringReady(saved), false);
  assert.throws(
    () => repository.markReady("draft-url"),
    /blocked by an unresolved issue/iu,
  );
  assert.notEqual(repository.load("draft-url")?.status, "ready");
  assert.equal(repository.load("draft-url")?.readyReceipt, undefined);
});

test("P0-01 stored coherent record hydrates the same saved and ready revision pair", () => {
  const repository = createTextAuthoringDraftRepository(
    createMemoryTextAuthoringStorage(),
    {
      now: () => "2026-08-11T01:00:00.000Z",
      idFactory: (prefix) => `${prefix}-1`,
    },
  );
  const initial = createTextAuthoringServiceState(RAW, {
    draftId: "draft-1",
    documentId: "document-1",
    now: NOW,
  });
  repository.saveCoherentDraft(initial);
  const ready = repository.markReady("draft-1");
  const hydrated = hydrateTextAuthoringServiceStateFromRecord(ready);

  assert.equal(hydrated.saveState.status, "saved");
  assert.deepEqual(
    getTextAuthoringRevisionPair(hydrated),
    ready.coherentRevisionPair,
  );
  assert.deepEqual(hydrated.lastExplicitSave, ready.explicitSaveReceipt);
  assert.deepEqual(hydrated.readyReceipt, ready.readyReceipt);
  assert.equal(isTextAuthoringServiceStateCoherent(hydrated), true);
});

test("P0-02 repository rename changes only list metadata and rejects blank titles", () => {
  let tick = 0;
  const repository = createTextAuthoringDraftRepository(
    createMemoryTextAuthoringStorage(),
    { now: () => `2026-08-11T02:00:0${tick++}.000Z` },
  );
  const initial = createTextAuthoringServiceState(RAW, {
    draftId: "draft-1",
    documentId: "document-1",
    now: NOW,
  });
  const saved = repository.saveCoherentDraft(initial, { title: "원래 이름" });
  const before = structuredClone(saved);
  const renamed = repository.rename("draft-1", "  새 이름  ");

  assert.equal(renamed.title, "새 이름");
  assert.notEqual(renamed.updatedAt, before.updatedAt);
  assert.equal(renamed.lastSavedAt, before.lastSavedAt);
  assert.equal(renamed.revisionId, before.revisionId);
  assert.deepEqual(renamed.document, before.document);
  assert.deepEqual(renamed.history, before.history);
  assert.deepEqual(renamed.sourceSnapshot, before.sourceSnapshot);
  assert.deepEqual(renamed.workingSource, before.workingSource);
  assert.deepEqual(renamed.explicitSaveReceipt, before.explicitSaveReceipt);
  assert.throws(
    () => repository.rename("draft-1", "   "),
    /must not be blank/iu,
  );
  assert.equal(repository.load("draft-1")?.title, "새 이름");
});
