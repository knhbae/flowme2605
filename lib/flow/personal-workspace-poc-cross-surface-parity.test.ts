import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG,
  PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG_VERSION,
  listPersonalWorkspacePocAuthoringNearMissTargets,
  locatePersonalWorkspacePocAuthoringPropertyValue,
  planPersonalWorkspacePocAuthoringNearMissRepair,
  planPersonalWorkspacePocAuthoringPropertyBatchEdit,
  planPersonalWorkspacePocAuthoringPropertyEdit,
  undoPersonalWorkspacePocAuthoringSourceTransaction,
} from './personal-workspace-poc-authoring-properties';
import { fingerprintPersonalWorkspacePocAuthoringSource } from './personal-workspace-poc-authoring';
import {
  PERSONAL_WORKSPACE_POC_RESULT_PROJECTION_FIXTURE_RAW_TEXT,
  createPersonalWorkspacePocResultProjectionFixture,
} from './personal-workspace-poc-result-projection.fixture';
import {
  PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT_VERSION,
  PERSONAL_WORKSPACE_POC_RESULT_PROJECTION_VERSION,
  PERSONAL_WORKSPACE_POC_RESULT_SLOT_ORDER,
  buildPersonalWorkspacePocResultDownloads,
  buildPersonalWorkspacePocResultProjection,
} from './personal-workspace-poc-result-projection';
import {
  PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_VERSION,
  analyzePersonalWorkspacePocLosslessAuthoring,
} from './personal-workspace-poc-lossless-authoring';
import { PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_CORPUS } from './personal-workspace-poc-lossless-authoring.fixtures';

type SourceOutcome = Readonly<{
  status: string;
  reason?: string;
  mutationCount: number;
  rawText?: string;
  nextRawText?: string;
  selection?: Readonly<{ start: number; end: number }>;
  transaction?: Readonly<{
    kind?: string;
    beforeRawText: string;
    afterRawText: string;
    changes?: readonly unknown[];
  }>;
}>;

type StandaloneModel = Readonly<{
  RESULT_PROJECTION_VERSION: number;
  RESULT_DOWNLOAD_CONTRACT_VERSION: number;
  LOSSLESS_AUTHORING_VERSION: number;
  AUTHORING_PROPERTY_CATALOG_VERSION: number;
  AUTHORING_PROPERTY_CATALOG: readonly Readonly<{
    key: string;
    writeSupport: 'editable' | 'blocked';
  }>[];
  fingerprint(rawText: string): string;
  locateAuthoringPropertyValue(input: Readonly<{
    rawText: string;
    expectedSourceFingerprint: string;
    itemSourceLine: number;
    key: string;
    propertySourceLine?: number;
  }>): SourceOutcome & Readonly<{ rawValue?: string }>;
  planAuthoringPropertyEdit(input: Readonly<{
    intent: 'apply' | 'cancel';
    rawText: string;
    expectedSourceFingerprint: string;
    itemSourceLine: number;
    key: string;
    value: string;
  }>): SourceOutcome;
  planAuthoringPropertyBatchEdit(input: Readonly<{
    intent: 'apply' | 'cancel';
    rawText: string;
    expectedSourceFingerprint: string;
    itemSourceLine: number;
    updates: readonly Readonly<{ key: string; value: string }>[];
  }>): SourceOutcome;
  listAuthoringNearMissTargets(rawText: string): readonly Readonly<{
    targetId: string;
    sourceFingerprint: string;
    sourceLine: number;
    title: string;
    prefixRange: Readonly<{ from: number; to: number }>;
  }>[];
  planAuthoringNearMissRepair(input: Readonly<{
    intent: 'apply' | 'cancel';
    rawText: string;
    expectedSourceFingerprint: string;
    targetId: string;
  }>): SourceOutcome;
  analyzeLosslessAuthoring(rawText: string): Readonly<{
    version: number;
    status: string;
    rawText: string;
    lineEndings: string;
    projection: Readonly<{
      kind: string;
      headers: readonly string[];
      rows: readonly Readonly<{ cells: readonly Readonly<{ value: string }>[] }>[];
      generatedItemCount: number;
      generatedTodoCount: number;
      generatedCalendarCount: number;
    }>;
    fallback: Readonly<{ active: boolean; rawText: string }>;
    sourceMutationCount: number;
    sourcePreserved: boolean;
  }>;
  buildResultDownloads(
    title: string,
    savedCopyId: string,
    itemRefs: readonly string[],
    txt: string,
    sheetRows: readonly Record<string, unknown>[],
  ): Readonly<{
    version: number;
    txt: Readonly<{ filename: string; payload: string }>;
    csv: Readonly<{ filename: string; payload: string }>;
    sourceMutationCount: number;
  }>;
  resultMonthCells(
    month: string,
    selectedDate: string,
    items: readonly Readonly<{
      ref: string;
      executionDate: string | null;
      completed: boolean;
      contextOrder: number;
      planOrder: number;
      timelinePolicy: 'auto' | 'included' | 'excluded';
    }>[],
  ): readonly Readonly<{
    date?: string;
    itemRefs: readonly string[];
    completedCount: number;
  }>[];
  authoringResultProjection(rawText: string, options?: Readonly<{ baseDate?: string; selectedDate?: string }>): Readonly<{
    contractVersion: number;
    flowRef: string;
    itemRefs: readonly string[];
    txt: string;
    calendar: Readonly<{
      cells: readonly unknown[];
      weekCount: number;
      datePolicy: string;
      weekStartsOn: string;
    }>;
    downloads: Readonly<{
      version: number;
      txt: Readonly<{ filename: string; payload: string }>;
      csv: Readonly<{ filename: string; payload: string }>;
      sourceMutationCount: number;
    }>;
    slots: Readonly<Record<string, Readonly<{ itemRefs: readonly string[] }>>>;
  }>;
}>;

