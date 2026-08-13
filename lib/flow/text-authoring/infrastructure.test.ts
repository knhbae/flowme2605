import assert from "node:assert/strict";
import test from "node:test";

import type {
  AuthoringArtifact,
  AuthoringSchedule,
  TextAuthoringDocument,
  TextAuthoringOwnership,
} from "./types";
import {
  TEXT_AUTHORING_DRAFTS_STORAGE_KEY,
  TEXT_AUTHORING_MAX_PERSISTED_REVISIONS,
  TEXT_AUTHORING_MAX_SAVED_HISTORY,
  TextAuthoringStorageReadError,
  TextAuthoringStorageWriteError,
  createMemoryTextAuthoringStorage,
  createTextAuthoringDraftRepository,
} from "./storage";
import {
  buildArtifactPreflight,
  buildAuthoringArtifactProjection,
} from "./artifact-projection";
import { adaptTextAuthoringDocumentToFlowBundle } from "./flow-bundle-adapter";
import {
  assertPreflightReceiptParity,
  checkPreflightReceiptParity,
  createExportReceipt,
  createSaveReceipt,
} from "./receipt";
import {
  checkMarkdownRoundTrip,
  exportTextAuthoringMarkdown,
  parseSupportedTextAuthoringMarkdown,
} from "./markdown-roundtrip";
import { createTextAuthoringDocument } from "./parser";
import { createTextAuthoringServiceStateFromDocument } from "./service-state";

type DocumentFixtureOptions = {
  count?: number;
  title?: string;
  ownership?: TextAuthoringOwnership;
  primaryArtifact?: AuthoringArtifact;
  schedule?: (index: number) => AuthoringSchedule | undefined;
  included?: (index: number) => boolean;
};

function documentFixture(
  options: DocumentFixtureOptions = {},
): TextAuthoringDocument {
  const count = options.count ?? 5;
  const documentId = `document-${count}-${options.primaryArtifact ?? "todo"}`;
  const flowId = `${documentId}-flow`;
  const stepId = `${flowId}-step`;
  const now = "2026-07-29T09:00:00.000Z";
  const sourceRows = Array.from({ length: count }, (_, index) => ({
    sourceRowId: `${documentId}-source-${index + 1}`,
    documentId,
    rowType:
      options.primaryArtifact === "sheet"
        ? ("table_row" as const)
        : ("check" as const),
    rawText: `- [ ] 항목 ${index + 1}`,
    sourceRange: {
      startOffset: index * 20,
      endOffset: index * 20 + 15,
      startLine: index + 2,
      endLine: index + 2,
    },
    order: index,
  }));
  const items = sourceRows.map((sourceRow, index) => ({
    itemId: `${documentId}-item-${index + 1}`,
    stepId,
    title: `항목 ${index + 1}`,
    sourceTitle: `항목 ${index + 1}`,
    detail: index === 0 ? "첫 번째 항목의 상세 설명" : undefined,
    sourceDetail: index === 0 ? "첫 번째 항목의 상세 설명" : undefined,
    completion: {
      mode: "check" as const,
      doneWhen: `항목 ${index + 1}을 확인함`,
      sourceRowIds: [sourceRow.sourceRowId],
      owner: "source" as const,
    },
    schedule: options.schedule?.(index),
    intent: "act" as const,
    role: "item" as const,
    order: index,
    nestingLevel: 0,
    included: options.included?.(index) ?? true,
    properties:
      index === 0
        ? [
            {
              propertyId: `${documentId}-property-place`,
              key: "place",
              label: "장소",
              value: "서울",
              sourceRowIds: [sourceRow.sourceRowId],
              owner: "source" as const,
            },
          ]
        : [],
    resources:
      index === 0
        ? [
            {
              label: "준비 자료",
              url: "https://example.com/resource",
              type: "reference" as const,
              sourceRowIds: [sourceRow.sourceRowId],
            },
          ]
        : [],
    sources:
      index === 0
        ? [
            {
              label: "원문",
              url: "https://example.com/source",
              type: "official" as const,
              sourceRowIds: [sourceRow.sourceRowId],
            },
          ]
        : [],
    guides: index === 0 ? ["원문 순서대로 확인합니다."] : [],
    cautions: index === 0 ? ["조건이 다르면 원문을 다시 확인합니다."] : [],
    sourceRowIds: [sourceRow.sourceRowId],
  }));
  const primaryArtifact = options.primaryArtifact ?? "todo";
  const counts: Record<AuthoringArtifact, number> = {
    calendar: items.filter((item) => Boolean(item.schedule)).length,
    checklist: count,
    todo: count,
    sheet: count,
    memo: count,
  };

  return {
    schemaVersion: "flowme-text-authoring-v1",
    documentId,
    ownership: options.ownership ?? "creator",
    title: options.title ?? `${count}개 항목 Flow`,
    rawText: [
      `# ${options.title ?? `${count}개 항목 Flow`}`,
      ...sourceRows.map((row) => row.rawText),
    ].join("\n"),
    inputKinds: options.primaryArtifact === "sheet" ? ["table"] : ["markdown"],
    primaryInputKind:
      options.primaryArtifact === "sheet" ? "table" : "markdown",
    sourceTitle: "테스트 원문",
    sourceUrl: "https://example.com/source",
    parseResult: {
      parseResultId: `${documentId}-parse`,
      parserVersion: "flowme-text-authoring-parser-v1",
      fixtureVersion: "test-v1",
      blocks: sourceRows.map((row, index) => ({
        blockId: `${documentId}-block-${index + 1}`,
        documentId,
        order: index,
        depth: 0,
        sourceRange: { ...row.sourceRange },
        rawText: row.rawText,
        normalizedText: `항목 ${index + 1}`,
        interpretedRole: "item",
        confidenceBand: "high",
        included: true,
      })),
      mappings: items.map((item, index) => ({
        mappingId: `${documentId}-mapping-${index + 1}`,
        blockIds: [`${documentId}-block-${index + 1}`],
        targetKind: "item",
        targetDraftId: item.itemId,
        sourceLineage: [sourceRows[index].sourceRowId],
        userCorrected: false,
      })),
      issues: [],
      canonical: {
        flow: {
          flowId,
          title: options.title ?? `${count}개 항목 Flow`,
          primaryArtifact,
          secondaryArtifacts: ["memo", "sheet"].filter(
            (artifact) => artifact !== primaryArtifact,
          ) as AuthoringArtifact[],
          stepIds: [stepId],
          sourceRowIds: sourceRows.map((row) => row.sourceRowId),
        },
        steps: [
          {
            stepId,
            flowId,
            title: "기본 Step",
            order: 0,
            itemIds: items.map((item) => item.itemId),
            sourceRowIds: sourceRows.map((row) => row.sourceRowId),
          },
        ],
        items,
        fields: [],
        memos: [],
        sourceRows,
        sourceRefs: items.map((item, index) => ({
          sourceRefId: `${documentId}-ref-${index + 1}`,
          entityType: "item" as const,
          entityId: item.itemId,
          sourceRowIds: [...item.sourceRowIds],
          relation: "derived_from" as const,
          supportLevel: "direct" as const,
        })),
      },
      artifactEligibility: {
        primary: primaryArtifact,
        secondary: ["memo", "sheet"].filter(
          (artifact) => artifact !== primaryArtifact,
        ) as AuthoringArtifact[],
        counts,
        loss: {},
      },
    },
    revision: {
      revisionId: `${documentId}-revision-1`,
      operations: [],
      actorLane: options.ownership ?? "creator",
      timestamp: now,
    },
    revisionHistory: [
      {
        revisionId: `${documentId}-revision-1`,
        operations: [],
        actorLane: options.ownership ?? "creator",
        timestamp: now,
      },
    ],
    lifecycleStatus: "draft",
    createdAt: now,
    updatedAt: now,
    uiState: { stage: "input", focusTarget: "authoring-input" },
  };
}

