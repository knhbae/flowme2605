import assert from "node:assert/strict";
import test from "node:test";

import { applyAuthoringOperation } from "./operations";
import { createTextAuthoringDocument } from "./parser";
import {
  applyTextAuthoringSourceCandidate,
  authorizeTextAuthoringSourceCandidateSession,
  createCandidateFromLocalSyntheticEnvelope,
  createLocalSyntheticHostEnvelope,
  deferTextAuthoringSourceCandidate,
  hydrateTextAuthoringSourceUpdateSession,
  rejectTextAuthoringSourceCandidate,
  resolveTextAuthoringSourceCandidateChange,
  serializeTextAuthoringSourceUpdateSession,
  stageTextAuthoringSourceCandidate,
  undoTextAuthoringSourceCandidate,
  updateTextAuthoringSourceCandidateFocus,
  type TextAuthoringHostCandidateEnvelope,
  type TextAuthoringSourceUpdateSession,
} from "./source-update-service";
import {
  createTextAuthoringServiceStateFromDocument,
  type TextAuthoringServiceState,
} from "./service-state";

const BASE_TIME = "2026-08-13T04:40:00.000Z";
const CANDIDATE_TIME = "2026-08-13T04:41:00.000Z";
const APPLY_TIME = "2026-08-13T04:42:00.000Z";

const BASE_RAW = [
  "# Course plan",
  "- [ ] Core CS",
  "  detail: old detail",
].join("\r\n");

const INCOMING_RAW = [
  "# Course plan",
  "- [ ] Core CS",
  "  detail: incoming detail",
  "- [ ] Mathematics",
  "  detail: new item",
].join("\r\n");

function createBaseState(): TextAuthoringServiceState {
  const document = createTextAuthoringDocument(BASE_RAW, {
    documentId: "p1-e-source-update-document",
    ownership: "creator",
    sourceTitle: "Synthetic OSSU excerpt",
    sourceUrl: "https://example.test/ossu/base",
    sourceExternalVersion: "commit-a",
    now: BASE_TIME,
  });
  return createTextAuthoringServiceStateFromDocument(document, {
    draftId: "p1-e-source-update-draft",
    now: BASE_TIME,
  });
}

function createEnvelopeAndCandidate(
  state: TextAuthoringServiceState,
  rawText = INCOMING_RAW,
): {
  envelope: TextAuthoringHostCandidateEnvelope;
  candidate: ReturnType<typeof createCandidateFromLocalSyntheticEnvelope>;
} {
  const envelope = createLocalSyntheticHostEnvelope(state, rawText, {
    externalVersion: "commit-b",
    collectedAt: CANDIDATE_TIME,
    receivedAt: CANDIDATE_TIME,
    providedBy: "local-fixture-adapter",
    sourceOwnerClaim: "public-project-maintainer",
  });
  const incomingDocument = createTextAuthoringDocument(rawText, {
    documentId: state.canonicalDraft.document.documentId,
    ownership: "creator",
    sourceTitle: state.canonicalDraft.document.sourceTitle,
    sourceUrl: state.canonicalDraft.document.sourceUrl,
    sourceExternalVersion: envelope.externalVersion,
    now: CANDIDATE_TIME,
  });
  const activeItem =
    state.canonicalDraft.document.parseResult.canonical.items[0];
  const incomingItem = incomingDocument.parseResult.canonical.items.find(
    (item) => item.title === activeItem.title,
  );
  assert.ok(incomingItem);
  const candidate = createCandidateFromLocalSyntheticEnvelope(
    state,
    envelope,
    incomingDocument,
    [
      {
        activeItemId: activeItem.itemId,
        incomingItemId: incomingItem.itemId,
        basis: "explicit",
      },
    ],
  );
  return { envelope, candidate };
}

function stageCandidate(
  state: TextAuthoringServiceState,
  options: { permission?: boolean; actor?: "creator" | "personal" } = {},
): TextAuthoringSourceUpdateSession {
  const { envelope, candidate } = createEnvelopeAndCandidate(state);
  return stageTextAuthoringSourceCandidate(state, envelope, candidate, {
    actor: options.actor ?? "creator",
    permission: options.permission ?? options.actor !== "personal",
    now: CANDIDATE_TIME,
  });
}