// model.js is intentionally CommonJS so the downloadable single-file HTML and
// Node contract test execute the same implementation. This test-only adapter
// keeps that packaging difference out of both production models.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const standalone = require('../../docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/model.js') as StandaloneModel;

const BASE_SOURCE = [
  '# 여행',
  '## 준비',
  '- [ ] 체크인',
  '  - 장소: 공항',
].join('\n');

function reactFingerprint(rawText: string): string {
  return fingerprintPersonalWorkspacePocAuthoringSource(rawText);
}

function normalizeSourceOutcome(result: SourceOutcome) {
  return {
    status: result.status,
    reason: result.reason ?? null,
    mutationCount: result.mutationCount,
    exactRawText: result.nextRawText ?? result.rawText,
  };
}

function runPropertyEditPair(input: Readonly<{
  intent: 'apply' | 'cancel';
  rawText?: string;
  key: string;
  value: string;
}>) {
  const rawText = input.rawText ?? BASE_SOURCE;
  const shared = {
    intent: input.intent,
    rawText,
    itemSourceLine: 3,
    key: input.key,
    value: input.value,
  } as const;
  return {
    react: planPersonalWorkspacePocAuthoringPropertyEdit({
      ...shared,
      expectedSourceFingerprint: reactFingerprint(rawText),
    }),
    standalone: standalone.planAuthoringPropertyEdit({
      ...shared,
      expectedSourceFingerprint: standalone.fingerprint(rawText),
    }),
  };
}

function semanticNearMissTarget(target: Readonly<{
  sourceLine: number;
  title: string;
  prefixRange: Readonly<{ from: number; to: number }>;
}>) {
  // Target IDs and source fingerprints use surface-local hash encodings. The
  // source line, visible title and exact replacement range are the shared API.
  return {
    sourceLine: target.sourceLine,
    title: target.title,
    prefixRange: target.prefixRange,
  };
}

function undoStandaloneTransaction(
  rawText: string,
  transaction: NonNullable<SourceOutcome['transaction']>,
) {
  // Standalone applies authoring edits through the browser's native undo stack;
  // its pure model exposes before/after bytes but no exported undo function.
  // This narrow adapter verifies the same guarded one-step byte restoration.
  if (rawText !== transaction.afterRawText) {
    return { status: 'blocked', reason: 'stale-source', rawText, mutationCount: 0 } as const;
  }
  return {
    status: 'undone',
    nextRawText: transaction.beforeRawText,
    mutationCount: 1,
  } as const;
}