function revision(
  document: TextAuthoringDocument,
  revisionNumber: number,
  title: string,
): TextAuthoringDocument {
  const next = structuredClone(document);
  next.title = title;
  next.parseResult.canonical.flow.title = title;
  next.revision = {
    revisionId: `${document.documentId}-revision-${revisionNumber}`,
    parentRevisionId: document.revision.revisionId,
    operations: [],
    actorLane: document.ownership,
    timestamp: `2026-07-29T09:0${revisionNumber}:00.000Z`,
  };
  next.revisionHistory = [
    ...next.revisionHistory,
    structuredClone(next.revision),
  ];
  next.updatedAt = next.revision.timestamp;
  return next;
}

test("draft storage uses only the authoring namespace and round-trips a document", () => {
  const legacyKey = "flow_builder_mvp_bundles_v11";
  const legacyValue = JSON.stringify([{ id: "existing-flow" }]);
  const storage = createMemoryTextAuthoringStorage({
    [legacyKey]: legacyValue,
  });
  const repository = createTextAuthoringDraftRepository(storage, {
    now: () => "2026-07-29T10:00:00.000Z",
    idFactory: (prefix) => `${prefix}-fixed`,
  });
  const document = documentFixture({ count: 5, title: "제주 여행 메모" });

  const saved = repository.save(document, {
    activeStage: "structure",
    selectedItemId: document.parseResult.canonical.items[0].itemId,
  });

  assert.equal(repository.key, TEXT_AUTHORING_DRAFTS_STORAGE_KEY);
  assert.deepEqual(
    repository.load(saved.draftId)?.document,
    JSON.parse(JSON.stringify(document)) as TextAuthoringDocument,
  );
  assert.equal(repository.list()[0].itemCount, 5);
  assert.equal(repository.list()[0].stepCount, 1);
  assert.equal(storage.getItem(legacyKey), legacyValue);
});

test("draft save and recovery distinguish handled source memo from an explicit hold", () => {
  const storage = createMemoryTextAuthoringStorage();
  const repository = createTextAuthoringDraftRepository(storage, {
    now: () => "2026-07-29T10:00:00.000Z",
    idFactory: (prefix) => `${prefix}-issue-state`,
  });
  const openDocument = createTextAuthoringDocument(
    "제주 여행은 여름에 사람이 많습니다.",
    { now: "2026-07-29T09:00:00.000Z" },
  );
  const heldDocument = structuredClone(openDocument);
  const heldIssue = heldDocument.parseResult.issues[0];
  assert.ok(heldIssue);
  heldIssue.decision = {
    outcome: "hold",
    state: "held",
    targetKind: "unresolved",
    actorLane: heldDocument.ownership,
    decidedAt: "2026-07-29T09:01:00.000Z",
  };
  const resolvedDocument = structuredClone(openDocument);
  const resolvedIssue = resolvedDocument.parseResult.issues[0];
  assert.ok(resolvedIssue);
  resolvedIssue.decision = {
    outcome: "keep_source_only",
    state: "resolved",
    targetKind: "source",
    actorLane: resolvedDocument.ownership,
    decidedAt: "2026-07-29T09:02:00.000Z",
  };

  repository.save(openDocument, { draftId: "open-issue" });
  repository.save(heldDocument, { draftId: "held-issue" });
  repository.autosave(heldDocument, {
    draftId: "held-issue",
    activeStage: "structure",
  });
  repository.save(resolvedDocument, { draftId: "resolved-issue" });

  assert.deepEqual(
    repository.load("held-issue")?.document.parseResult.issues[0]?.decision,
    heldIssue.decision,
  );
  assert.deepEqual(
    repository.loadRecovery("held-issue")?.document.parseResult.issues[0]
      ?.decision,
    heldIssue.decision,
  );
  assert.deepEqual(
    Object.fromEntries(
      repository
        .list()
        .map((record) => [record.draftId, record.unresolvedIssueCount]),
    ),
    {
      "open-issue": 0,
      "held-issue": 1,
      "resolved-issue": 0,
    },
  );
  assert.equal(
    JSON.parse(storage.getItem(TEXT_AUTHORING_DRAFTS_STORAGE_KEY) ?? "{}")
      .schemaVersion,
    1,
  );
});