function stagedChanges(session: TextAuthoringSourceUpdateSession) {
  const sourceState = session.stagedDocument.sourceState;
  assert.ok(sourceState && sourceState.status !== "current");
  return sourceState.changes;
}

function resolveEveryChange(
  source: TextAuthoringSourceUpdateSession,
  decision: "keep_working" | "use_incoming" = "use_incoming",
): TextAuthoringSourceUpdateSession {
  let session = source;
  for (const change of stagedChanges(session)) {
    session = resolveTextAuthoringSourceCandidateChange(
      session,
      change.changeId,
      decision,
      { actor: "creator", permission: true, now: CANDIDATE_TIME },
    );
  }
  return session;
}

test("complete synthetic envelope stages Base, Working, and Candidate without writing working state", () => {
  const state = createBaseState();
  const before = JSON.stringify(state);
  const session = stageCandidate(state);

  assert.equal(JSON.stringify(state), before);
  assert.equal(session.envelope.adapter, "LOCAL_SYNTHETIC_HOST_ADAPTER");
  assert.equal(session.envelope.rawText, INCOMING_RAW);
  assert.equal(session.baseComparison.differs, true);
  assert.equal(session.workingComparison.differs, true);
  assert.ok(
    session.baseComparison.blocks.some(
      (block) =>
        block.beforeLines.includes("  detail: old detail") &&
        block.afterLines.includes("  detail: incoming detail"),
    ),
  );
  assert.ok(stagedChanges(session).length >= 2);
  assert.ok(stagedChanges(session).every((change) => change.state === "open"));
  assert.equal(session.creatorCanApply, true);
});

test("missing or byte-inconsistent envelopes fail closed before a candidate is staged", () => {
  const state = createBaseState();
  const { envelope, candidate } = createEnvelopeAndCandidate(state);

  assert.throws(
    () =>
      stageTextAuthoringSourceCandidate(
        state,
        { ...envelope, sourceOwnerClaim: "" },
        candidate,
        { actor: "creator", permission: true },
      ),
    /incomplete/u,
  );
  assert.throws(
    () =>
      stageTextAuthoringSourceCandidate(
        state,
        { ...envelope, rawByteHash: "tampered" },
        candidate,
        { actor: "creator", permission: true },
      ),
    /bytes or hash/u,
  );
  assert.throws(
    () =>
      stageTextAuthoringSourceCandidate(
        state,
        { ...envelope, rawText: envelope.rawText.replaceAll("\r\n", "\n") },
        candidate,
        { actor: "creator", permission: true },
      ),
    /bytes or hash/u,
  );
});

test("unresolved changes and non-creator permission both produce zero apply writes", () => {
  const state = createBaseState();
  const unresolved = stageCandidate(state);
  const unresolvedResult = applyTextAuthoringSourceCandidate(
    state,
    unresolved,
    { actor: "creator", permission: true, now: APPLY_TIME },
  );
  assert.equal(unresolvedResult.applied, false);
  assert.equal(unresolvedResult.session.status, "apply-failed");
  assert.equal(JSON.stringify(unresolvedResult.state), JSON.stringify(state));

  const denied = stageCandidate(state, { actor: "personal" });
  assert.equal(denied.creatorCanApply, false);
  assert.throws(
    () =>
      resolveTextAuthoringSourceCandidateChange(
        denied,
        stagedChanges(denied)[0].changeId,
        "use_incoming",
        { actor: "personal", permission: false },
      ),
    /Only the creator/u,
  );
  const deniedResult = applyTextAuthoringSourceCandidate(state, denied, {
    actor: "personal",
    permission: false,
    now: APPLY_TIME,
  });
  assert.equal(deniedResult.applied, false);
  assert.equal(JSON.stringify(deniedResult.state), JSON.stringify(state));

  const personalDocument = createTextAuthoringDocument(BASE_RAW, {
    documentId: "p1-e-personal-owner-document",
    ownership: "personal",
    now: BASE_TIME,
  });
  const personalState = createTextAuthoringServiceStateFromDocument(
    personalDocument,
    { draftId: "p1-e-personal-owner-draft", now: BASE_TIME },
  );
  const personalSession = stageCandidate(personalState, {
    actor: "creator",
    permission: true,
  });
  assert.equal(personalSession.creatorCanApply, false);
  const spoofedCreator = applyTextAuthoringSourceCandidate(
    personalState,
    personalSession,
    { actor: "creator", permission: true, now: APPLY_TIME },
  );
  assert.equal(spoofedCreator.applied, false);
  assert.equal(
    JSON.stringify(spoofedCreator.state),
    JSON.stringify(personalState),
  );
});