function assertTripleIdentity(flowRef: string, itemRefs: readonly string[]) {
  const flowMatch = /^saved-flow:([^:]+):([^:]+)$/u.exec(flowRef);
  assert.ok(flowMatch, `invalid saved Flow ref: ${flowRef}`);
  for (const itemRef of itemRefs) {
    const itemMatch = /^flow-item:([^:]+):([^:]+):([^:]+)$/u.exec(itemRef);
    assert.ok(itemMatch, `invalid Flow Item ref: ${itemRef}`);
    assert.equal(itemMatch[1], flowMatch[1]);
    assert.equal(itemMatch[2], flowMatch[2]);
  }
}

test('React and standalone expose the same ordered 16-property editability contract', () => {
  assert.equal(PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG_VERSION, 2);
  assert.equal(standalone.AUTHORING_PROPERTY_CATALOG_VERSION, 2);
  const reactCatalog = PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG.map(
    ({ key, writeSupport }) => ({ key, writeSupport }),
  );
  const standaloneCatalog = standalone.AUTHORING_PROPERTY_CATALOG.map(
    ({ key, writeSupport }) => ({ key, writeSupport }),
  );
  assert.equal(reactCatalog.length, 16);
  assert.deepEqual(standaloneCatalog, reactCatalog);
  assert.equal(reactCatalog.every(({ writeSupport }) => writeSupport === 'editable'), true);
});

test('dependent property pairs are one guarded source change and preserve exact parity', () => {
  for (const updates of [
    [{ key: 'time', value: '09:30' }, { key: 'timezone', value: 'Asia/Seoul' }],
    [{ key: 'repeat', value: '매주 월, 수' }, { key: 'repeatEnd', value: '10회' }],
  ] as const) {
    const react = planPersonalWorkspacePocAuthoringPropertyBatchEdit({
      intent: 'apply',
      rawText: BASE_SOURCE,
      expectedSourceFingerprint: reactFingerprint(BASE_SOURCE),
      itemSourceLine: 3,
      updates,
    });
    const local = standalone.planAuthoringPropertyBatchEdit({
      intent: 'apply',
      rawText: BASE_SOURCE,
      expectedSourceFingerprint: standalone.fingerprint(BASE_SOURCE),
      itemSourceLine: 3,
      updates,
    });
    assert.deepEqual(normalizeSourceOutcome(local), normalizeSourceOutcome(react));
    assert.equal(react.status, 'applied');
    assert.equal(local.status, 'applied');
    if (react.status !== 'applied' || local.status !== 'applied') continue;
    assert.equal(react.transaction.changes.length, 1);
    assert.equal(local.transaction?.changes?.length, 1);
    assert.equal(react.transaction.kind, 'property-batch-edit');
    assert.equal(local.transaction?.kind, 'property-batch-edit');
  }
});