test("draft list supports ownership search plus archive and restore", () => {
  let sequence = 0;
  const storage = createMemoryTextAuthoringStorage();
  const repository = createTextAuthoringDraftRepository(storage, {
    now: () => `2026-07-29T10:00:0${sequence}.000Z`,
    idFactory: (prefix) => `${prefix}-${++sequence}`,
  });
  const creator = documentFixture({
    count: 5,
    title: "제주 여행 메모",
    ownership: "creator",
  });
  const personal = documentFixture({
    count: 10,
    title: "차량 점검",
    ownership: "personal",
  });
  repository.save(creator);
  repository.save(personal);

  assert.deepEqual(
    repository.search("제주").map((entry) => entry.title),
    ["제주 여행 메모"],
  );
  assert.equal(repository.list({ ownership: "personal" }).length, 1);
  repository.archive(creator.documentId);
  assert.equal(
    repository.load(creator.documentId)?.document.lifecycleStatus,
    "archived",
  );
  assert.equal(
    repository.list().some((entry) => entry.draftId === creator.documentId),
    false,
  );
  assert.equal(
    repository.list({ includeArchived: true, status: "archived" }).length,
    1,
  );
  repository.restore(creator.documentId);
  assert.equal(repository.load(creator.documentId)?.status, "draft");
  assert.equal(
    repository.load(creator.documentId)?.document.lifecycleStatus,
    "draft",
  );
});

test("duplicate gets separate draft, document, and revision IDs without source mutation", () => {
  let sequence = 0;
  const repository = createTextAuthoringDraftRepository(
    createMemoryTextAuthoringStorage(),
    {
      now: () => "2026-07-29T10:00:00.000Z",
      idFactory: (prefix) => `${prefix}-${++sequence}`,
    },
  );
  const document = documentFixture({ count: 5 });
  const sourceSnapshot = structuredClone(
    document.parseResult.canonical.sourceRows,
  );
  const sourceSnapshotId = document.sourceState?.active.snapshotId;
  repository.save(document);
  const duplicated = repository.duplicate(document.documentId);

  assert.notEqual(duplicated.draftId, document.documentId);
  assert.notEqual(duplicated.document.documentId, document.documentId);
  assert.notEqual(duplicated.revisionId, document.revision.revisionId);
  assert.notEqual(
    duplicated.document.sourceState?.active.snapshotId,
    sourceSnapshotId,
  );
  assert.ok(duplicated.document.sourceState?.active.snapshotId);
  assert.equal(
    duplicated.document.parseResult.canonical.sourceRows.every(
      (row) =>
        row.sourceSnapshotId ===
        duplicated.document.sourceState?.active.snapshotId,
    ),
    true,
  );
  assert.equal(duplicated.history.length, 1);
  assert.deepEqual(
    duplicated.document.parseResult.canonical.sourceRows.map(
      (row) => row.rawText,
    ),
    sourceSnapshot.map((row) => row.rawText),
  );
  assert.deepEqual(document.parseResult.canonical.sourceRows, sourceSnapshot);
  assert.equal(document.sourceState?.active.snapshotId, sourceSnapshotId);
});

test("duplicate is a new dirty draft with new source ownership but no false save receipt", () => {
  let currentTime = "2026-08-11T01:00:00.000Z";
  let sequence = 0;
  const repository = createTextAuthoringDraftRepository(
    createMemoryTextAuthoringStorage(),
    {
      now: () => currentTime,
      idFactory: (prefix) => `${prefix}-${++sequence}`,
    },
  );
  const document = documentFixture({ count: 3, title: "원본 콘텐츠" });
  const serviceState = createTextAuthoringServiceStateFromDocument(document, {
    draftId: document.documentId,
    now: currentTime,
  });
  const saved = repository.saveCoherentDraft(serviceState);

  currentTime = "2026-08-11T02:00:00.000Z";
  const duplicated = repository.duplicate(saved.draftId);

  assert.equal(duplicated.status, "draft");
  assert.equal(duplicated.lastSavedAt, saved.lastSavedAt);
  assert.equal(duplicated.updatedAt, currentTime);
  assert.ok(duplicated.sourceSnapshot);
  assert.ok(duplicated.workingSource);
  assert.notEqual(
    duplicated.sourceSnapshot?.snapshotId,
    saved.sourceSnapshot?.snapshotId,
  );
  assert.equal(
    duplicated.workingSource?.sourceSnapshotId,
    duplicated.sourceSnapshot?.snapshotId,
  );
  assert.equal(duplicated.workingSource?.rawText, document.rawText);
  assert.equal(duplicated.coherentRevisionPair, undefined);
  assert.equal(duplicated.explicitSaveReceipt, undefined);
  assert.equal(duplicated.readyReceipt, undefined);
});

test("duplicate assigns the smallest collision-safe copy number across active and archived drafts", () => {
  let sequence = 0;
  const repository = createTextAuthoringDraftRepository(
    createMemoryTextAuthoringStorage(),
    {
      now: () => "2026-07-29T10:00:00.000Z",
      idFactory: (prefix) => `${prefix}-${++sequence}`,
    },
  );
  const source = documentFixture({ count: 2, title: "여권 준비" });
  repository.save(source, { title: "여권 준비" });

  const first = repository.duplicate(source.documentId);
  const third = repository.duplicate(source.documentId, {
    title: "사본 3 · 여권 준비",
  });
  const second = repository.duplicate(source.documentId);
  const fourth = repository.duplicate(first.draftId);
  repository.archive(second.draftId);
  const fifth = repository.duplicate(source.documentId);

  assert.equal(first.title, "사본 1 · 여권 준비");
  assert.equal(second.title, "사본 2 · 여권 준비");
  assert.equal(third.title, "사본 3 · 여권 준비");
  assert.equal(fourth.title, "사본 4 · 여권 준비");
  assert.equal(fifth.title, "사본 5 · 여권 준비");
  assert.equal(
    new Set([
      source.documentId,
      first.document.documentId,
      second.document.documentId,
      third.document.documentId,
      fourth.document.documentId,
      fifth.document.documentId,
    ]).size,
    6,
  );
  assert.equal(
    new Set([
      source.sourceState?.active.snapshotId,
      first.document.sourceState?.active.snapshotId,
      second.document.sourceState?.active.snapshotId,
      third.document.sourceState?.active.snapshotId,
      fourth.document.sourceState?.active.snapshotId,
      fifth.document.sourceState?.active.snapshotId,
    ]).size,
    6,
  );
});

