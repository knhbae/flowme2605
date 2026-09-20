import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  PERSONAL_WORKSPACE_POC_RESULT_FORBIDDEN_CAPABILITIES,
  PersonalWorkspacePocResultPresenter,
  shiftPersonalWorkspacePocResultMonth,
  triggerPersonalWorkspacePocLocalResultDownload,
  type PersonalWorkspacePocResultOpenItemIntent,
  type PersonalWorkspacePocResultPresenterProps,
} from './PersonalWorkspacePocResultPresenter';
import {
  PERSONAL_WORKSPACE_POC_RESULT_SHEET_COLUMNS,
  PERSONAL_WORKSPACE_POC_RESULT_SLOT_ORDER,
  PERSONAL_WORKSPACE_POC_RESULT_PROJECTION_VERSION,
  type PersonalWorkspacePocResultItem,
  type PersonalWorkspacePocResultProjection,
  type PersonalWorkspacePocResultView,
} from '@/lib/flow/personal-workspace-poc-result-projection';

const FLOW_REF = 'saved-flow:copy-one:flow-one';
const ALPHA_REF = 'flow-item:copy-one:flow-one:alpha';
const BETA_REF = 'flow-item:copy-one:flow-one:beta';
const UNDATED_REF = 'flow-item:copy-one:flow-one:undated';

const alpha: PersonalWorkspacePocResultItem = {
  ref: ALPHA_REF,
  flowRef: FLOW_REF,
  savedCopyId: 'copy-one',
  flowId: 'flow-one',
  itemId: 'alpha',
  title: '서류 준비',
  memo: '신분증도 함께 챙기기',
  sectionTitle: '준비',
  sourceOrder: 0,
  planOrder: 0,
  contextOrder: 1,
  contextKey: 'date:2026-09-10',
  manualContextOrder: true,
  planDate: '2026-09-10',
  planDateOwner: 'poc-personal-plan',
  effectiveDate: '2026-09-10',
  effectiveDateOwner: 'poc-personal-plan',
  executionScheduleMode: 'inherit',
  timelinePolicy: 'auto',
  completed: true,
  completedAt: '2026-09-02T02:00:00.000Z',
};

const beta: PersonalWorkspacePocResultItem = {
  ref: BETA_REF,
  flowRef: FLOW_REF,
  savedCopyId: 'copy-one',
  flowId: 'flow-one',
  itemId: 'beta',
  title: '열쇠 받기',
  sectionTitle: '준비',
  sourceOrder: 1,
  planOrder: 1,
  contextOrder: 0,
  contextKey: 'date:2026-09-10',
  manualContextOrder: true,
  planDate: '2026-09-09',
  planDateOwner: 'imported-personal',
  effectiveDate: '2026-09-10',
  effectiveDateOwner: 'execution-placement',
  executionScheduleMode: 'fixed_date',
  time: '10:30',
  timelinePolicy: 'included',
  completed: false,
};

const undated: PersonalWorkspacePocResultItem = {
  ref: UNDATED_REF,
  flowRef: FLOW_REF,
  savedCopyId: 'copy-one',
  flowId: 'flow-one',
  itemId: 'undated',
  title: '이웃에게 인사하기',
  sourceOrder: 2,
  planOrder: 2,
  contextOrder: 0,
  contextKey: 'undated:undated',
  manualContextOrder: false,
  planDateOwner: 'none',
  effectiveDateOwner: 'none',
  executionScheduleMode: 'inherit',
  timelinePolicy: 'excluded',
  completed: false,
};

