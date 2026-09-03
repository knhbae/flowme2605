import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_VERSION,
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocAuthoredFlow,
  type PersonalWorkspacePocFlowItem,
  type PersonalWorkspacePocFlowItemFieldOwnership,
  type PersonalWorkspacePocReadModel,
} from './personal-workspace-poc-contract';
import {
  PERSONAL_WORKSPACE_POC_RESULT_PROJECTION_FIXTURE_RAW_TEXT,
  createPersonalWorkspacePocResultProjectionFixture,
} from './personal-workspace-poc-result-projection.fixture';
import {
  PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT,
  PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT_VERSION,
  PERSONAL_WORKSPACE_POC_RESULT_SHEET_COLUMNS,
  PERSONAL_WORKSPACE_POC_RESULT_SLOT_ORDER,
  buildPersonalWorkspacePocResultDownloads,
  buildPersonalWorkspacePocResultProjection,
  selectPersonalWorkspacePocResultFlow,
  type PersonalWorkspacePocResultNavigationState,
} from './personal-workspace-poc-result-projection';
import { createPersonalWorkspacePocState } from './personal-workspace-poc-state';
import { applyPersonalWorkspacePocTransition } from './personal-workspace-poc-state';
import { materializePersonalWorkspacePocAuthoring } from './personal-workspace-poc-authoring';

const NOW = '2026-09-02T00:00:00.000Z';
const SAVED_COPY_ID = 'projection-copy';
const FLOW_ID = 'projection-flow';
const FLOW_REF = toPersonalWorkspacePocFlowRef(SAVED_COPY_ID, FLOW_ID);

type ImportedDate = Readonly<{ present: true; date?: string }>;

function dateOwnership(
  sourceDate: string | undefined,
  imported?: ImportedDate,
): PersonalWorkspacePocFlowItemFieldOwnership {
  const sourceSchedule = sourceDate
    ? {
        mode: 'absolute' as const,
        date: sourceDate,
        owner: 'source' as const,
        provenance: 'flow-bundle' as const,
      }
    : {
        mode: 'none' as const,
        owner: 'source' as const,
        provenance: 'flow-bundle' as const,
      };
  const importedField = imported
    ? {
        ...(imported.date ? { value: imported.date } : {}),
        owner: 'existing-personal' as const,
        provenance: 'my-flow-date-override' as const,
      }
    : { owner: 'none' as const, provenance: 'none' as const };
  const effective = imported
    ? importedField
    : sourceDate
      ? { value: sourceDate, owner: 'source' as const, provenance: 'flow-bundle' as const }
      : { owner: 'none' as const, provenance: 'none' as const };
  return {
    title: {
      source: { value: 'source title', owner: 'source', provenance: 'flow-bundle' },
      existingPersonal: { owner: 'none', provenance: 'none' },
      effective: { value: 'source title', owner: 'source', provenance: 'flow-bundle' },
    },
    description: {
      source: { owner: 'none', provenance: 'none' },
      existingPersonal: { owner: 'none', provenance: 'none' },
      effective: { owner: 'none', provenance: 'none' },
    },
    order: {
      source: { value: 0, owner: 'source', provenance: 'flow-bundle' },
      existingPersonal: { owner: 'none', provenance: 'none' },
      effective: { value: 0, owner: 'source', provenance: 'flow-bundle' },
    },
    date: {
      source: sourceDate
        ? { value: sourceDate, owner: 'source', provenance: 'flow-bundle' }
        : { owner: 'source', provenance: 'flow-bundle' },
      existingPersonal: importedField,
      effective,
    },
    dateDerivation: {
      sourceSchedule,
      existingPersonalSchedule: imported
        ? {
            mode: 'absolute',
            ...(imported.date ? { date: imported.date } : {}),
            owner: 'existing-personal',
            provenance: 'my-flow-date-override',
          }
        : { mode: 'none', owner: 'none', provenance: 'none' },
      anchorInput: { owner: 'none', provenance: 'none' },
      existingPersonalOverride: importedField,
      effectiveDate: effective,
      strategy: imported ? 'existing-personal-override' : sourceDate ? 'source-absolute' : 'undated',
    },
  };
}

function item(
  itemId: string,
  sourceDate: string | undefined,
  options: Readonly<{
    imported?: ImportedDate;
    section?: string;
    memo?: string;
  }> = {},
): PersonalWorkspacePocFlowItem {
  const importedDate = options.imported?.date;
  return {
    ref: toPersonalWorkspacePocFlowItemRef(SAVED_COPY_ID, FLOW_ID, itemId),
    savedCopyId: SAVED_COPY_ID,
    flowId: FLOW_ID,
    itemId,
    title: `${itemId} 할 일`,
    ...(options.memo ? { description: options.memo } : {}),
    ...(options.section ? { sectionTitle: options.section } : {}),
    sourceOrder: 0,
    ...((options.imported && importedDate === undefined)
      ? {}
      : importedDate
        ? { sourceDate: importedDate }
        : sourceDate
          ? { sourceDate }
          : {}),
    fieldOwnership: dateOwnership(sourceDate, options.imported),
  };
}