test("one resolved decision set applies atomically and one undo restores the exact prior aggregate", () => {
  const state = createBaseState();
  const initialJson = JSON.stringify(state);
  const session = resolveEveryChange(stageCandidate(state));
  const result = applyTextAuthoringSourceCandidate(state, session, {
    actor: "creator",
    permission: true,
    now: APPLY_TIME,
  });

  assert.equal(result.applied, true);
  assert.equal(result.replayed, false);
  assert.equal(result.state.workingSource.rawText, INCOMING_RAW);
  assert.equal(result.state.canonicalDraft.document.rawText, INCOMING_RAW);
  assert.equal(
    result.state.canonicalDraft.document.sourceState?.active.externalVersion,
    "commit-b",
  );
  assert.equal(result.state.sourceSnapshot.rawText, BASE_RAW);
  assert.equal(result.state.saveState.status, "dirty");
  assert.equal(result.state.readyReceipt, undefined);
  assert.equal(result.receipt?.creatorRevisionDelta, 0);
  assert.deepEqual(result.receipt?.sideEffects, {
    publish: 0,
    network: 0,
    p35: 0,
    externalWrite: 0,
  });
  assert.equal(result.session.status, "undo-available");

  const replay = applyTextAuthoringSourceCandidate(
    result.state,
    result.session,
    {
      actor: "creator",
      permission: true,
      now: "2026-08-13T04:43:00.000Z",
    },
  );
  assert.equal(replay.applied, true);
  assert.equal(replay.replayed, true);
  assert.equal(replay.receipt?.receiptId, result.receipt?.receiptId);
  assert.equal(JSON.stringify(replay.state), JSON.stringify(result.state));

  const undone = undoTextAuthoringSourceCandidate(
    result.state,
    result.session,
    {
      actor: "creator",
      permission: true,
      now: "2026-08-13T04:44:00.000Z",
    },
  );
  assert.equal(JSON.stringify(undone.state), initialJson);
  assert.equal(undone.session.status, "reverted");
});

test("stale working heads and injected failures preserve candidate decisions and current work", () => {
  const initial = createBaseState();
  const resolved = resolveEveryChange(stageCandidate(initial));
  const editedDocument = applyAuthoringOperation(
    initial.canonicalDraft.document,
    {
      type: "set_property",
      itemId:
        initial.canonicalDraft.document.parseResult.canonical.items[0].itemId,
      key: "detail",
      value: "creator changed after staging",
    },
    { actorLane: "creator", now: APPLY_TIME },
  );
  const edited = createTextAuthoringServiceStateFromDocument(editedDocument, {
    draftId: initial.draftId,
    now: APPLY_TIME,
  });
  edited.sourceSnapshot = initial.sourceSnapshot;
  const stale = applyTextAuthoringSourceCandidate(edited, resolved, {
    actor: "creator",
    permission: true,
    now: APPLY_TIME,
  });
  assert.equal(stale.applied, false);
  assert.equal(stale.session.status, "stale-candidate");
  assert.equal(JSON.stringify(stale.state), JSON.stringify(edited));
  assert.deepEqual(
    stagedChanges(stale.session).map((change) => change.resolution),
    stagedChanges(resolved).map((change) => change.resolution),
  );

  for (const injectFailure of [
    "before-domain-apply",
    "before-commit",
  ] as const) {
    const failed = applyTextAuthoringSourceCandidate(initial, resolved, {
      actor: "creator",
      permission: true,
      now: APPLY_TIME,
      injectFailure,
    });
    assert.equal(failed.applied, false);
    assert.equal(failed.session.status, "apply-failed");
    assert.equal(JSON.stringify(failed.state), JSON.stringify(initial));
    assert.deepEqual(
      stagedChanges(failed.session).map((change) => change.resolution),
      stagedChanges(resolved).map((change) => change.resolution),
    );
  }
});