const textLines = [
  { kind: 'flow-title', text: '# 내 이사 준비' },
  { kind: 'section', text: '## 준비' },
  { kind: 'item', text: '- [x] 서류 준비', itemRef: ALPHA_REF },
  { kind: 'plan-date', text: '  - 계획 날짜: 2026-09-10', itemRef: ALPHA_REF },
  { kind: 'memo', text: '  - 메모: 신분증도 함께 챙기기', itemRef: ALPHA_REF },
  { kind: 'item', text: '- [ ] 열쇠 받기', itemRef: BETA_REF },
  { kind: 'plan-date', text: '  - 계획 날짜: 2026-09-09', itemRef: BETA_REF },
  { kind: 'execution-date', text: '  - 실행 날짜: 2026-09-10', itemRef: BETA_REF },
  { kind: 'item', text: '- [ ] 이웃에게 인사하기', itemRef: UNDATED_REF },
  { kind: 'plan-date', text: '  - 계획 날짜: 미정', itemRef: UNDATED_REF },
] as const;

const projection: PersonalWorkspacePocResultProjection = {
  version: PERSONAL_WORKSPACE_POC_RESULT_PROJECTION_VERSION,
  slotOrder: PERSONAL_WORKSPACE_POC_RESULT_SLOT_ORDER,
  flowRef: FLOW_REF,
  title: '내 이사 준비',
  baseDate: '2026-09-15',
  selectedDate: '2026-09-10',
  itemRefs: [ALPHA_REF, BETA_REF, UNDATED_REF],
  items: [alpha, beta, undated],
  text: {
    itemRefs: [ALPHA_REF, BETA_REF, UNDATED_REF],
    lines: textLines,
  },
  todo: {
    itemRefs: [ALPHA_REF, BETA_REF, UNDATED_REF],
    rowCount: 3,
    groups: [
      {
        key: 'date:2026-09-10',
        date: '2026-09-10',
        label: '2026-09-10',
        itemRefs: [BETA_REF, ALPHA_REF],
        items: [beta, alpha],
        sections: [{
          key: 'date:2026-09-10:section:0',
          title: '준비',
          itemRefs: [BETA_REF, ALPHA_REF],
          items: [beta, alpha],
        }],
      },
      {
        key: 'undated',
        label: '날짜 미정',
        itemRefs: [UNDATED_REF],
        items: [undated],
        sections: [{
          key: 'undated:section:0',
          title: '기타',
          itemRefs: [UNDATED_REF],
          items: [undated],
        }],
      },
    ],
  },
  calendar: {
    itemRefs: [ALPHA_REF, BETA_REF, UNDATED_REF],
    month: '2026-09',
    baseDate: '2026-09-15',
    selectedDate: '2026-09-10',
    cells: [
      { key: 'empty:0', inMonth: false, selected: false, itemRefs: [], completedCount: 0 },
      { key: '2026-09-09', date: '2026-09-09', day: 9, inMonth: true, selected: false, itemRefs: [], completedCount: 0 },
      { key: '2026-09-10', date: '2026-09-10', day: 10, inMonth: true, selected: true, itemRefs: [BETA_REF, ALPHA_REF], completedCount: 1 },
      { key: '2026-09-11', date: '2026-09-11', day: 11, inMonth: true, selected: false, itemRefs: [], completedCount: 0 },
      { key: 'empty:4', inMonth: false, selected: false, itemRefs: [], completedCount: 0 },
      { key: 'empty:5', inMonth: false, selected: false, itemRefs: [], completedCount: 0 },
      { key: 'empty:6', inMonth: false, selected: false, itemRefs: [], completedCount: 0 },
    ],
    selectedItemRefs: [BETA_REF, ALPHA_REF],
    selectedItems: [beta, alpha],
    undatedItemRefs: [UNDATED_REF],
  },
  sheet: {
    itemRefs: [ALPHA_REF, BETA_REF, UNDATED_REF],
    columns: PERSONAL_WORKSPACE_POC_RESULT_SHEET_COLUMNS,
    rowCount: 3,
    sourcePreserved: true,
    rows: [alpha, beta, undated].map((item) => ({
      rowId: `sheet-row:${item.ref}`,
      itemRef: item.ref,
      item,
      values: {
        status: item.completed ? 'completed' : 'open',
        sectionTitle: item.sectionTitle ?? null,
        title: item.title,
        memo: item.memo ?? null,
        planDate: item.planDate ?? null,
        effectiveDate: item.effectiveDate ?? null,
        time: item.time ?? null,
        relativeDate: null,
        sourceDate: null,
        timeZone: null,
        place: null,
        resourceUrl: null,
        recurrence: null,
        recurrenceEnd: null,
        completionCriteria: null,
        completedAt: item.completedAt ?? null,
        planOrder: item.planOrder,
        sourceLine: null,
        occurrenceIndex: null,
        originalOccurrenceDate: null,
        occurrenceId: null,
        sourceItemRef: item.ref,
        itemRef: item.ref,
      },
    })),
  },
  txt: {
    itemRefs: [ALPHA_REF, BETA_REF, UNDATED_REF],
    mediaType: 'text/plain;charset=utf-8',
    mode: 'copy-only',
    copyText: `${textLines.map((line) => line.text).join('\n')}\n`,
    lineItemRefs: textLines.map((line) => 'itemRef' in line ? line.itemRef : null),
    normalizedText: `${textLines.map((line) => line.text).join('\n')}\n`,
    sourceRawTextIncluded: false,
    downloadSupported: true,
    normalization: {
      lineEndings: 'lf',
      finalNewline: 'single',
      trailingHorizontalWhitespace: 'removed',
    },
  },
  downloads: {
    version: 2,
    itemRefs: [ALPHA_REF, BETA_REF, UNDATED_REF],
    txt: {
      filename: 'flow-내-이사-준비-copy-one.txt',
      mediaType: 'text/plain;charset=utf-8',
      encoding: 'utf-8',
      bom: false,
      lineEndings: 'lf',
      finalNewline: 'single',
      payload: `${textLines.map((line) => line.text).join('\n')}\n`,
    },
    csv: {
      filename: 'flow-내-이사-준비-copy-one.csv',
      mediaType: 'text/csv;charset=utf-8',
      encoding: 'utf-8',
      bom: true,
      lineEndings: 'crlf',
      finalNewline: 'single',
      payload: '\uFEFF"상태","할 일"\r\n"completed","서류 준비"\r\n',
      columns: ['status', 'title'],
      delimiter: ',',
      escaping: 'rfc4180-double-quote-all-fields',
    },
    sourceRawTextIncluded: false,
    sourceMutationCount: 0,
  },
  source: {
    origin: 'legacy-saved-plan',
    flowRef: FLOW_REF,
    savedCopyId: 'copy-one',
    flowId: 'flow-one',
    sourceSlug: 'fixture',
    owner: 'saved-plan-read-model',
    sourcePreserved: true,
    sourceMutationCount: 0,
  },
};