test('property location, no-op, cancel, time insertion and dependency failures preserve exact source parity', () => {
  const reactLocation = locatePersonalWorkspacePocAuthoringPropertyValue({
    rawText: BASE_SOURCE,
    expectedSourceFingerprint: reactFingerprint(BASE_SOURCE),
    itemSourceLine: 3,
    key: 'place',
  });
  const standaloneLocation = standalone.locateAuthoringPropertyValue({
    rawText: BASE_SOURCE,
    expectedSourceFingerprint: standalone.fingerprint(BASE_SOURCE),
    itemSourceLine: 3,
    key: 'place',
  });
  assert.equal(reactLocation.status, 'located');
  assert.equal(standaloneLocation.status, 'located');
  if (reactLocation.status !== 'located' || standaloneLocation.status !== 'located') return;
  assert.deepEqual(
    {
      rawValue: standaloneLocation.rawValue,
      selection: standaloneLocation.selection,
      mutationCount: standaloneLocation.mutationCount,
    },
    {
      rawValue: reactLocation.rawValue,
      selection: reactLocation.selection,
      mutationCount: reactLocation.mutationCount,
    },
  );
  assert.equal(BASE_SOURCE.slice(reactLocation.selection.start, reactLocation.selection.end), '공항');

  const cases = [
    {
      label: 'same value',
      input: { intent: 'apply' as const, key: 'place', value: '공항' },
      expected: { status: 'no-op', reason: null, mutationCount: 0, exactRawText: BASE_SOURCE },
    },
    {
      label: 'cancel',
      input: { intent: 'cancel' as const, key: 'place', value: '서울역' },
      expected: { status: 'cancelled', reason: null, mutationCount: 0, exactRawText: BASE_SOURCE },
    },
    {
      label: 'native time insertion',
      input: { intent: 'apply' as const, key: 'time', value: '09:30' },
      expected: {
        status: 'applied',
        reason: null,
        mutationCount: 1,
        exactRawText: `${BASE_SOURCE}\n  - 시간: 09:30`,
      },
    },
    {
      label: 'timezone missing time dependency',
      input: { intent: 'apply' as const, key: 'timezone', value: 'Asia/Seoul' },
      expected: {
        status: 'blocked',
        reason: 'missing-dependency',
        mutationCount: 0,
        exactRawText: BASE_SOURCE,
      },
    },
    {
      label: 'invalid native time',
      input: { intent: 'apply' as const, key: 'time', value: '25:00' },
      expected: {
        status: 'blocked',
        reason: 'invalid-value',
        mutationCount: 0,
        exactRawText: BASE_SOURCE,
      },
    },
  ];

  for (const scenario of cases) {
    const pair = runPropertyEditPair(scenario.input);
    assert.deepEqual(normalizeSourceOutcome(pair.standalone), normalizeSourceOutcome(pair.react), scenario.label);
    assert.deepEqual(normalizeSourceOutcome(pair.react), scenario.expected, scenario.label);
    if (pair.react.status === 'applied' && pair.standalone.status === 'applied') {
      assert.deepEqual(pair.standalone.selection, pair.react.selection, `${scenario.label} selection`);
    }
  }

  const timePair = runPropertyEditPair({ intent: 'apply', key: 'time', value: '09:30' });
  assert.equal(timePair.react.status, 'applied');
  assert.equal(timePair.standalone.status, 'applied');
  if (timePair.react.status !== 'applied' || timePair.standalone.status !== 'applied') return;
  const timezonePair = runPropertyEditPair({
    intent: 'apply',
    rawText: timePair.react.nextRawText,
    key: 'timezone',
    value: 'Asia/Seoul',
  });
  assert.deepEqual(normalizeSourceOutcome(timezonePair.standalone), normalizeSourceOutcome(timezonePair.react));
  assert.equal(
    normalizeSourceOutcome(timezonePair.react).exactRawText,
    `${BASE_SOURCE}\n  - 시간: 09:30\n  - 시간대: Asia/Seoul`,
  );
});