const executionItem = item('execution', '2026-09-01', {
  imported: { present: true, date: '2026-09-02' },
  section: '준비',
});
const pocItem = item('poc', '2026-09-05', {
  imported: { present: true, date: '2026-09-06' },
  section: '준비',
});
const importedItem = item('imported', '2026-09-08', {
  imported: { present: true, date: '2026-09-09' },
  section: '확인',
  memo: '첫 줄\r\n둘째 줄',
});
const sourceItem = item('source', '2026-09-10', { section: '확인' });
const sameDateItem = item('same-date', '2026-09-10', { section: '확인' });
const pocUnscheduledItem = item('poc-unscheduled', '2026-09-11', {
  imported: { present: true, date: '2026-09-12' },
});
const executionUnscheduledItem = item('execution-unscheduled', '2026-09-13');

const model: PersonalWorkspacePocReadModel = {
  version: PERSONAL_WORKSPACE_POC_VERSION,
  flows: [{
    ref: FLOW_REF,
    savedCopyId: SAVED_COPY_ID,
    flowId: FLOW_ID,
    sourceSlug: 'projection-source',
    title: '원본 Projection Flow',
    origin: 'canonical-personal-copy',
    anchorDate: '2026-09-15',
    items: [
      executionItem,
      pocItem,
      importedItem,
      sourceItem,
      sameDateItem,
      pocUnscheduledItem,
      executionUnscheduledItem,
    ],
  }],
};

function fixtureState() {
  const state = createPersonalWorkspacePocState(NOW);
  const refs = Object.fromEntries(model.flows[0].items.map((entry) => [entry.itemId, entry.ref]));
  state.personalPlanOverlays = {
    [FLOW_REF]: {
      flowRef: FLOW_REF,
      savedCopyId: SAVED_COPY_ID,
      flowId: FLOW_ID,
      title: '내 Projection Flow',
      orderedItemRefs: [
        refs['same-date'],
        refs.source,
        refs.imported,
        refs.poc,
        refs.execution,
        refs['poc-unscheduled'],
        refs['execution-unscheduled'],
      ],
      items: {
        [refs.execution]: {
          itemRef: refs.execution,
          schedule: { mode: 'fixed_date', date: '2026-09-03' },
        },
        [refs.poc]: {
          itemRef: refs.poc,
          title: '개인 제목',
          schedule: { mode: 'fixed_date', date: '2026-09-07' },
        },
        [refs['poc-unscheduled']]: {
          itemRef: refs['poc-unscheduled'],
          schedule: { mode: 'unscheduled' },
        },
        [refs['execution-unscheduled']]: {
          itemRef: refs['execution-unscheduled'],
          schedule: { mode: 'fixed_date', date: '2026-09-14' },
        },
      },
    },
  };
  state.placements[refs.execution] = {
    itemRef: refs.execution,
    scheduleMode: 'fixed_date',
    date: '2026-09-04',
    timelinePolicy: 'auto',
  };
  state.placements[refs['execution-unscheduled']] = {
    itemRef: refs['execution-unscheduled'],
    scheduleMode: 'unscheduled',
    timelinePolicy: 'excluded',
  };
  state.timelineOrders = [{
    context: 'date',
    contextKey: '2026-09-10',
    orderedRefKeys: [refs.source, refs['same-date']],
    revision: 1,
  }];
  state.completions[refs['same-date']] = {
    status: 'completed',
    completedAt: '2026-09-02T02:00:00.000Z',
  };
  return { state, refs };
}