test("autosave recovery stays separate from the explicit saved revision", () => {
  const repository = createTextAuthoringDraftRepository(
    createMemoryTextAuthoringStorage(),
    {
      now: () => "2026-07-29T10:00:00.000Z",
      idFactory: (prefix) => `${prefix}-recovery`,
    },
  );
  const savedDocument = documentFixture({ count: 5, title: "저장본" });
  repository.save(savedDocument);
  const unsavedDocument = revision(savedDocument, 2, "저장하지 않은 수정");
  repository.autosave(unsavedDocument, {
    activeStage: "result",
    focusTarget: "save-draft",
  });

  assert.equal(repository.load(savedDocument.documentId)?.title, "저장본");
  assert.equal(
    repository.loadRecovery(savedDocument.documentId)?.document.title,
    "저장하지 않은 수정",
  );
  assert.equal(repository.list()[0].hasRecovery, true);
  repository.clearRecovery(savedDocument.documentId);
  assert.equal(repository.loadRecovery(savedDocument.documentId), undefined);
});

test("recovery selection is draft-scoped and only exposes a newer recovery", () => {
  let currentTime = "2026-08-11T01:00:00.000Z";
  const storage = createMemoryTextAuthoringStorage();
  const repository = createTextAuthoringDraftRepository(storage, {
    now: () => currentTime,
  });
  const first = documentFixture({ title: "첫 초안" });
  const second = documentFixture({ count: 6, title: "둘째 초안" });
  repository.save(first);
  repository.save(second);

  currentTime = "2026-08-11T02:00:00.000Z";
  repository.autosave(revision(first, 2, "첫 초안의 새 복구본"), {
    draftId: first.documentId,
  });

  assert.equal(
    repository.loadNewerRecovery(first.documentId)?.document.title,
    "첫 초안의 새 복구본",
  );
  assert.equal(repository.loadNewerRecovery(second.documentId), undefined);

  const raw = storage.getItem(TEXT_AUTHORING_DRAFTS_STORAGE_KEY);
  assert.ok(raw);
  const persisted = JSON.parse(raw) as {
    recoveries: Record<string, { recoveredAt: string; savedAt: string }>;
  };
  persisted.recoveries[first.documentId].recoveredAt =
    "2026-08-11T00:00:00.000Z";
  persisted.recoveries[first.documentId].savedAt = "2026-08-11T00:00:00.000Z";
  storage.setItem(TEXT_AUTHORING_DRAFTS_STORAGE_KEY, JSON.stringify(persisted));

  assert.equal(repository.loadNewerRecovery(first.documentId), undefined);
});

test("explicit saves keep version history and can restore an earlier revision", () => {
  let sequence = 0;
  const repository = createTextAuthoringDraftRepository(
    createMemoryTextAuthoringStorage(),
    {
      now: () => `2026-07-29T10:00:0${sequence}.000Z`,
      idFactory: (prefix) => `${prefix}-${++sequence}`,
    },
  );
  const first = documentFixture({ title: "첫 저장본" });
  const second = revision(first, 2, "두 번째 저장본");
  repository.save(first);
  repository.save(second);
  const history = repository.getHistory(first.documentId);
  assert.equal(history.length, 2);

  const restored = repository.restoreVersion(
    first.documentId,
    history[0].versionId,
  );
  assert.equal(restored.document.title, "첫 저장본");
  assert.equal(repository.getHistory(first.documentId).length, 3);
});

test("repeated large saves keep persisted revision and version history bounded", () => {
  let sequence = 0;
  const storage = createMemoryTextAuthoringStorage();
  const repository = createTextAuthoringDraftRepository(storage, {
    now: () => `2026-07-29T10:${String(sequence).padStart(2, "0")}:00.000Z`,
    idFactory: (prefix) => `${prefix}-${++sequence}`,
  });
  let document = documentFixture({
    count: 38,
    title: "38개 항목 저장 크기 기준",
    primaryArtifact: "sheet",
  });
  repository.save(document);

  for (let revisionNumber = 2; revisionNumber <= 25; revisionNumber += 1) {
    const previous = document;
    document = revision(
      previous,
      revisionNumber,
      `38개 항목 저장 크기 기준 ${revisionNumber}`,
    );
    document.revision.before = {
      parseResult: structuredClone(previous.parseResult),
      rawText: previous.rawText,
      inputKinds: structuredClone(previous.inputKinds),
      primaryInputKind: previous.primaryInputKind,
      lifecycleStatus: previous.lifecycleStatus,
    };
    document.revisionHistory[document.revisionHistory.length - 1] =
      structuredClone(document.revision);
    repository.save(document);
  }

  const raw = storage.getItem(TEXT_AUTHORING_DRAFTS_STORAGE_KEY);
  assert.ok(raw);
  const persisted = JSON.parse(raw) as {
    drafts: Record<
      string,
      {
        document: TextAuthoringDocument;
        history: Array<{ document: TextAuthoringDocument }>;
      }
    >;
  };
  const stored = persisted.drafts[document.documentId];
  assert.ok(stored);
  assert.equal(
    stored.document.revisionHistory.length,
    TEXT_AUTHORING_MAX_PERSISTED_REVISIONS,
  );
  assert.equal(stored.history.length, TEXT_AUTHORING_MAX_SAVED_HISTORY);
  assert.ok(
    stored.history.every(
      (entry) =>
        entry.document.revisionHistory.length === 1 &&
        entry.document.revision.before === undefined,
    ),
  );
  assert.ok(
    raw.length < 1_500_000,
    `bounded 38-row storage should stay below 1.5M characters; received ${raw.length}`,
  );

  const retainedHistory = repository.getHistory(document.documentId);
  const restored = repository.restoreVersion(
    document.documentId,
    retainedHistory[0].versionId,
  );
  assert.equal(restored.document.title, retainedHistory[0].document.title);
  assert.equal(
    repository.getHistory(document.documentId).length,
    TEXT_AUTHORING_MAX_SAVED_HISTORY,
  );
});