test('near-miss target, explicit repair and one-step undo preserve the same exact source bytes', () => {
  const rawText = [
    '# 체크',
    '-[] 빠진 공백',
    '```',
    '-[] 코드 예시',
    '```',
    '- [ ] 정상 항목',
  ].join('\n');
  const reactTargets = listPersonalWorkspacePocAuthoringNearMissTargets(rawText);
  const standaloneTargets = standalone.listAuthoringNearMissTargets(rawText);
  assert.equal(reactTargets.length, 1);
  assert.equal(standaloneTargets.length, 1);
  assert.deepEqual(
    standaloneTargets.map(semanticNearMissTarget),
    reactTargets.map(semanticNearMissTarget),
  );

  const reactRepair = planPersonalWorkspacePocAuthoringNearMissRepair({
    intent: 'apply',
    rawText,
    expectedSourceFingerprint: reactFingerprint(rawText),
    targetId: reactTargets[0].targetId,
  });
  const standaloneRepair = standalone.planAuthoringNearMissRepair({
    intent: 'apply',
    rawText,
    expectedSourceFingerprint: standalone.fingerprint(rawText),
    targetId: standaloneTargets[0].targetId,
  });
  assert.deepEqual(normalizeSourceOutcome(standaloneRepair), normalizeSourceOutcome(reactRepair));
  assert.equal(reactRepair.status, 'repaired');
  assert.equal(standaloneRepair.status, 'repaired');
  if (
    reactRepair.status !== 'repaired'
    || standaloneRepair.status !== 'repaired'
    || !standaloneRepair.transaction
  ) return;
  const repairedSource = [
    '# 체크',
    '- [ ] 빠진 공백',
    '```',
    '-[] 코드 예시',
    '```',
    '- [ ] 정상 항목',
  ].join('\n');
  assert.equal(reactRepair.nextRawText, repairedSource);
  assert.equal(standaloneRepair.nextRawText, repairedSource);
  assert.deepEqual(standaloneRepair.selection, reactRepair.selection);

  const reactUndo = undoPersonalWorkspacePocAuthoringSourceTransaction({
    intent: 'undo',
    rawText: reactRepair.nextRawText,
    transaction: reactRepair.transaction,
  });
  const standaloneUndo = undoStandaloneTransaction(
    standaloneRepair.nextRawText,
    standaloneRepair.transaction,
  );
  assert.equal(reactUndo.status, 'undone');
  assert.equal(standaloneUndo.status, 'undone');
  if (reactUndo.status !== 'undone' || standaloneUndo.status !== 'undone') return;
  assert.equal(reactUndo.mutationCount, 1);
  assert.equal(standaloneUndo.mutationCount, 1);
  assert.equal(reactUndo.nextRawText, rawText);
  assert.equal(standaloneUndo.nextRawText, rawText);
});

test('result contract v3 keeps fixed TXT/todo/calendar/sheet slots and source identities on both surfaces', () => {
  const fixture = createPersonalWorkspacePocResultProjectionFixture();
  const reactResult = buildPersonalWorkspacePocResultProjection({
    model: fixture.model,
    state: fixture.state,
    flowRef: fixture.flowRef,
    localToday: fixture.localToday,
    selectedDate: fixture.selectedDate,
  });
  assert.equal(reactResult.ok, true);
  if (!reactResult.ok) return;
  const reactProjection = reactResult.projection;
  const standaloneProjection = standalone.authoringResultProjection(
    PERSONAL_WORKSPACE_POC_RESULT_PROJECTION_FIXTURE_RAW_TEXT,
  );

  assert.equal(PERSONAL_WORKSPACE_POC_RESULT_PROJECTION_VERSION, 3);
  assert.equal(reactProjection.version, 3);
  assert.equal(standalone.RESULT_PROJECTION_VERSION, 3);
  assert.equal(standaloneProjection.contractVersion, 3);

  // React calls the canonical text projection `text`; the user-facing copy
  // slot is TXT. Standalone names that same fixed user-facing slot `txt`.
  const reactUserFacingSlots = PERSONAL_WORKSPACE_POC_RESULT_SLOT_ORDER.map(
    (slot) => (slot === 'text' ? 'txt' : slot),
  );
  assert.deepEqual(reactUserFacingSlots, ['txt', 'todo', 'calendar', 'sheet']);
  assert.deepEqual(Object.keys(standaloneProjection.slots), reactUserFacingSlots);

  assert.deepEqual(reactProjection.text.itemRefs, reactProjection.itemRefs);
  assert.deepEqual(reactProjection.todo.itemRefs, reactProjection.itemRefs);
  assert.deepEqual(reactProjection.calendar.itemRefs, reactProjection.itemRefs);
  assert.deepEqual(reactProjection.sheet.itemRefs, reactProjection.itemRefs);
  assert.deepEqual(reactProjection.txt.itemRefs, reactProjection.itemRefs);
  for (const slot of Object.values(standaloneProjection.slots)) {
    assert.deepEqual(slot.itemRefs, standaloneProjection.itemRefs);
  }

  assertTripleIdentity(reactProjection.flowRef, reactProjection.itemRefs);
  assertTripleIdentity(standaloneProjection.flowRef, standaloneProjection.itemRefs);
  assert.equal(reactProjection.calendar.cells.length, 42);
  assert.equal(reactProjection.calendar.weekCount, 6);
  assert.equal(standaloneProjection.calendar.cells.length, 42);
  assert.equal(standaloneProjection.calendar.weekCount, 6);
  assert.equal(standaloneProjection.calendar.datePolicy, reactProjection.calendar.datePolicy);
  assert.equal(standaloneProjection.calendar.weekStartsOn, reactProjection.calendar.weekStartsOn);
});