function presenterProps(
  resultView: PersonalWorkspacePocResultView,
  overrides: Partial<PersonalWorkspacePocResultPresenterProps> = {},
): PersonalWorkspacePocResultPresenterProps {
  return {
    projection,
    navigation: {
      selectedFlowRef: FLOW_REF,
      resultView,
      baseDate: projection.baseDate,
      selectedDate: projection.selectedDate,
      openItemRef: null,
    },
    onResultViewChange: () => undefined,
    onCalendarBaseDateChange: () => undefined,
    onCalendarSelectedDateChange: () => undefined,
    onOpenItem: () => undefined,
    ...overrides,
  };
}

function findElement(
  node: React.ReactNode,
  predicate: (element: React.ReactElement<Record<string, unknown>>) => boolean,
): React.ReactElement<Record<string, unknown>> | undefined {
  if (!React.isValidElement<Record<string, unknown>>(node)) return undefined;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props.children as React.ReactNode)) {
    const match = findElement(child, predicate);
    if (match) return match;
  }
  return undefined;
}

test('presenter exposes four accessible controlled tabs and keeps its storage boundary machine-readable', () => {
  const markup = renderToStaticMarkup(
    <PersonalWorkspacePocResultPresenter {...presenterProps('text')} />,
  );

  assert.match(markup, /data-testid="personal-workspace-result-surface"/u);
  assert.match(markup, /role="tablist" aria-label="결과 보기"/u);
  for (const view of ['text', 'todo', 'calendar', 'sheet']) {
    assert.match(markup, new RegExp(`data-testid="personal-workspace-result-view-${view}"`, 'u'));
  }
  assert.match(markup, /aria-selected="true"[^>]*>TXT</u);
  assert.match(markup, /role="tabpanel"/u);
  assert.match(markup, /data-result-storage="none"/u);
  assert.match(markup, /<h2[^>]+class="sr-only"[^>]*>다른 방식으로 보기<\/h2>/u);
  assert.match(markup, /data-result-calendar-scope="poc-local"/u);
  assert.match(markup, /다른 보기에서는 내용을 확인할 수 있습니다/u);
  assert.doesNotMatch(markup, /PoC 안에서만 보는 결과입니다/u);
  assert.match(markup, /grid-cols-2[^"]*sm:grid-cols-4/u);
  assert.match(markup, /overflow-x-clip/u);
  assert.match(markup, /min-h-12/u);
  assert.match(markup, /data-testid="personal-workspace-result-txt-download"/u);
});

test('TXT, Todo, Calendar, and Sheet rows keep the same stable ref, effective date, and completion', () => {
  for (const view of ['text', 'todo', 'calendar', 'sheet'] as const) {
    const markup = renderToStaticMarkup(
      <PersonalWorkspacePocResultPresenter {...presenterProps(view)} />,
    );
    assert.match(markup, /data-item-ref="flow-item:copy-one:flow-one:alpha" data-effective-date="2026-09-10" data-completed="true"/u, view);
    assert.match(markup, /data-result-item-refs="\[&quot;flow-item:copy-one:flow-one:alpha&quot;,&quot;flow-item:copy-one:flow-one:beta&quot;,&quot;flow-item:copy-one:flow-one:undated&quot;\]"/u, view);
    assert.match(markup, /서류 준비/u, view);
  }

  const todoMarkup = renderToStaticMarkup(
    <PersonalWorkspacePocResultPresenter {...presenterProps('todo')} />,
  );
  assert.ok(
    todoMarkup.indexOf(`data-item-ref="${BETA_REF}"`)
      < todoMarkup.indexOf(`data-item-ref="${ALPHA_REF}"`),
  );
  assert.match(todoMarkup, /계획 9월 9일 · 실행 9월 10일 · 10:30 · 진행 중/u);

  const txtMarkup = renderToStaticMarkup(
    <PersonalWorkspacePocResultPresenter {...presenterProps('txt')} />,
  );
  assert.match(txtMarkup, /data-media-type="text\/plain;charset=utf-8"/u);
  assert.match(txtMarkup, /- \[x\] 서류 준비/u);
  assert.doesNotMatch(txtMarkup, /<(?:input|textarea)\b/u);

  const sheetMarkup = renderToStaticMarkup(
    <PersonalWorkspacePocResultPresenter {...presenterProps('sheet')} />,
  );
  assert.match(sheetMarkup, /data-testid="personal-workspace-result-sheet-panel"/u);
  assert.match(sheetMarkup, /data-sheet-row-id=/u);
});

test('controlled tab and Item actions emit view-aware intents without internal navigation state', () => {
  const views: PersonalWorkspacePocResultView[] = [];
  const opened: PersonalWorkspacePocResultOpenItemIntent[] = [];
  const tree = PersonalWorkspacePocResultPresenter(presenterProps('text', {
    onResultViewChange: (view) => views.push(view),
    onOpenItem: (intent) => opened.push(intent),
  }));
  const todoTab = findElement(tree, (element) => (
    element.props['data-testid'] === 'personal-workspace-result-view-todo'
  ));
  const currentTab = findElement(tree, (element) => (
    element.props['data-testid'] === 'personal-workspace-result-view-text'
  ));
  assert.ok(todoTab);
  assert.ok(currentTab);
  (todoTab.props.onClick as () => void)();
  (currentTab.props.onClick as () => void)();
  assert.deepEqual(views, ['todo']);

  const itemButton = findElement(tree, (element) => (
    element.props['data-result-open-item'] === ALPHA_REF
  ));
  assert.ok(itemButton);
  (itemButton.props.onClick as () => void)();
  assert.deepEqual(opened, [{
    flowRef: FLOW_REF,
    itemRef: ALPHA_REF,
    resultView: 'text',
    returnFocusSelector: '#personal-workspace-result-text-item-0',
  }]);
});

test('every result view opens the same Item ref through one typed callback', () => {
  for (const view of ['text', 'todo', 'calendar', 'sheet'] as const) {
    const opened: PersonalWorkspacePocResultOpenItemIntent[] = [];
    const tree = PersonalWorkspacePocResultPresenter(presenterProps(view, {
      onOpenItem: (intent) => opened.push(intent),
    }));
    const itemButton = findElement(tree, (element) => (
      element.props['data-result-open-item'] === ALPHA_REF
    ));
    assert.ok(itemButton, view);
    (itemButton.props.onClick as () => void)();
    assert.equal(opened.length, 1, view);
    assert.equal(opened[0]?.flowRef, FLOW_REF, view);
    assert.equal(opened[0]?.itemRef, ALPHA_REF, view);
    assert.equal(opened[0]?.resultView, view, view);
    assert.equal(
      opened[0]?.returnFocusSelector,
      `#personal-workspace-result-${view}-item-0`,
      view,
    );
    assert.equal(opened[0]?.selectedDate, view === 'calendar' ? '2026-09-10' : undefined, view);
  }
});

test('recurrence row exposes one-occurrence move, complete, restore, and source Item edit intents', () => {
  const occurrenceId = `poc-occurrence-series:v1:${encodeURIComponent(ALPHA_REF)}:rule:occurrence:2026-09-10`;
  const occurrence: PersonalWorkspacePocResultItem = {
    ...alpha,
    ref: occurrenceId,
    sourceItemRef: ALPHA_REF,
    occurrenceId,
    occurrenceIndex: 1,
    originalOccurrenceDate: '2026-09-10',
    effectiveDate: '2026-09-11',
    effectiveDateOwner: 'execution-placement',
    executionScheduleMode: 'fixed_date',
  };
  const occurrenceProjection: PersonalWorkspacePocResultProjection = {
    ...projection,
    itemRefs: [occurrenceId],
    sourceItemRefs: [ALPHA_REF],
    occurrenceIds: [occurrenceId],
    items: [occurrence],
    todo: {
      itemRefs: [occurrenceId],
      rowCount: 1,
      groups: [{
        key: 'date:2026-09-11',
        date: '2026-09-11',
        label: '2026-09-11',
        itemRefs: [occurrenceId],
        items: [occurrence],
        sections: [{
          key: 'repeat', title: '준비', itemRefs: [occurrenceId], items: [occurrence],
        }],
      }],
    },
  };
  const moved: Array<string | undefined> = [];
  const completed: string[] = [];
  const restored: string[] = [];
  const opened: PersonalWorkspacePocResultOpenItemIntent[] = [];
  const tree = PersonalWorkspacePocResultPresenter(presenterProps('todo', {
    projection: occurrenceProjection,
    onMoveOccurrenceDate: (item, date) => moved.push(date),
    onToggleOccurrence: (item) => completed.push(item.ref),
    onRestoreOccurrenceDate: (item) => restored.push(item.ref),
    onOpenItem: (intent) => opened.push(intent),
  }));
  const dateInput = findElement(tree, (element) => String(element.props['aria-label']).includes('1회차 실행일'));
  const completeButton = findElement(tree, (element) => element.props.children === '이 회차 다시 열기');
  const restoreButton = findElement(tree, (element) => element.props.children === '원래 날짜');
  const titleButton = findElement(tree, (element) => element.props['data-result-occurrence-id'] === occurrenceId);
  assert.ok(dateInput && completeButton && restoreButton && titleButton);
  (dateInput.props.onChange as (event: unknown) => void)({ currentTarget: { value: '2026-09-12' } });
  (completeButton.props.onClick as () => void)();
  (restoreButton.props.onClick as () => void)();
  (titleButton.props.onClick as () => void)();
  assert.deepEqual(moved, ['2026-09-12']);
  assert.deepEqual(completed, [occurrenceId]);
  assert.deepEqual(restored, [occurrenceId]);
  assert.equal(opened[0]?.itemRef, ALPHA_REF);
  assert.equal(opened[0]?.occurrenceId, occurrenceId);
});

test('Calendar emits month, selected-day, and view-aware Item navigation only after a real change', () => {
  const baseDates: string[] = [];
  const selectedDates: string[] = [];
  const opened: PersonalWorkspacePocResultOpenItemIntent[] = [];
  const tree = PersonalWorkspacePocResultPresenter(presenterProps('calendar', {
    onCalendarBaseDateChange: (date) => baseDates.push(date),
    onCalendarSelectedDateChange: (date) => selectedDates.push(date),
    onOpenItem: (intent) => opened.push(intent),
  }));
  const calendarPanel = findElement(tree, (element) => (
    element.props['data-testid'] === 'personal-workspace-result-calendar-panel'
  ));
  const previous = findElement(tree, (element) => element.props['aria-label'] === '이전 달');
  const next = findElement(tree, (element) => element.props['aria-label'] === '다음 달');
  const selectedDay = findElement(tree, (element) => element.props['data-calendar-date'] === '2026-09-10');
  const anotherDay = findElement(tree, (element) => element.props['data-calendar-date'] === '2026-09-11');
  assert.ok(previous);
  assert.ok(next);
  assert.ok(selectedDay);
  assert.ok(anotherDay);
  assert.equal(calendarPanel?.props['data-calendar-date-policy'], 'effective-date-execution-first');
  assert.equal(calendarPanel?.props['data-calendar-week-start'], 'sunday');
  assert.equal(calendarPanel?.props['data-undated-item-refs'], JSON.stringify([UNDATED_REF]));
  (previous.props.onClick as () => void)();
  (next.props.onClick as () => void)();
  (selectedDay.props.onClick as () => void)();
  (anotherDay.props.onClick as () => void)();
  assert.deepEqual(baseDates, ['2026-08-15', '2026-10-15']);
  assert.deepEqual(selectedDates, ['2026-09-11']);

  const itemButton = findElement(tree, (element) => (
    element.props['data-result-open-item'] === BETA_REF
  ));
  assert.ok(itemButton);
  (itemButton.props.onClick as () => void)();
  assert.deepEqual(opened, [{
    flowRef: FLOW_REF,
    itemRef: BETA_REF,
    resultView: 'calendar',
    selectedDate: '2026-09-10',
    returnFocusSelector: '#personal-workspace-result-calendar-item-1',
  }]);
});

test('month shifting is timezone-free, clamps month end, and fails closed for invalid input', () => {
  assert.equal(shiftPersonalWorkspacePocResultMonth('2026-01-31', 1), '2026-02-28');
  assert.equal(shiftPersonalWorkspacePocResultMonth('2024-01-31', 1), '2024-02-29');
  assert.equal(shiftPersonalWorkspacePocResultMonth('2026-01-15', -1), '2025-12-15');
  assert.equal(shiftPersonalWorkspacePocResultMonth('2026-02-30', 1), null);
  assert.equal(shiftPersonalWorkspacePocResultMonth('not-a-date', -1), null);
});

test('local download uses one transient Blob URL and always cleans it up without storage', async () => {
  const calls: string[] = [];
  let attachedFilename = '';
  let attachedUrl = '';
  let capturedBlob: Blob | undefined;
  triggerPersonalWorkspacePocLocalResultDownload(projection.downloads!.csv, {
    createObjectUrl: (blob) => {
      capturedBlob = blob;
      calls.push('create');
      return 'blob:poc-result';
    },
    attachAnchor: (filename, url) => {
      attachedFilename = filename;
      attachedUrl = url;
      calls.push('attach');
      return {
        click: () => calls.push('click'),
        remove: () => calls.push('remove'),
      };
    },
    revokeObjectUrl: (url) => calls.push(`revoke:${url}`),
  });

  assert.deepEqual(calls, ['create', 'attach', 'click', 'remove', 'revoke:blob:poc-result']);
  assert.equal(attachedFilename, 'flow-내-이사-준비-copy-one.csv');
  assert.equal(attachedUrl, 'blob:poc-result');
  assert.equal(capturedBlob?.type, 'text/csv;charset=utf-8');
  const bytes = new Uint8Array(await capturedBlob?.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.equal(new TextDecoder().decode(bytes), projection.downloads!.csv.payload.slice(1));
});

test('TXT and Sheet panels expose keyboard buttons for deterministic local files', () => {
  const textMarkup = renderToStaticMarkup(
    <PersonalWorkspacePocResultPresenter {...presenterProps('text')} />,
  );
  assert.match(textMarkup, /data-testid="personal-workspace-result-txt-download"/u);
  assert.match(textMarkup, />TXT 다운로드<\/button>/u);

  const sheetMarkup = renderToStaticMarkup(
    <PersonalWorkspacePocResultPresenter {...presenterProps('sheet')} />,
  );
  assert.match(sheetMarkup, /data-testid="personal-workspace-result-csv-download"/u);
  assert.match(sheetMarkup, />CSV 다운로드<\/button>/u);
  assert.match(sheetMarkup, /data-testid="personal-workspace-result-csv-download-status"[^>]*role="status" aria-live="polite"/u);
});

test('tab arrow navigation moves focus and emits the next controlled view', () => {
  const views: PersonalWorkspacePocResultView[] = [];
  const tree = PersonalWorkspacePocResultPresenter(presenterProps('todo', {
    onResultViewChange: (view) => views.push(view),
  }));
  const todoTab = findElement(tree, (element) => (
    element.props['data-testid'] === 'personal-workspace-result-view-todo'
  ));
  assert.ok(todoTab);
  const focused = [0, 0, 0, 0];
  const fakeTabs = focused.map((_, index) => ({
    focus: () => { focused[index] += 1; },
  }));
  let prevented = 0;
  (todoTab.props.onKeyDown as (event: unknown) => void)({
    key: 'ArrowRight',
    preventDefault: () => { prevented += 1; },
    currentTarget: {
      closest: () => ({ querySelectorAll: () => fakeTabs }),
    },
  });
  assert.deepEqual(views, ['calendar']);
  assert.deepEqual(focused, [0, 0, 1, 0]);
  assert.equal(prevented, 1);
});

test('presenter source has no operating storage, Calendar route, Sheet, or operating export writer seam', () => {
  const source = readFileSync(
    new URL('./PersonalWorkspacePocResultPresenter.tsx', import.meta.url),
    'utf8',
  );
  assert.deepEqual(PERSONAL_WORKSPACE_POC_RESULT_FORBIDDEN_CAPABILITIES, {
    operatingWriter: false,
    actualCalendarRoute: false,
    sheet: false,
    operatingExportWriter: false,
    localFileDownload: true,
  });
  assert.equal(Object.isFrozen(PERSONAL_WORKSPACE_POC_RESULT_FORBIDDEN_CAPABILITIES), true);
  assert.doesNotMatch(source, /from ['"].*(?:storage|export)['"]/u);
  assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage|savePersonalWorkspacePocState|commitPersonalWorkspacePocStorage|exportFlow|downloadFlow)\b/u);
  assert.doesNotMatch(source, /href\s*=\s*["'{`]\/calendar/u);
  assert.doesNotMatch(source, /<a\b/u);
  assert.doesNotMatch(source, /\buse(?:State|Effect|Reducer)\b/u);
  assert.match(source, /TXT를 복사했어요\. 데이터는 바뀌지 않았어요\./u);
  assert.match(source, /\$\{label\} 다운로드를 요청했어요\. 데이터는 바뀌지 않았어요\./u);
  assert.doesNotMatch(source, /파일을 내려받았어요/u);
});