test("a quota write failure is typed and restores the previous saved value", () => {
  const underlying = createMemoryTextAuthoringStorage();
  let failNextWrite = false;
  const storage = {
    getItem: underlying.getItem,
    removeItem: underlying.removeItem,
    setItem(key: string, value: string) {
      underlying.setItem(key, value);
      if (failNextWrite) {
        failNextWrite = false;
        const error = new Error("simulated localStorage quota");
        error.name = "QuotaExceededError";
        throw error;
      }
    },
  };
  const repository = createTextAuthoringDraftRepository(storage, {
    now: () => "2026-07-29T10:00:00.000Z",
    idFactory: (prefix) => `${prefix}-quota`,
  });
  const first = documentFixture({ count: 38, title: "보존할 저장본" });
  repository.save(first);
  const previousRaw = underlying.getItem(TEXT_AUTHORING_DRAFTS_STORAGE_KEY);
  assert.ok(previousRaw);

  failNextWrite = true;
  const next = revision(first, 2, "저장되면 안 되는 변경");
  assert.throws(
    () => repository.save(next),
    (error: unknown) => {
      assert.ok(error instanceof TextAuthoringStorageWriteError);
      assert.equal(error.code, "quota_exceeded");
      assert.equal(error.previousValuePreserved, true);
      assert.ok(error.attemptedBytes > 0);
      assert.match(error.message, /previous saved value was preserved/iu);
      return true;
    },
  );

  assert.equal(
    underlying.getItem(TEXT_AUTHORING_DRAFTS_STORAGE_KEY),
    previousRaw,
  );
  assert.equal(
    repository.load(first.documentId)?.document.title,
    "보존할 저장본",
  );
});

test("corrupted persisted data fails closed and is never replaced by a save", () => {
  const corruptedRaw = "";
  const storage = createMemoryTextAuthoringStorage({
    [TEXT_AUTHORING_DRAFTS_STORAGE_KEY]: corruptedRaw,
  });
  const repository = createTextAuthoringDraftRepository(storage);

  assert.throws(
    () => repository.listRecords({ includeArchived: true }),
    (error: unknown) => {
      assert.ok(error instanceof TextAuthoringStorageReadError);
      assert.equal(error.code, "corrupted");
      assert.equal(error.existingValuePreserved, true);
      return true;
    },
  );
  assert.throws(
    () => repository.save(documentFixture({ title: "덮어쓰면 안 됨" })),
    TextAuthoringStorageReadError,
  );
  assert.equal(
    storage.getItem(TEXT_AUTHORING_DRAFTS_STORAGE_KEY),
    corruptedRaw,
  );
});

test("unknown storage schema fails closed and preserves the exact existing value", () => {
  const unknownSchemaRaw = JSON.stringify({
    schemaVersion: 99,
    drafts: {},
    recoveries: {},
  });
  const storage = createMemoryTextAuthoringStorage({
    [TEXT_AUTHORING_DRAFTS_STORAGE_KEY]: unknownSchemaRaw,
  });
  const repository = createTextAuthoringDraftRepository(storage);

  assert.throws(
    () => repository.load("missing"),
    (error: unknown) => {
      assert.ok(error instanceof TextAuthoringStorageReadError);
      assert.equal(error.code, "schema_mismatch");
      return true;
    },
  );
  assert.throws(
    () => repository.autosave(documentFixture({ title: "복구도 쓰면 안 됨" })),
    TextAuthoringStorageReadError,
  );
  assert.equal(
    storage.getItem(TEXT_AUTHORING_DRAFTS_STORAGE_KEY),
    unknownSchemaRaw,
  );
});

test("undated items remain Todo rows and never become Calendar rows", () => {
  const document = documentFixture({ count: 10, primaryArtifact: "todo" });
  const sourceSnapshot = JSON.stringify(document);
  const projection = buildAuthoringArtifactProjection(document);

  assert.equal(projection.primaryArtifact, "todo");
  assert.equal(projection.artifacts.todo.count, 10);
  assert.equal(projection.artifacts.calendar.count, 0);
  assert.equal(
    projection.artifacts.calendar.losses.filter(
      (loss) => loss.reason === "undated_item",
    ).length,
    10,
  );
  assert.equal(projection.counts.undated, 10);
  assert.equal(JSON.stringify(document), sourceSnapshot);
});

test("relative dates require an anchor before producing Calendar rows", () => {
  const document = documentFixture({
    count: 10,
    primaryArtifact: "calendar",
    schedule: (index) => ({
      kind: "relative",
      raw: `D-${10 - index}`,
      dayOffset: index - 10,
    }),
  });

  const withoutAnchor = buildAuthoringArtifactProjection(document);
  assert.equal(withoutAnchor.artifacts.calendar.count, 0);
  assert.equal(
    withoutAnchor.artifacts.calendar.losses.filter(
      (loss) => loss.reason === "relative_anchor_required",
    ).length,
    10,
  );

  document.rawText = [
    "# 상대 날짜 기준일",
    "기준일: 2030-08-15",
    ...document.parseResult.canonical.sourceRows.map((row) => row.rawText),
  ].join("\n");
  const anchored = buildAuthoringArtifactProjection(document);
  assert.equal(anchored.primaryArtifact, "calendar");
  assert.equal(anchored.artifacts.calendar.count, 10);
  assert.deepEqual(anchored.artifacts.calendar.dateRange, {
    start: "2030-08-05",
    end: "2030-08-14",
  });
});

test("sheet projections preserve K-MOOC-like 14 and LibriVox-like 38 rows", () => {
  const kmooc = buildAuthoringArtifactProjection(
    documentFixture({
      count: 14,
      title: "K-MOOC 14주",
      primaryArtifact: "sheet",
    }),
  );
  const librivox = buildAuthoringArtifactProjection(
    documentFixture({
      count: 38,
      title: "LibriVox 38장",
      primaryArtifact: "sheet",
    }),
  );

  assert.equal(kmooc.primaryArtifact, "sheet");
  assert.equal(kmooc.artifacts.sheet.count, 14);
  assert.equal(librivox.primaryArtifact, "sheet");
  assert.equal(librivox.artifacts.sheet.count, 38);
  assert.equal(librivox.artifacts.sheet.rows.at(-1)?.title, "항목 38");
  assert.ok(kmooc.secondaryArtifacts.length <= 2);
  assert.ok(librivox.secondaryArtifacts.length <= 2);
});