test('React and standalone month cells share context order and omit timeline-hidden Items', () => {
  const fixture = createPersonalWorkspacePocResultProjectionFixture();
  const [firstRef, secondRef] = fixture.itemRefs;
  fixture.state.placements[secondRef] = {
    itemRef: secondRef,
    scheduleMode: 'fixed_date',
    date: '2026-09-11',
    timelinePolicy: 'included',
  };
  fixture.state.timelineOrders = [{
    context: 'date',
    contextKey: '2026-09-11',
    orderedRefKeys: [secondRef, firstRef],
    revision: 1,
  }];

  const buildPair = () => {
    const react = buildPersonalWorkspacePocResultProjection({
      model: fixture.model,
      state: fixture.state,
      flowRef: fixture.flowRef,
      localToday: fixture.localToday,
      baseDate: '2026-09-11',
      selectedDate: '2026-09-11',
    });
    assert.equal(react.ok, true);
    if (!react.ok) return null;
    const local = standalone.resultMonthCells(
      '2026-09',
      '2026-09-11',
      react.projection.items.map((item) => ({
        ref: item.ref,
        executionDate: item.effectiveDate ?? null,
        completed: item.completed,
        contextOrder: item.contextOrder,
        planOrder: item.planOrder,
        timelinePolicy: item.timelinePolicy,
      })),
    );
    return { react: react.projection, local };
  };

  const ordered = buildPair();
  assert.ok(ordered);
  if (!ordered) return;
  const reactDay = ordered.react.calendar.cells.find((cell) => cell.date === '2026-09-11');
  const localDay = ordered.local.find((cell) => cell.date === '2026-09-11');
  assert.deepEqual(reactDay?.itemRefs, [secondRef, firstRef]);
  assert.deepEqual(localDay?.itemRefs, reactDay?.itemRefs);
  assert.equal(localDay?.completedCount, reactDay?.completedCount);

  fixture.state.placements[firstRef] = {
    itemRef: firstRef,
    scheduleMode: 'fixed_date',
    date: '2026-09-11',
    time: '09:30',
    timelinePolicy: 'excluded',
  };
  const hidden = buildPair();
  assert.ok(hidden);
  if (!hidden) return;
  const hiddenReactDay = hidden.react.calendar.cells.find((cell) => cell.date === '2026-09-11');
  const hiddenLocalDay = hidden.local.find((cell) => cell.date === '2026-09-11');
  assert.deepEqual(hiddenReactDay?.itemRefs, [secondRef]);
  assert.deepEqual(hiddenLocalDay?.itemRefs, hiddenReactDay?.itemRefs);
});