test("defer, reject, focus, and serialized re-entry preserve the candidate without applying it", () => {
  const state = createBaseState();
  const staged = stageCandidate(state);
  const secondChangeId = stagedChanges(staged)[1].changeId;
  const focused = updateTextAuthoringSourceCandidateFocus(staged, {
    selectedChangeId: secondChangeId,
    scrollTop: 412,
  });
  const deferred = deferTextAuthoringSourceCandidate(focused, {
    actor: "creator",
    permission: true,
    now: "2026-08-13T04:45:00.000Z",
  });
  const hydrated = hydrateTextAuthoringSourceUpdateSession(
    serializeTextAuthoringSourceUpdateSession(deferred),
  );
  assert.equal(hydrated.status, "deferred");
  assert.equal(hydrated.creatorCanApply, false);
  assert.equal(hydrated.selectedChangeId, secondChangeId);
  assert.equal(hydrated.scrollTop, 412);
  assert.equal(hydrated.envelope.rawText, INCOMING_RAW);
  assert.equal(JSON.stringify(state), JSON.stringify(createBaseState()));

  const rejected = rejectTextAuthoringSourceCandidate(
    { ...hydrated, creatorCanApply: true },
    {
      actor: "creator",
      permission: true,
      now: "2026-08-13T04:46:00.000Z",
    },
  );
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.envelope.rawText, INCOMING_RAW);
});

test("stored session tampering and terminal-state reapply attempts fail closed", () => {
  const state = createBaseState();
  const staged = stageCandidate(state);
  const tampered = JSON.parse(
    serializeTextAuthoringSourceUpdateSession(staged),
  ) as TextAuthoringSourceUpdateSession;
  tampered.stagedDocument.sourceState =
    tampered.stagedDocument.sourceState &&
    tampered.stagedDocument.sourceState.status !== "current"
      ? {
          ...tampered.stagedDocument.sourceState,
          incoming: {
            ...tampered.stagedDocument.sourceState.incoming,
            rawText: `${INCOMING_RAW}\nTAMPERED`,
          },
        }
      : tampered.stagedDocument.sourceState;
  assert.throws(
    () => hydrateTextAuthoringSourceUpdateSession(JSON.stringify(tampered)),
    /integrity/u,
  );

  const resolved = resolveEveryChange(stageCandidate(state));
  const applied = applyTextAuthoringSourceCandidate(state, resolved, {
    actor: "creator",
    permission: true,
    now: APPLY_TIME,
  });
  assert.equal(applied.applied, true);
  const receiptTampered = JSON.parse(
    serializeTextAuthoringSourceUpdateSession(applied.session),
  ) as TextAuthoringSourceUpdateSession;
  assert.ok(receiptTampered.receipt);
  receiptTampered.receipt.resultCanonicalRevisionId = "tampered-canonical";
  assert.throws(
    () =>
      hydrateTextAuthoringSourceUpdateSession(JSON.stringify(receiptTampered)),
    /receipt integrity/u,
  );
  const beforeTampered = JSON.parse(
    serializeTextAuthoringSourceUpdateSession(applied.session),
  ) as TextAuthoringSourceUpdateSession;
  assert.ok(beforeTampered.beforeApplyState);
  beforeTampered.beforeApplyState.canonicalDraft.document.rawText = "tampered";
  assert.throws(
    () =>
      hydrateTextAuthoringSourceUpdateSession(JSON.stringify(beforeTampered)),
    /receipt integrity/u,
  );
  const saveStateTampered = JSON.parse(
    serializeTextAuthoringSourceUpdateSession(applied.session),
  ) as TextAuthoringSourceUpdateSession;
  assert.ok(saveStateTampered.beforeApplyState);
  saveStateTampered.beforeApplyState.saveState = {
    status: "saved",
    savedAt: "2099-01-01T00:00:00.000Z",
  };
  assert.throws(
    () =>
      hydrateTextAuthoringSourceUpdateSession(
        JSON.stringify(saveStateTampered),
      ),
    /receipt integrity/u,
  );

  const rejected = rejectTextAuthoringSourceCandidate(staged, {
    actor: "creator",
    permission: true,
    now: CANDIDATE_TIME,
  });
  const result = applyTextAuthoringSourceCandidate(state, rejected, {
    actor: "creator",
    permission: true,
    now: APPLY_TIME,
  });
  assert.equal(result.applied, false);
  assert.equal(JSON.stringify(result.state), JSON.stringify(state));
  assert.throws(
    () =>
      resolveTextAuthoringSourceCandidateChange(
        rejected,
        stagedChanges(rejected)[0].changeId,
        "use_incoming",
        { actor: "creator", permission: true },
      ),
    /cannot be changed/u,
  );
});