test("changing the primary artifact keeps other eligible results reachable", () => {
  const document = documentFixture({
    count: 5,
    primaryArtifact: "todo",
  });
  document.parseResult.canonical.items.forEach((item, index) => {
    item.detail = `항목 ${index + 1} 설명`;
    item.properties.push({
      propertyId: `${item.itemId}-place`,
      key: "place",
      label: "장소",
      value: index % 2 === 0 ? "서울" : "부산",
      sourceRowIds: [...item.sourceRowIds],
      owner: "source",
    });
  });
  const projection = buildAuthoringArtifactProjection(document, {
    primaryArtifact: "sheet",
  });

  assert.equal(projection.primaryArtifact, "sheet");
  assert.deepEqual(projection.secondaryArtifacts, ["memo", "todo"]);
  assert.deepEqual(
    projection.recommendations.map((recommendation) => recommendation.artifact),
    ["sheet", "memo", "todo"],
  );
});

test("an explicit guide or caution role overrides the earlier inferred intent", () => {
  const document = documentFixture({ count: 2, primaryArtifact: "todo" });
  document.parseResult.canonical.items[0].intent = "inspect";
  document.parseResult.canonical.items[0].role = "guide";
  document.parseResult.canonical.items[1].intent = "decide";
  document.parseResult.canonical.items[1].role = "caution";

  const projection = buildAuthoringArtifactProjection(document);

  assert.equal(projection.artifacts.todo.count, 0);
  assert.equal(projection.artifacts.memo.count, 2);
  assert.deepEqual(
    projection.artifacts.todo.losses
      .map((loss) => loss.reason)
      .filter((reason) => reason === "non_completable_role"),
    ["non_completable_role", "non_completable_role"],
  );
});

test("FlowBundle adapter preserves every canonical item ID, order, and source", () => {
  const document = documentFixture({
    count: 5,
    included: (index) => index !== 2,
    schedule: (index) =>
      index === 0
        ? {
            kind: "absolute",
            raw: "2030-08-03 08:20",
            date: "2030-08-03",
            time: "08:20",
          }
        : undefined,
  });
  const sourceSnapshot = JSON.stringify(document);
  const result = adaptTextAuthoringDocumentToFlowBundle(document);

  assert.equal(result.bundle.items.length, 5);
  assert.deepEqual(
    result.bundle.items.map((item) => item.id),
    document.parseResult.canonical.items.map((item) => item.itemId),
  );
  assert.deepEqual(
    result.bundle.items.map((item) => item.order),
    document.parseResult.canonical.items.map((item) => item.order),
  );
  assert.deepEqual(result.projectionOptions.excludedItemIds, [
    document.parseResult.canonical.items[2].itemId,
  ]);
  assert.equal(
    result.projectionOptions.itemOverrides?.[
      document.parseResult.canonical.items[0].itemId
    ]?.date,
    "2030-08-03",
  );
  assert.equal(result.lossManifest.sourcePreserved, true);
  assert.equal(JSON.stringify(document), sourceSnapshot);
});

test("whole, selected, and current-step preflights expose exact row counts", () => {
  const document = documentFixture({ count: 14, primaryArtifact: "sheet" });
  const projection = buildAuthoringArtifactProjection(document);
  const whole = buildArtifactPreflight(projection, {
    artifact: "sheet",
    scope: "whole",
  });
  const selected = buildArtifactPreflight(projection, {
    artifact: "sheet",
    scope: "selected",
    selectedItemIds: whole.itemIds.slice(0, 2),
  });
  const current = buildArtifactPreflight(projection, {
    artifact: "sheet",
    scope: "current_step",
    currentStepId: document.parseResult.canonical.steps[0].stepId,
  });

  assert.equal(whole.count, 14);
  assert.equal(selected.count, 2);
  assert.equal(current.count, 14);
  assert.equal(whole.omittedCount, 0);
});

test("raw source export is available only for the whole memo scope", () => {
  const document = documentFixture({ count: 3, primaryArtifact: "memo" });
  const projection = buildAuthoringArtifactProjection(document);
  const whole = buildArtifactPreflight(projection, {
    artifact: "memo",
    scope: "whole",
  });
  const selected = buildArtifactPreflight(projection, {
    artifact: "memo",
    scope: "selected",
    selectedItemIds: whole.itemIds.slice(0, 1),
  });
  const current = buildArtifactPreflight(projection, {
    artifact: "memo",
    scope: "current_step",
    currentStepId: document.parseResult.canonical.steps[0].stepId,
  });

  assert.equal(whole.formats.includes("raw_source"), true);
  assert.equal(selected.formats.includes("raw_source"), false);
  assert.equal(current.formats.includes("raw_source"), false);
});

test("export receipt repeats preflight identity, count, sample, range, and loss", () => {
  const document = documentFixture({ count: 14, primaryArtifact: "sheet" });
  const projection = buildAuthoringArtifactProjection(document);
  const preflight = buildArtifactPreflight(projection, {
    artifact: "sheet",
    scope: "whole",
  });
  const receipt = createExportReceipt(preflight, {
    format: "csv",
    receiptId: "export-receipt-test",
    exportedAt: "2026-07-29T11:00:00.000Z",
  });
  const saveReceipt = createSaveReceipt(document, projection, {
    receiptId: "save-receipt-test",
    savedAt: "2026-07-29T11:00:00.000Z",
  });

  assert.equal(assertPreflightReceiptParity(preflight, receipt), true);
  assert.deepEqual(checkPreflightReceiptParity(preflight, receipt), {
    matches: true,
    differences: [],
  });
  assert.equal(receipt.count, 14);
  assert.deepEqual(receipt.firstItems, preflight.firstItems);
  assert.equal(saveReceipt.itemCount, 14);
  assert.equal(saveReceipt.ownership, "creator");
  assert.throws(
    () => createExportReceipt(preflight, { format: "ics" }),
    /does not support/u,
  );
});