test('one effective Item array resolves execution, PoC plan, imported personal, and source date priority', () => {
  const { state, refs } = fixtureState();
  const result = buildPersonalWorkspacePocResultProjection({
    model,
    state,
    flowRef: FLOW_REF,
    localToday: '2026-09-02',
    selectedDate: '2026-09-10',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const byRef = new Map(result.projection.items.map((entry) => [entry.ref, entry]));

  assert.deepEqual(
    [byRef.get(refs.execution)?.planDate, byRef.get(refs.execution)?.effectiveDate],
    ['2026-09-03', '2026-09-04'],
  );
  assert.equal(byRef.get(refs.execution)?.effectiveDateOwner, 'execution-placement');
  assert.equal(byRef.get(refs.poc)?.effectiveDate, '2026-09-07');
  assert.equal(byRef.get(refs.poc)?.effectiveDateOwner, 'poc-personal-plan');
  assert.equal(byRef.get(refs.imported)?.effectiveDate, '2026-09-09');
  assert.equal(byRef.get(refs.imported)?.effectiveDateOwner, 'imported-personal');
  assert.equal(byRef.get(refs.source)?.effectiveDate, '2026-09-10');
  assert.equal(byRef.get(refs.source)?.effectiveDateOwner, 'source');
  assert.equal(byRef.get(refs['poc-unscheduled'])?.effectiveDate, undefined);
  assert.equal(byRef.get(refs['poc-unscheduled'])?.effectiveDateOwner, 'poc-personal-plan');
  assert.equal(byRef.get(refs['execution-unscheduled'])?.planDate, '2026-09-14');
  assert.equal(byRef.get(refs['execution-unscheduled'])?.effectiveDate, undefined);
  assert.equal(byRef.get(refs['execution-unscheduled'])?.effectiveDateOwner, 'execution-placement');
});

test('Text, full Todo, PoC Calendar, Sheet, and copyable TXT expose the same effective refs and values', () => {
  const { state, refs } = fixtureState();
  const sourceBytesBefore = JSON.stringify(model);
  const stateBytesBefore = JSON.stringify(state);
  const result = buildPersonalWorkspacePocResultProjection({
    model,
    state,
    flowRef: FLOW_REF,
    localToday: '2026-09-02',
    selectedDate: '2026-09-10',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const projection = result.projection;
  const expectedRefs = [
    refs['same-date'],
    refs.source,
    refs.imported,
    refs.poc,
    refs.execution,
    refs['poc-unscheduled'],
    refs['execution-unscheduled'],
  ];

  assert.deepEqual(projection.itemRefs, expectedRefs);
  assert.deepEqual(projection.text.itemRefs, expectedRefs);
  assert.deepEqual(projection.todo.itemRefs, expectedRefs);
  assert.deepEqual(projection.calendar.itemRefs, expectedRefs);
  assert.deepEqual(projection.sheet.itemRefs, expectedRefs);
  assert.deepEqual(projection.txt.itemRefs, expectedRefs);
  assert.equal(projection.slotOrder, PERSONAL_WORKSPACE_POC_RESULT_SLOT_ORDER);
  assert.equal(projection.todo.rowCount, expectedRefs.length);
  assert.equal(projection.sheet.rowCount, expectedRefs.length);
  assert.deepEqual(projection.sheet.columns, PERSONAL_WORKSPACE_POC_RESULT_SHEET_COLUMNS);
  assert.deepEqual(projection.sheet.rows.map((row) => row.itemRef), expectedRefs);
  assert.equal(projection.sheet.rows[0]?.values.itemRef, expectedRefs[0]);
  assert.equal(projection.sheet.rows[0]?.values.status, 'completed');
  assert.equal(projection.sheet.rows[0]?.item.completedAt, '2026-09-02T02:00:00.000Z');
  assert.deepEqual(
    projection.todo.groups.flatMap((group) => group.itemRefs),
    [refs.execution, refs.poc, refs.imported, refs.source, refs['same-date'], refs['poc-unscheduled'], refs['execution-unscheduled']],
  );
  assert.deepEqual(projection.calendar.selectedItemRefs, [refs.source, refs['same-date']]);
  assert.equal(projection.calendar.selectedItems[1]?.completed, true);
  assert.equal(projection.calendar.cells.find((cell) => cell.date === '2026-09-10')?.completedCount, 1);
  assert.deepEqual(
    projection.calendar.cells.find((cell) => cell.date === '2026-09-04')?.itemRefs,
    [refs.execution],
  );
  assert.deepEqual(
    projection.calendar.cells.find((cell) => cell.date === '2026-09-03')?.itemRefs,
    [],
  );
  assert.deepEqual(projection.calendar.undatedItemRefs, [refs['poc-unscheduled']]);
  assert.deepEqual(
    projection.calendar.undatedItems.map((item) => item.ref),
    projection.calendar.undatedItemRefs,
  );
  assert.equal(projection.calendar.datePolicy, 'effective-date-execution-first');
  assert.equal(projection.calendar.weekStartsOn, 'sunday');
  assert.equal(projection.calendar.cells.length, 42);
  assert.equal(projection.calendar.weekCount, 6);
  assert.equal(projection.calendar.weekCount, projection.calendar.cells.length / 7);
  assert.deepEqual(
    projection.calendar.monthItemRefs,
    projection.calendar.cells.flatMap((cell) => cell.itemRefs),
  );
  assert.ok(projection.calendar.cells.length % 7 === 0);
  assert.equal(projection.title, '내 Projection Flow');
  assert.match(projection.txt.normalizedText, /^내 Projection Flow\n=+\n/u);
  assert.match(projection.txt.normalizedText, /1\. ☑ same-date 할 일/u);
  assert.match(projection.txt.normalizedText, /첫 줄\n     둘째 줄/u);
  assert.doesNotMatch(projection.txt.normalizedText, /\r/u);
  assert.equal(projection.txt.normalizedText.endsWith('\n'), true);
  assert.equal(projection.txt.normalizedText.endsWith('\n\n'), false);
  assert.equal(projection.txt.copyText, projection.txt.normalizedText);
  assert.equal(projection.txt.mode, 'copy-only');
  assert.equal(projection.txt.downloadSupported, true);
  assert.equal(projection.txt.sourceRawTextIncluded, false);
  assert.equal(projection.txt.lineItemRefs.length, projection.text.lines.length);
  assert.equal(projection.downloads.version, PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT_VERSION);
  assert.deepEqual(projection.downloads.itemRefs, expectedRefs);
  assert.equal(projection.downloads.txt.payload, projection.txt.normalizedText);
  assert.equal(projection.downloads.txt.bom, false);
  assert.equal(projection.downloads.txt.lineEndings, 'lf');
  assert.equal(projection.downloads.csv.bom, true);
  assert.equal(projection.downloads.csv.lineEndings, 'crlf');
  assert.deepEqual(
    projection.downloads.csv.columns,
    PERSONAL_WORKSPACE_POC_RESULT_SHEET_COLUMNS.map((column) => column.key),
  );
  assert.equal(projection.source.owner, 'saved-plan-read-model');
  assert.equal(projection.source.sourceMutationCount, 0);
  assert.equal(JSON.stringify(model), sourceBytesBefore);
  assert.equal(JSON.stringify(state), stateBytesBefore);
});

test('a personal section title shadow reaches Text, Todo, Calendar, Sheet, and TXT without source mutation', () => {
  const sectionItem: PersonalWorkspacePocFlowItem = {
    ...sourceItem,
    sectionId: 'section:check',
    sectionTitle: '확인',
    sourceOrder: 0,
  };
  const personalModel: PersonalWorkspacePocReadModel = {
    version: PERSONAL_WORKSPACE_POC_VERSION,
    flows: [{
      ref: FLOW_REF,
      savedCopyId: SAVED_COPY_ID,
      flowId: FLOW_ID,
      sourceSlug: 'url-draft-projection',
      title: '개인 초안',
      origin: 'personal-draft',
      sections: [{
        sectionId: 'section:check',
        title: '확인',
        sourceOrder: 0,
        titleOwner: 'existing-personal',
        editCapability: 'poc-shadow',
      }],
      items: [sectionItem],
    }],
  };
  const state = createPersonalWorkspacePocState(NOW);
  state.personalPlanOverlays = {
    [FLOW_REF]: {
      flowRef: FLOW_REF,
      savedCopyId: SAVED_COPY_ID,
      flowId: FLOW_ID,
      sectionTitles: { 'section:check': '내 확인 구간' },
      items: {},
    },
  };
  const modelBefore = JSON.stringify(personalModel);
  const result = buildPersonalWorkspacePocResultProjection({
    model: personalModel,
    state,
    flowRef: FLOW_REF,
    localToday: '2026-09-02',
    selectedDate: '2026-09-10',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.projection.items[0]?.sectionTitle, '내 확인 구간');
  assert.equal(result.projection.todo.groups[0]?.sections[0]?.title, '내 확인 구간');
  assert.equal(result.projection.calendar.selectedItems[0]?.sectionTitle, '내 확인 구간');
  assert.equal(result.projection.sheet.rows[0]?.values.sectionTitle, '내 확인 구간');
  assert.match(result.projection.txt.normalizedText, /\[내 확인 구간\]/u);
  assert.equal(JSON.stringify(personalModel), modelBefore);
  assert.equal(result.projection.source.sourceMutationCount, 0);
});

test('Calendar excludes timeline-hidden dated and undated Items without changing the result identity manifest', () => {
  const { state, refs } = fixtureState();
  state.placements[refs.source] = {
    itemRef: refs.source,
    scheduleMode: 'inherit',
    timelinePolicy: 'excluded',
  };
  const result = buildPersonalWorkspacePocResultProjection({
    model,
    state,
    flowRef: FLOW_REF,
    localToday: '2026-09-02',
    selectedDate: '2026-09-10',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.projection.calendar.itemRefs.includes(refs.source), true);
  assert.equal(result.projection.calendar.itemRefs.includes(refs['execution-unscheduled']), true);
  assert.deepEqual(result.projection.calendar.selectedItemRefs, [refs['same-date']]);
  assert.deepEqual(
    result.projection.calendar.cells.find((cell) => cell.date === '2026-09-10')?.itemRefs,
    [refs['same-date']],
  );
  assert.deepEqual(result.projection.calendar.undatedItemRefs, [refs['poc-unscheduled']]);
  assert.equal(result.projection.calendar.monthItemRefs.includes(refs.source), false);
});

test('local TXT and CSV files have deterministic safe names, UTF-8/BOM, CRLF, and RFC 4180 escaping', () => {
  const { state } = fixtureState();
  const result = buildPersonalWorkspacePocResultProjection({
    model,
    state,
    flowRef: FLOW_REF,
    localToday: '2026-09-02',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const firstRow = result.projection.sheet.rows[0];
  assert.ok(firstRow);
  const sheet = {
    ...result.projection.sheet,
    rows: [{
      ...firstRow,
      values: {
        ...firstRow.values,
        title: '쉼표, "인용"\r\n다음 줄',
        memo: null,
      },
    }],
    rowCount: 1,
  };
  const first = buildPersonalWorkspacePocResultDownloads({
    title: ' ../이사: "준비"? ',
    savedCopyId: 'copy/01',
    txt: result.projection.txt,
    sheet,
  });
  const second = buildPersonalWorkspacePocResultDownloads({
    title: ' ../이사: "준비"? ',
    savedCopyId: 'copy/01',
    txt: result.projection.txt,
    sheet,
  });
  const normalizedDirtyTxt = buildPersonalWorkspacePocResultDownloads({
    title: 'TXT 정규화',
    savedCopyId: 'copy-01',
    txt: {
      ...result.projection.txt,
      normalizedText: '첫 줄\r\n둘째 줄\r마지막 줄\n\n',
    },
    sheet,
  });

  assert.deepEqual(second, first);
  assert.deepEqual(PERSONAL_WORKSPACE_POC_RESULT_DOWNLOAD_CONTRACT, {
    version: 2,
    filenamePattern: 'flow-{title}-{savedCopyId}.{extension}',
    txt: {
      mediaType: 'text/plain;charset=utf-8',
      encoding: 'utf-8',
      bom: false,
      lineEndings: 'lf',
      finalNewline: 'single',
    },
    csv: {
      mediaType: 'text/csv;charset=utf-8',
      encoding: 'utf-8',
      bom: true,
      lineEndings: 'crlf',
      finalNewline: 'single',
      delimiter: ',',
      escaping: 'rfc4180-double-quote-all-fields',
      nullValue: '',
    },
  });
  assert.equal(first.txt.filename, 'flow-이사-준비-copy-01.txt');
  assert.equal(first.csv.filename, 'flow-이사-준비-copy-01.csv');
  assert.equal(first.txt.payload.startsWith('\uFEFF'), false);
  assert.equal(first.txt.payload.includes('\r'), false);
  assert.equal(first.txt.payload.endsWith('\n'), true);
  assert.equal(normalizedDirtyTxt.txt.payload, '첫 줄\n둘째 줄\n마지막 줄\n');
  assert.equal(first.csv.payload.startsWith('\uFEFF"상태","단계","할 일"'), true);
  assert.match(first.csv.payload, /"쉼표, ""인용""\r\n다음 줄"/u);
  assert.match(first.csv.payload, /,"",/u);
  assert.equal(first.csv.payload.endsWith('\r\n'), true);
  assert.equal(first.sourceRawTextIncluded, false);
  assert.equal(first.sourceMutationCount, 0);
});

test('authoring source identity and exact CRLF bytes stay separate from normalized copy TXT', () => {
  const fixture = createPersonalWorkspacePocResultProjectionFixture();
  const modelBytes = JSON.stringify(fixture.model);
  const stateBytes = JSON.stringify(fixture.state);
  const input = {
    model: fixture.model,
    state: fixture.state,
    flowRef: fixture.flowRef,
    localToday: fixture.localToday,
    selectedDate: fixture.selectedDate,
  };
  const first = buildPersonalWorkspacePocResultProjection(input);
  const second = buildPersonalWorkspacePocResultProjection(input);
  assert.equal(first.ok, true);
  assert.deepEqual(second, first);
  if (!first.ok) return;

  const { projection } = first;
  for (const refs of [
    projection.text.itemRefs,
    projection.todo.itemRefs,
    projection.calendar.itemRefs,
    projection.sheet.itemRefs,
    projection.txt.itemRefs,
  ]) assert.deepEqual(refs, fixture.itemRefs);
  assert.deepEqual(projection.slotOrder, ['text', 'todo', 'calendar', 'sheet']);
  assert.equal(projection.source.owner, 'authoring-working-source');
  assert.equal(projection.source.authoring?.itemMapping, 'complete');
  assert.equal(projection.source.authoring?.rawText, PERSONAL_WORKSPACE_POC_RESULT_PROJECTION_FIXTURE_RAW_TEXT);
  assert.equal(projection.source.authoring?.rawText, fixture.rawText);
  assert.match(projection.source.authoring?.rawText ?? '', /\r\n/u);
  assert.doesNotMatch(projection.txt.copyText, /\r/u);
  assert.notEqual(projection.txt.copyText, projection.source.authoring?.rawText);
  assert.match(projection.txt.copyText, /\[원문 메모\]\n원문의 일반 문장은 Item으로 추정하지 않는다\./u);

  const firstRow = projection.sheet.rows[0];
  assert.equal(firstRow?.values.sourceLine, 6);
  assert.equal(firstRow?.values.sourceDate, '2026-09-10');
  assert.equal(firstRow?.values.place, '시청 민원실');
  assert.equal(firstRow?.values.resourceUrl, 'https://example.com/contract?lang=ko');
  assert.equal(firstRow?.values.completionCriteria, '필수 조항을 다시 읽음');
  assert.equal(firstRow?.values.planDate, '2026-09-10');
  assert.equal(firstRow?.values.effectiveDate, '2026-09-11');
  assert.equal(firstRow?.values.time, '09:30');
  assert.equal(firstRow?.item.ref, fixture.itemRefs[0]);
  assert.equal(projection.sheet.rows[1]?.values.status, 'completed');
  assert.equal(projection.sheet.rows[1]?.values.relativeDate, 'D-2');
  assert.equal(projection.sheet.rows[1]?.values.memo, '내 라벨지 위치\r\n입구 옆');
  assert.equal(JSON.stringify(fixture.model), modelBytes);
  assert.equal(JSON.stringify(fixture.state), stateBytes);
});

test('three recurrence occurrences share one ordered manifest across Todo, Calendar, Sheet, and complete TXT', () => {
  const rawText = [
    '# 주간 운동',
    '',
    '## 이번 주',
    '- [ ] 아침 스트레칭',
    '  - 설명: 몸을 천천히 깨운다',
    '  - 날짜: 2026-09-03',
    '  - 시간: 07:30',
    '  - 시간대: Asia/Seoul',
    '  - 장소: 거실',
    '  - 소요 시간: 15분',
    '  - 반복: 매일',
    '  - 반복 종료: 3회',
    '  - 실행 조건: 기상 직후',
    '  - 완료 기준: 스트레칭 3종 완료',
    '  - 자료: [동작 안내](https://example.com/stretch)',
    '  - 출처: [운동 기록](https://example.com/source)',
    '  - 주의: 통증이 나면 중단',
    '  - [ ] 목 돌리기',
    '  - [x] 어깨 돌리기',
    '일반 메모는 결과에도 남긴다.',
  ].join('\n');
  const materialized = materializePersonalWorkspacePocAuthoring({
    handoffId: 'p2b-repeat-handoff',
    documentId: 'p2b-repeat-document',
    revisionId: 'p2b-repeat-revision',
    rawText,
    committedAt: NOW,
  });
  assert.equal(materialized.ok, true);
  if (!materialized.ok) return;
  const repeatModel: PersonalWorkspacePocReadModel = {
    version: PERSONAL_WORKSPACE_POC_VERSION,
    flows: [materialized.flow],
  };
  const initial = createPersonalWorkspacePocState(NOW);
  const first = buildPersonalWorkspacePocResultProjection({
    model: repeatModel,
    state: initial,
    flowRef: materialized.flow.ref,
    localToday: '2026-09-03',
    selectedDate: '2026-09-04',
  });
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const manifest = first.projection.itemRefs;
  assert.equal(manifest.length, 3);
  assert.equal(first.projection.sourceItemRefs?.length, 1);
  assert.deepEqual(first.projection.occurrenceIds, manifest);
  assert.deepEqual(first.projection.todo.itemRefs, manifest);
  assert.deepEqual(first.projection.calendar.itemRefs, manifest);
  assert.deepEqual(first.projection.sheet.itemRefs, manifest);
  assert.deepEqual(first.projection.txt.itemRefs, manifest);
  assert.deepEqual(
    first.projection.items.map((item) => item.originalOccurrenceDate),
    ['2026-09-03', '2026-09-04', '2026-09-05'],
  );
  assert.deepEqual(first.projection.sheet.rows.map((row) => row.rowId), manifest);
  assert.match(first.projection.txt.normalizedText, /1\. ☐ 아침 스트레칭 · 1회차/u);
  assert.match(first.projection.txt.normalizedText, /3\. ☐ 아침 스트레칭 · 3회차/u);
  assert.match(first.projection.txt.normalizedText, /   소요 시간: 15분/u);
  assert.match(first.projection.txt.normalizedText, /   체크리스트:\n     ☐ 목 돌리기\n     ☑ 어깨 돌리기/u);
  assert.match(first.projection.txt.normalizedText, /\[원문 메모\]\n일반 메모는 결과에도 남긴다\./u);
  assert.equal(first.projection.txt.copyText, first.projection.downloads.txt.payload);

  const secondOccurrence = first.projection.items[1];
  assert.ok(secondOccurrence.occurrenceId && secondOccurrence.sourceItemRef
    && secondOccurrence.originalOccurrenceDate);
  let changed = applyPersonalWorkspacePocTransition(initial, {
    type: 'move-occurrence-date',
    occurrenceId: secondOccurrence.occurrenceId,
    sourceItemRef: secondOccurrence.sourceItemRef,
    originalDate: secondOccurrence.originalOccurrenceDate,
    date: '2026-09-08',
    now: '2026-09-03T00:01:00.000Z',
  });
  assert.equal(changed.changed, true);
  changed = applyPersonalWorkspacePocTransition(changed.state, {
    type: 'complete-occurrence',
    occurrenceId: secondOccurrence.occurrenceId,
    sourceItemRef: secondOccurrence.sourceItemRef,
    originalDate: secondOccurrence.originalOccurrenceDate,
    completed: true,
    now: '2026-09-03T00:02:00.000Z',
  });
  const after = buildPersonalWorkspacePocResultProjection({
    model: repeatModel,
    state: changed.state,
    flowRef: materialized.flow.ref,
    localToday: '2026-09-03',
  });
  assert.equal(after.ok, true);
  if (!after.ok) return;
  assert.deepEqual(after.projection.itemRefs, manifest);
  assert.equal(after.projection.items[1]?.effectiveDate, '2026-09-08');
  assert.equal(after.projection.items[1]?.completed, true);
  assert.equal(after.projection.items[0]?.completed, false);
  assert.equal(after.projection.items[2]?.effectiveDate, '2026-09-05');
  assert.match(after.projection.txt.normalizedText, /2\. ☑ 아침 스트레칭 · 2회차/u);
  assert.match(after.projection.txt.normalizedText, /   날짜: 2026-09-08/u);
  const corruptState = structuredClone(initial);
  const foreignOccurrenceId = `${manifest[0]}-corrupt`;
  corruptState.occurrencePlacements = {
    [foreignOccurrenceId]: {
      occurrenceId: foreignOccurrenceId,
      sourceItemRef: secondOccurrence.sourceItemRef,
      originalDate: secondOccurrence.originalOccurrenceDate,
      scheduleMode: 'fixed_date',
      date: '2026-09-08',
    },
  };
  assert.deepEqual(buildPersonalWorkspacePocResultProjection({
    model: repeatModel,
    state: corruptState,
    flowRef: materialized.flow.ref,
    localToday: '2026-09-03',
  }), { ok: false, reason: 'invalid-occurrence-state' });
  assert.equal(JSON.stringify(repeatModel), JSON.stringify({
    version: PERSONAL_WORKSPACE_POC_VERSION,
    flows: [materialized.flow],
  }));
});

test('all four saved-plan origins use the same deterministic projection contract', () => {
  const origins = [
    'source-backed-map',
    'personal-draft',
    'canonical-personal-copy',
    'legacy-saved-plan',
  ] as const;
  for (const origin of origins) {
    const originModel: PersonalWorkspacePocReadModel = {
      ...model,
      flows: [{ ...model.flows[0], origin }],
    };
    const result = buildPersonalWorkspacePocResultProjection({
      model: originModel,
      state: createPersonalWorkspacePocState(NOW),
      flowRef: FLOW_REF,
      localToday: '2026-09-02',
    });
    assert.equal(result.ok, true, origin);
    if (!result.ok) continue;
    assert.deepEqual(result.projection.slotOrder, ['text', 'todo', 'calendar', 'sheet']);
    assert.equal(result.projection.sheet.rowCount, model.flows[0].items.length);
    assert.deepEqual(result.projection.sheet.itemRefs, result.projection.itemRefs);
    assert.equal(result.projection.source.origin, origin);
    assert.equal(result.projection.source.owner, 'saved-plan-read-model');
  }
});

test('context order is shared without overwriting personal Plan order or completion', () => {
  const { state, refs } = fixtureState();
  const result = buildPersonalWorkspacePocResultProjection({
    model,
    state,
    flowRef: FLOW_REF,
    localToday: '2026-09-02',
    selectedDate: '2026-09-10',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const source = result.projection.items.find((entry) => entry.ref === refs.source);
  const sameDate = result.projection.items.find((entry) => entry.ref === refs['same-date']);
  assert.equal(sameDate?.planOrder, 0);
  assert.equal(source?.planOrder, 1);
  assert.equal(source?.contextOrder, 0);
  assert.equal(sameDate?.contextOrder, 1);
  assert.equal(source?.manualContextOrder, true);
  assert.equal(sameDate?.completed, true);
  assert.equal(sameDate?.completedAt, '2026-09-02T02:00:00.000Z');
});

test('Flow selection resets Text, base date, selected day, detail, and focus return without persistence', () => {
  const current: PersonalWorkspacePocResultNavigationState = {
    selectedFlowRef: 'old-flow',
    resultView: 'calendar',
    baseDate: '2026-08-01',
    selectedDate: '2026-08-20',
    openItemRef: 'old-item',
  };
  const selected = selectPersonalWorkspacePocResultFlow(
    current,
    model.flows[0],
    '2026-09-02',
  );
  assert.deepEqual(selected, {
    ok: true,
    changed: true,
    state: {
      selectedFlowRef: FLOW_REF,
      resultView: 'text',
      baseDate: '2026-09-15',
      selectedDate: '2026-09-15',
      openItemRef: null,
      focusReturn: { kind: 'flow-result-heading', flowRef: FLOW_REF },
    },
  });

  const same = selectPersonalWorkspacePocResultFlow(
    selected.ok && selected.changed ? selected.state : current,
    model.flows[0],
    '2026-09-02',
  );
  assert.equal(same.ok && !same.changed && same.reason, 'same-flow');

  const noAnchor = { ...model.flows[0], ref: 'saved-flow:no-anchor:no-anchor', savedCopyId: 'no-anchor', flowId: 'no-anchor', anchorDate: undefined };
  const fallback = selectPersonalWorkspacePocResultFlow(current, noAnchor, '2026-09-02');
  assert.equal(fallback.ok && fallback.changed && fallback.state.baseDate, '2026-09-02');
  const invalidToday = selectPersonalWorkspacePocResultFlow(current, noAnchor, '2026-99-99');
  assert.deepEqual(invalidToday, {
    ok: false,
    changed: false,
    reason: 'invalid-local-today',
    state: current,
  });
});

test('malformed dates, identities, navigation dates, and overlays fail closed', () => {
  const { state } = fixtureState();
  assert.deepEqual(buildPersonalWorkspacePocResultProjection({
    model,
    state,
    flowRef: FLOW_REF,
    localToday: '2026-09-02',
    selectedDate: '2026-99-99',
  }), { ok: false, reason: 'invalid-selected-date' });

  const duplicateModel: PersonalWorkspacePocReadModel = {
    ...model,
    flows: [{ ...model.flows[0], items: [model.flows[0].items[0], model.flows[0].items[0]] }],
  };
  assert.deepEqual(buildPersonalWorkspacePocResultProjection({
    model: duplicateModel,
    state: createPersonalWorkspacePocState(NOW),
    flowRef: FLOW_REF,
    localToday: '2026-09-02',
  }), { ok: false, reason: 'duplicate-item-identity' });

  state.personalPlanOverlays![FLOW_REF] = {
    ...state.personalPlanOverlays![FLOW_REF],
    items: {
      ...state.personalPlanOverlays![FLOW_REF].items,
      foreign: { itemRef: 'foreign' },
    },
  };
  assert.deepEqual(buildPersonalWorkspacePocResultProjection({
    model,
    state,
    flowRef: FLOW_REF,
    localToday: '2026-09-02',
  }), { ok: false, reason: 'invalid-personal-plan-overlay' });

  const malformedOverlayState = createPersonalWorkspacePocState(NOW);
  malformedOverlayState.personalPlanOverlays = {
    [FLOW_REF]: { flowRef: FLOW_REF } as never,
  };
  assert.doesNotThrow(() => buildPersonalWorkspacePocResultProjection({
    model,
    state: malformedOverlayState,
    flowRef: FLOW_REF,
    localToday: '2026-09-02',
  }));
  assert.deepEqual(buildPersonalWorkspacePocResultProjection({
    model,
    state: malformedOverlayState,
    flowRef: FLOW_REF,
    localToday: '2026-09-02',
  }), { ok: false, reason: 'invalid-personal-plan-overlay' });
});

test('unsupported origin, source schedule, state version, and authoring lineage fail closed', () => {
  const state = createPersonalWorkspacePocState(NOW);
  const unsupportedOrigin: PersonalWorkspacePocReadModel = {
    ...model,
    flows: [{ ...model.flows[0], origin: 'future-origin' as 'legacy-saved-plan' }],
  };
  assert.deepEqual(buildPersonalWorkspacePocResultProjection({
    model: unsupportedOrigin,
    state,
    flowRef: FLOW_REF,
    localToday: '2026-09-02',
  }), { ok: false, reason: 'unsupported-origin' });

  const unsupportedOwnership = dateOwnership('2026-09-10');
  const unsupportedItem: PersonalWorkspacePocFlowItem = {
    ...sourceItem,
    fieldOwnership: {
      ...unsupportedOwnership,
      dateDerivation: {
        ...unsupportedOwnership.dateDerivation,
        sourceSchedule: {
          mode: 'unsupported',
          sourceMode: 'yearly-rule',
          owner: 'source',
          provenance: 'flow-bundle',
        },
        strategy: 'unsupported-source-schedule',
      },
    },
  };
  const unsupportedScheduleModel: PersonalWorkspacePocReadModel = {
    ...model,
    flows: [{
      ...model.flows[0],
      items: model.flows[0].items.map((entry) => (
        entry.ref === unsupportedItem.ref ? unsupportedItem : entry
      )),
    }],
  };
  assert.deepEqual(buildPersonalWorkspacePocResultProjection({
    model: unsupportedScheduleModel,
    state,
    flowRef: FLOW_REF,
    localToday: '2026-09-02',
  }), { ok: false, reason: 'unsupported-item-schedule' });

  assert.deepEqual(buildPersonalWorkspacePocResultProjection({
    model,
    state: { ...state, version: 2 as 1 },
    flowRef: FLOW_REF,
    localToday: '2026-09-02',
  }), { ok: false, reason: 'invalid-state-version' });

  const fixture = createPersonalWorkspacePocResultProjectionFixture();
  const authored = fixture.model.flows[0] as PersonalWorkspacePocAuthoredFlow;
  const corruptedAuthoredFlow: PersonalWorkspacePocAuthoredFlow = {
    ...authored,
    authoring: { ...authored.authoring, rawText: `${authored.authoring.rawText}!` },
  };
  const corruptedAuthoringModel: PersonalWorkspacePocReadModel = {
    version: PERSONAL_WORKSPACE_POC_VERSION,
    flows: [corruptedAuthoredFlow],
  };
  assert.deepEqual(buildPersonalWorkspacePocResultProjection({
    model: corruptedAuthoringModel,
    state: fixture.state,
    flowRef: fixture.flowRef,
    localToday: fixture.localToday,
  }), { ok: false, reason: 'invalid-authoring-lineage' });
});

test('projection module has no operating storage, clipboard, Calendar, Sheet export, or download writer seam', () => {
  const source = readFileSync(
    new URL('./personal-workspace-poc-result-projection.ts', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(source, /localStorage|sessionStorage|navigator\.clipboard|\/calendar|fullcalendar/iu);
  assert.doesNotMatch(source, /\b(?:writeBundles|saveFlow|persistBundle|exportFlow|downloadFile|exportSheet)\b/u);
  assert.doesNotMatch(source, /from ['"].*(?:storage|export)['"]/u);
});