test("non-default recurrence projection options survive receipt hydration and replay", () => {
  const recurrenceRaw = [
    "# Recurrence",
    "- [ ] Daily review",
    "  - 날짜: 2026-08-13",
    "  - 반복: 매일",
  ].join("\n");
  const incomingRaw = recurrenceRaw.replace(
    "  - 날짜: 2026-08-13",
    "  - 날짜: 2026-08-14",
  );
  const document = createTextAuthoringDocument(recurrenceRaw, {
    documentId: "p1-e-projection-options-document",
    ownership: "creator",
    now: BASE_TIME,
  });
  const state = createTextAuthoringServiceStateFromDocument(document, {
    draftId: "p1-e-projection-options-draft",
    now: BASE_TIME,
    projectionOptions: { openEndedOccurrenceWeeks: 8 },
  });
  const { envelope, candidate } = createEnvelopeAndCandidate(
    state,
    incomingRaw,
  );
  let session = stageTextAuthoringSourceCandidate(state, envelope, candidate, {
    actor: "creator",
    permission: true,
    now: CANDIDATE_TIME,
  });
  session = resolveEveryChange(session);
  const applied = applyTextAuthoringSourceCandidate(state, session, {
    actor: "creator",
    permission: true,
    now: APPLY_TIME,
    projectionOptions: { openEndedOccurrenceWeeks: 8 },
  });
  assert.equal(applied.applied, true);
  assert.equal(applied.state.projection.value.artifacts.todo.rows.length, 56);
  const hydrated = hydrateTextAuthoringSourceUpdateSession(
    serializeTextAuthoringSourceUpdateSession(applied.session),
  );
  const replay = applyTextAuthoringSourceCandidate(
    applied.state,
    { ...hydrated, creatorCanApply: true },
    {
      actor: "creator",
      permission: true,
      now: "2026-08-13T04:43:00.000Z",
      projectionOptions: { openEndedOccurrenceWeeks: 8 },
    },
  );
  assert.equal(replay.applied, true);
  assert.equal(replay.replayed, true);
});

test("reload authorization allows current creators, preserves denial, and marks a changed head stale", () => {
  const state = createBaseState();
  const allowed = stageCandidate(state);
  const hydratedAllowed = hydrateTextAuthoringSourceUpdateSession(
    serializeTextAuthoringSourceUpdateSession(allowed),
  );
  const reauthorized = authorizeTextAuthoringSourceCandidateSession(
    hydratedAllowed,
    state,
    { actor: "creator", permission: true },
  );
  assert.equal(reauthorized.creatorCanApply, true);
  assert.notEqual(reauthorized.status, "stale-candidate");

  const denied = stageCandidate(state, { permission: false });
  const hydratedDenied = hydrateTextAuthoringSourceUpdateSession(
    serializeTextAuthoringSourceUpdateSession(denied),
  );
  const denialPreserved = authorizeTextAuthoringSourceCandidateSession(
    hydratedDenied,
    state,
    { actor: "creator", permission: true },
  );
  assert.equal(denialPreserved.creatorCanApply, false);

  const editedDocument = applyAuthoringOperation(
    state.canonicalDraft.document,
    {
      type: "set_property",
      itemId:
        state.canonicalDraft.document.parseResult.canonical.items[0].itemId,
      key: "detail",
      value: "changed after candidate receipt",
    },
    { actorLane: "creator", now: APPLY_TIME },
  );
  const editedState = createTextAuthoringServiceStateFromDocument(
    editedDocument,
    { draftId: state.draftId, now: APPLY_TIME },
  );
  editedState.sourceSnapshot = state.sourceSnapshot;
  const stale = authorizeTextAuthoringSourceCandidateSession(
    hydratedAllowed,
    editedState,
    { actor: "creator", permission: true },
  );
  assert.equal(stale.creatorCanApply, true);
  assert.equal(stale.status, "stale-candidate");
});