test("supported Markdown exports and reparses every item with explicit loss fields", () => {
  const document = documentFixture({
    count: 5,
    title: "제주 여행 개인 메모",
    schedule: (index) =>
      index === 0
        ? {
            kind: "absolute",
            raw: "2030-08-03",
            date: "2030-08-03",
          }
        : undefined,
  });
  const sourceSnapshot = JSON.stringify(document);
  const markdown = exportTextAuthoringMarkdown(document);
  const reparsed = parseSupportedTextAuthoringMarkdown(markdown);
  const receipt = checkMarkdownRoundTrip(document, {
    markdown,
    receiptId: "roundtrip-receipt-test",
    checkedAt: "2026-07-29T12:00:00.000Z",
  });

  assert.match(
    markdown,
    /^<!-- flowme:dialect=flowme-supported-markdown-v2 -->/u,
  );
  assert.equal(reparsed.items.length, 5);
  assert.equal(
    reparsed.items[0].itemId,
    document.parseResult.canonical.items[0].itemId,
  );
  assert.equal(receipt.exportedCount, 5);
  assert.equal(receipt.matchedCount, 5);
  assert.equal(receipt.changedCount, 0);
  assert.equal(receipt.unresolvedCount, 0);
  assert.deepEqual(receipt.lossFields, ["item.properties.structured_value"]);
  assert.equal(receipt.sourcePreserved, true);
  assert.equal(JSON.stringify(document), sourceSnapshot);
});

test("supported Markdown keeps canonical Item markers root-level and properties two spaces deep", () => {
  const document = createTextAuthoringDocument(
    [
      "# 항목 문법 예시",
      "## 준비",
      "- [ ] 첫 번째 항목",
      "  설명: 첫 번째 항목 설명",
      "- [ ] 두 번째 항목",
      "  설명: 두 번째 항목 설명",
    ].join("\n"),
    { now: "2026-07-29T12:00:00.000Z" },
  );

  const markdown = exportTextAuthoringMarkdown(document);
  const reparsed = parseSupportedTextAuthoringMarkdown(markdown);

  assert.match(markdown, /^- \[ \] 첫 번째 항목$/mu);
  assert.match(markdown, /^- \[ \] 두 번째 항목$/mu);
  assert.match(markdown, /^  - 설명: 첫 번째 항목 설명$/mu);
  assert.match(markdown, /^  - 설명: 두 번째 항목 설명$/mu);
  assert.deepEqual(
    reparsed.items.map(({ title, detail }) => ({ title, detail })),
    [
      { title: "첫 번째 항목", detail: "첫 번째 항목 설명" },
      { title: "두 번째 항목", detail: "두 번째 항목 설명" },
    ],
  );
});

test("v1 properties are readable while the canonical Markdown writer emits v2 bullets", () => {
  const document = createTextAuthoringDocument(
    [
      "# v1 호환",
      "기준일: 2026-08-10",
      "## 준비",
      "- [ ] 장소 확인",
      "  설명: 예약 가능 여부를 확인합니다.",
      "  상대 날짜: D-3",
      "  자료: [장소 안내](https://example.com/place)",
    ].join("\n"),
    { now: "2026-08-04T00:00:00.000Z" },
  );

  const markdown = exportTextAuthoringMarkdown(document);
  const reparsed = parseSupportedTextAuthoringMarkdown(markdown);

  assert.match(
    markdown,
    /^<!-- flowme:dialect=flowme-supported-markdown-v2 -->/u,
  );
  assert.match(markdown, /^- 기준일: 2026-08-10$/mu);
  assert.match(markdown, /^  - 설명: 예약 가능 여부를 확인합니다\.$/mu);
  assert.match(markdown, /^  - 상대 날짜: D-3$/mu);
  assert.match(
    markdown,
    /^  - 자료: \[장소 안내\]\(https:\/\/example\.com\/place\)$/mu,
  );
  assert.deepEqual(
    reparsed.items.map(({ title, detail, scheduleRaw, resources }) => ({
      title,
      detail,
      scheduleRaw,
      resources,
    })),
    [
      {
        title: "장소 확인",
        detail: "예약 가능 여부를 확인합니다.",
        scheduleRaw: "D-3",
        resources: [{ label: "장소 안내", url: "https://example.com/place" }],
      },
    ],
  );
});

test("Markdown writer never promotes a hidden schedule anchor into the source Flow anchor", () => {
  const document = createTextAuthoringDocument(
    ["# 기준일 경계", "## 준비", "- [ ] 장소 확인", "  - 상대 날짜: D-3"].join(
      "\n",
    ),
    { now: "2026-08-04T00:00:00.000Z" },
  );
  const [item] = document.parseResult.canonical.items;
  assert.equal(item.schedule?.kind, "relative");
  if (item.schedule?.kind === "relative") {
    item.schedule = { ...item.schedule, anchorLabel: "2026-08-10" };
  }

  const markdown = exportTextAuthoringMarkdown(document);

  assert.doesNotMatch(markdown, /^- 기준일:/mu);
  assert.match(markdown, /^  - 상대 날짜: D-3$/mu);
});

test("Markdown round-trip preserves one-level Todo subchecks without flattening them into Items", () => {
  const document = createTextAuthoringDocument(
    [
      "# 이전 들여쓰기 입력",
      "## 준비",
      "- [ ] 첫 번째 항목",
      "  - [ ] 들여쓴 이전 항목",
    ].join("\n"),
    { importAssist: true, now: "2026-07-29T12:00:00.000Z" },
  );
  const markdown = exportTextAuthoringMarkdown(document);
  const receipt = checkMarkdownRoundTrip(document, {
    markdown,
    receiptId: "nesting-loss-receipt",
    checkedAt: "2026-07-29T12:05:00.000Z",
  });

  assert.deepEqual(
    document.parseResult.canonical.items.map((item) => item.nestingLevel),
    [0],
  );
  assert.deepEqual(
    document.parseResult.canonical.items[0].subchecks?.map((subcheck) => ({
      title: subcheck.title,
      sourceChecked: subcheck.sourceChecked,
    })),
    [{ title: "들여쓴 이전 항목", sourceChecked: false }],
  );
  assert.match(markdown, /^  - \[ \] 들여쓴 이전 항목$/mu);
  assert.doesNotMatch(markdown, /^- \[ \] 들여쓴 이전 항목$/mu);
  assert.equal(receipt.lossFields.includes("item.nestingLevel"), false);
  assert.equal(receipt.unresolvedCount, 0);
});