test('React and standalone create byte-identical local TXT and CSV files from one semantic result', () => {
  const fixture = createPersonalWorkspacePocResultProjectionFixture();
  const result = buildPersonalWorkspacePocResultProjection({
    model: fixture.model,
    state: fixture.state,
    flowRef: fixture.flowRef,
    localToday: fixture.localToday,
    selectedDate: fixture.selectedDate,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const projection = result.projection;
  const reactDownloads = buildPersonalWorkspacePocResultDownloads({
    title: projection.title,
    savedCopyId: projection.source.savedCopyId,
    txt: projection.txt,
    sheet: projection.sheet,
  });
  const standaloneRows = projection.sheet.rows.map((row) => ({
    ...row.values,
    statusCode: row.values.status,
  }));
  const standaloneDownloads = standalone.buildResultDownloads(
    projection.title,
    projection.source.savedCopyId,
    projection.itemRefs,
    projection.txt.normalizedText,
    standaloneRows,
  );

  assert.equal(PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT_VERSION, 2);
  assert.equal(standalone.RESULT_DOWNLOAD_CONTRACT_VERSION, 2);
  assert.equal(reactDownloads.version, standaloneDownloads.version);
  assert.equal(standaloneDownloads.txt.filename, reactDownloads.txt.filename);
  assert.equal(standaloneDownloads.txt.payload, reactDownloads.txt.payload);
  assert.equal(standaloneDownloads.csv.filename, reactDownloads.csv.filename);
  assert.equal(standaloneDownloads.csv.payload, reactDownloads.csv.payload);
  assert.equal(reactDownloads.sourceMutationCount, 0);
  assert.equal(standaloneDownloads.sourceMutationCount, 0);

  const dirtyTxt = '첫 줄\r\n둘째 줄\r마지막 줄\n\n';
  const reactDirtyDownloads = buildPersonalWorkspacePocResultDownloads({
    title: projection.title,
    savedCopyId: projection.source.savedCopyId,
    txt: { ...projection.txt, normalizedText: dirtyTxt },
    sheet: projection.sheet,
  });
  const standaloneDirtyDownloads = standalone.buildResultDownloads(
    projection.title,
    projection.source.savedCopyId,
    projection.itemRefs,
    dirtyTxt,
    standaloneRows,
  );
  assert.equal(reactDirtyDownloads.txt.payload, '첫 줄\n둘째 줄\n마지막 줄\n');
  assert.equal(standaloneDirtyDownloads.txt.payload, reactDirtyDownloads.txt.payload);
});

test('the canonical 31-case lossless corpus has the same safe projection or raw fallback on both surfaces', () => {
  assert.equal(PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_VERSION, 1);
  assert.equal(standalone.LOSSLESS_AUTHORING_VERSION, 1);
  assert.equal(PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_CORPUS.length, 31);
  for (const corpusCase of PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_CORPUS) {
    const react = analyzePersonalWorkspacePocLosslessAuthoring(corpusCase.rawText);
    const local = standalone.analyzeLosslessAuthoring(corpusCase.rawText);
    assert.equal(local.status, react.status, corpusCase.caseId);
    assert.equal(local.rawText, react.rawText, corpusCase.caseId);
    assert.equal(local.lineEndings, react.lineEndings, corpusCase.caseId);
    assert.equal(local.projection.kind, react.projection.kind, corpusCase.caseId);
    assert.deepEqual(local.projection.headers, react.projection.headers, corpusCase.caseId);
    assert.deepEqual(
      local.projection.rows.map((row) => row.cells.map((cell) => cell.value)),
      react.projection.rows.map((row) => row.cells.map((cell) => cell.value)),
      corpusCase.caseId,
    );
    assert.equal(local.projection.generatedItemCount, 0, corpusCase.caseId);
    assert.equal(local.projection.generatedTodoCount, 0, corpusCase.caseId);
    assert.equal(local.projection.generatedCalendarCount, 0, corpusCase.caseId);
    assert.equal(local.fallback.active, react.fallback.active, corpusCase.caseId);
    assert.equal(local.fallback.rawText, corpusCase.rawText, corpusCase.caseId);
    assert.equal(local.sourceMutationCount, 0, corpusCase.caseId);
    assert.equal(local.sourcePreserved, true, corpusCase.caseId);
  }
});

test('unsafe table-shaped source falls back to exact raw text on both surfaces', () => {
  for (const rawText of [
    '열1,열2\n1,"닫히지 않음',
    '열1,열2\n1,=SUM(A1)',
    '| 열1 | 열2 |\n| --- | --- |',
  ]) {
    const react = analyzePersonalWorkspacePocLosslessAuthoring(rawText);
    const local = standalone.analyzeLosslessAuthoring(rawText);
    assert.equal(react.status, 'raw-fallback');
    assert.equal(local.status, 'raw-fallback');
    assert.equal(local.rawText, rawText);
    assert.equal(local.fallback.rawText, rawText);
    assert.equal(local.sourceMutationCount, 0);
  }
});