test("canonical Markdown stays equivalent when the actual input parser reads it again", () => {
  const document = createTextAuthoringDocument(
    [
      "# 작성 문법 v1",
      "기준일: 행사일",
      "출처: [원문](https://example.com/source)",
      "",
      "## 첫 번째 단계",
      "- [ ] 첫 번째 항목",
      "  설명: 실행 방법",
      "  완료 기준: 완료 상태를 기록함",
      "  날짜: 2030-08-03",
      "  시간: 09:00",
      "  시간대: Asia/Seoul",
      "  소요 시간: 30분",
      "  반복: 매주 월요일",
      "  장소: 장소 이름",
      "  조건: 운영일에만 실행",
      "  자료: [참고 자료](https://example.com/resource)",
      "  안내: 안내 문구",
      "  주의: 주의 문구",
      "  출처: [항목 원문](https://example.com/item-source)",
      "- [ ] 두 번째 항목",
      "  상대 날짜: D-3",
    ].join("\n"),
    { now: "2026-07-29T12:00:00.000Z" },
  );
  const markdown = exportTextAuthoringMarkdown(document);
  const visibleMarkdown = markdown.replace(
    /^[ \t]*<!--\s*flowme:.*-->[ \t]*\r?\n?/gmu,
    "",
  );
  const reparsed = createTextAuthoringDocument(visibleMarkdown, {
    now: "2026-07-29T12:05:00.000Z",
  });
  const [first, second] = reparsed.parseResult.canonical.items;

  assert.match(markdown, /\n  - 설명: 실행 방법\n/u);
  assert.match(markdown, /\n  - 상대 날짜: D-3\n/u);
  assert.doesNotMatch(markdown, /\n  상세:/u);
  assert.doesNotMatch(markdown, /\n  날짜: D-3/u);
  assert.equal(reparsed.title, "작성 문법 v1");
  assert.deepEqual(
    reparsed.parseResult.canonical.steps.map((step) => step.title),
    ["첫 번째 단계"],
  );
  assert.deepEqual(
    reparsed.parseResult.canonical.items.map((item) => item.title),
    ["첫 번째 항목", "두 번째 항목"],
  );
  assert.equal(first.detail, "실행 방법");
  assert.equal(first.completion?.doneWhen, "완료 상태를 기록함");
  assert.deepEqual(first.schedule, {
    kind: "absolute",
    raw: "2030-08-03",
    date: "2030-08-03",
    time: "09:00",
    timezone: "Asia/Seoul",
    durationMinutes: 30,
    repeat: "매주 월요일",
  });
  assert.equal(
    first.properties.find((property) => property.key === "place")?.value,
    "장소 이름",
  );
  assert.equal(
    first.properties.find((property) => property.key === "condition")?.value,
    "운영일에만 실행",
  );
  assert.deepEqual(
    first.resources.map(({ label, url }) => ({ label, url })),
    [{ label: "참고 자료", url: "https://example.com/resource" }],
  );
  assert.deepEqual(
    first.sources.map(({ label, url }) => ({ label, url })),
    [{ label: "항목 원문", url: "https://example.com/item-source" }],
  );
  assert.deepEqual(first.guides, ["안내 문구"]);
  assert.deepEqual(first.cautions, ["주의 문구"]);
  assert.equal(second.schedule?.kind, "relative");
  assert.equal(
    second.schedule?.kind === "relative"
      ? second.schedule.dayOffset
      : undefined,
    -3,
  );
  assert.equal(reparsed.parseResult.issues.length, 0);
});

test("Markdown round-trip flags changed Flow and Step titles plus extra Items", () => {
  const document = documentFixture({
    count: 2,
    title: "원래 Flow",
  });
  const markdown = exportTextAuthoringMarkdown(document)
    .replace("# 원래 Flow", "# 바뀐 Flow")
    .replace("## 기본 Step", "## 바뀐 Step")
    .concat("\n- [ ] 추가된 항목\n");
  const receipt = checkMarkdownRoundTrip(document, {
    markdown,
    receiptId: "changed-structure-receipt",
    checkedAt: "2026-07-29T12:00:00.000Z",
  });

  assert.ok(receipt.changedCount >= 2);
  assert.ok(receipt.unresolvedCount >= 3);
  assert.equal(receipt.sourcePreserved, false);
});

test("Markdown round-trip preserves source checkbox state without creating execution state", () => {
  const document = createTextAuthoringDocument(
    ["# 체크 상태", "## 실행", "- [x] 원문 완료", "- [ ] 원문 미완료"].join(
      "\n",
    ),
    { now: "2026-08-04T00:00:00.000Z" },
  );
  const markdown = exportTextAuthoringMarkdown(document);
  const supported = parseSupportedTextAuthoringMarkdown(markdown);
  const receipt = checkMarkdownRoundTrip(document, {
    markdown,
    checkedAt: "2026-08-04T00:01:00.000Z",
  });
  const reparsed = createTextAuthoringDocument(markdown, {
    documentId: document.documentId,
    now: "2026-08-04T00:02:00.000Z",
  });

  assert.match(markdown, /- \[x\] 원문 완료/u);
  assert.match(markdown, /- \[ \] 원문 미완료/u);
  assert.deepEqual(
    supported.items.map((item) => item.sourceChecked),
    [true, false],
  );
  assert.deepEqual(
    reparsed.parseResult.canonical.items.map((item) => item.sourceChecked),
    [true, false],
  );
  assert.equal(receipt.changedCount, 0);
  assert.equal(receipt.unresolvedCount, 0);
});
