import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { FlowEditorSurface } from '../FlowEditorSurface';
import {
  PERSONAL_WORKSPACE_POC_EDITOR_FORBIDDEN_CAPABILITIES,
  PersonalWorkspacePocItemEditorSurface,
  PersonalWorkspacePocPlanEditorSurface,
  type PersonalWorkspacePocEditorCommonActions,
  type PersonalWorkspacePocEditorImpactSummary,
  type PersonalWorkspacePocEditorTransactionView,
  type PersonalWorkspacePocQuickItemRootDraft,
} from './PersonalWorkspacePocEditorSurface';
import {
  PERSONAL_WORKSPACE_POC_PLAN_EDITOR_VERSION,
  type PersonalWorkspacePocPlanDraft,
  type PersonalWorkspacePocPlanItemDraft,
} from '@/lib/flow/personal-workspace-poc-plan-editor';

function itemDraft(
  itemId: string,
  title: PersonalWorkspacePocPlanItemDraft['title'] = { mode: 'inherit' },
): PersonalWorkspacePocPlanItemDraft {
  return {
    version: PERSONAL_WORKSPACE_POC_PLAN_EDITOR_VERSION,
    guardId: 'guard-1',
    identity: {
      itemRef: `flow-item:copy-1:flow-1:${itemId}`,
      savedCopyId: 'copy-1',
      flowId: 'flow-1',
      itemId,
    },
    title,
    memo: { mode: 'inherit' },
    schedule: { mode: 'inherit' },
  };
}

function planDraft(): PersonalWorkspacePocPlanDraft {
  const first = itemDraft('item-1');
  const second = itemDraft('item-2', { mode: 'override', value: '바꾼 두 번째' });
  return {
    version: PERSONAL_WORKSPACE_POC_PLAN_EDITOR_VERSION,
    guardId: 'guard-1',
    flowRef: 'flow:copy-1:flow-1',
    savedCopyId: 'copy-1',
    flowId: 'flow-1',
    origin: 'source-backed-map',
    title: { mode: 'inherit' },
    orderedItemRefs: [first.identity.itemRef, second.identity.itemRef],
    items: {
      [first.identity.itemRef]: first,
      [second.identity.itemRef]: second,
    },
  };
}

const cleanTransaction: PersonalWorkspacePocEditorTransactionView = {
  status: 'clean',
  pendingClose: false,
};

const dirtyTransaction: PersonalWorkspacePocEditorTransactionView = {
  status: 'dirty-valid',
  pendingClose: true,
};

const recoverableTransaction: PersonalWorkspacePocEditorTransactionView = {
  status: 'recoverable-error',
  pendingClose: false,
  failure: {
    kind: 'storage',
    code: 'storage-failed',
    message: '저장하지 못했습니다.',
    firstErrorFocus: '[data-editor-error-summary]',
  },
};

const noopActions: PersonalWorkspacePocEditorCommonActions = {
  onRequestClose: () => undefined,
  onContinueEditing: () => undefined,
  onDiscardChanges: () => undefined,
};

const planImpact: PersonalWorkspacePocEditorImpactSummary = {
  targetLabel: '개인 Plan shadow',
  affectedCount: 2,
  includedCount: 2,
  excludedCount: 0,
  changes: [{
    owner: 'poc-personal-plan',
    field: 'title',
    label: '개인 Flow 제목',
    before: '이사 준비',
    after: '나의 이사 준비',
  }],
};

const source = {
  ownerLabel: 'source baseline',
  title: '이사 준비',
  description: '원본 설명은 바뀌지 않습니다.',
  originalScheduleLabel: '2026-09-12',
  sourceLabel: '공식 안내',
  sourceUrl: 'https://example.com/source',
  completionCriterion: '확인한 내용을 기록합니다.',
} as const;

function assertOrdered(markup: string, markers: readonly string[]) {
  let previous = -1;
  for (const marker of markers) {
    const current = markup.indexOf(marker);
    assert.ok(current >= 0, `missing marker: ${marker}`);
    assert.ok(current > previous, `out of order: ${marker}`);
    previous = current;
  }
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

function frameProps(node: React.ReactElement) {
  assert.equal(node.type, FlowEditorSurface);
  return node.props as React.ComponentProps<typeof FlowEditorSurface>;
}

test('Plan presenter keeps source read-only before personal fields, Item order, and impact', () => {
  const draft = {
    ...planDraft(),
    sectionTitles: { 'section-1': { mode: 'override' as const, value: '내 준비' } },
  };
  const markup = renderToStaticMarkup(
    <PersonalWorkspacePocPlanEditorSurface
      draft={draft}
      transaction={cleanTransaction}
      actions={noopActions}
      source={source}
      sections={[{ sectionId: 'section-1', sourceTitle: '준비' }]}
      items={[
        {
          itemRef: draft.orderedItemRefs[0],
          sourceTitle: '첫 번째',
          sectionTitle: '준비',
          planDateLabel: '2026-09-12',
        },
        {
          itemRef: draft.orderedItemRefs[1],
          sourceTitle: '두 번째',
          effectiveTitle: '바꾼 두 번째',
        },
      ]}
      impact={planImpact}
      onDraftChange={() => undefined}
      onOpenItem={() => undefined}
      onCommitIntent={() => undefined}
    />,
  );

  assertOrdered(markup, [
    'data-editor-field-group="target"',
    'data-editor-field-group="source-read-only"',
    'data-editor-field-group="personal-editable"',
    'data-editor-field-group="plan-items"',
    'data-editor-field-group="impact-summary"',
  ]);
  const sourceStart = markup.indexOf('data-editor-field-group="source-read-only"');
  const personalStart = markup.indexOf('data-editor-field-group="personal-editable"');
  const sourceMarkup = markup.slice(sourceStart, personalStart);
  assert.doesNotMatch(sourceMarkup, /<(?:input|textarea|select)\b/u);
  assert.match(markup, /data-editor-schema-fields="source-read-only,personal-title,personal-section-title,plan-items,impact-summary"/u);
  assert.match(markup, /data-editor-persistence-scope="poc-shadow-only"/u);
  assert.match(markup, /data-flow-ref="flow:copy-1:flow-1"/u);
  assert.match(markup, /data-origin="source-backed-map"/u);
  assert.match(markup, /data-testid="personal-workspace-plan-item-list"/u);
  assert.match(markup, /data-editor-actions-sticky="true"/u);
  assert.match(markup, /\[&amp;_button\]:min-h-12/u);
  assert.match(markup, /원본 설명은 바뀌지 않습니다/u);
  assert.match(markup, /나의 이사 준비/u);
  assert.match(markup, /data-testid="personal-workspace-plan-section-title-list"/u);
  assert.match(markup, /data-personal-plan-section-title="true"/u);
  assert.match(markup, /내 준비/u);
  assert.doesNotMatch(markup, /Flow 메모|Flow 계획 날짜|내보내기|다운로드/u);
});

test('Plan presenter emits section-title draft changes only for supplied editable sections', () => {
  const draft: PersonalWorkspacePocPlanDraft = {
    ...planDraft(),
    sectionTitles: { personal: { mode: 'inherit' } },
  };
  let changed: PersonalWorkspacePocPlanDraft | undefined;
  const editor = PersonalWorkspacePocPlanEditorSurface({
    draft,
    transaction: cleanTransaction,
    actions: noopActions,
    source,
    sections: [{ sectionId: 'personal', sourceTitle: '준비' }],
    items: [],
    impact: planImpact,
    onDraftChange: (next) => { changed = next; },
    onOpenItem: () => undefined,
    onCommitIntent: () => undefined,
  });
  const control = findElement(
    frameProps(editor).children,
    (element) => element.props.valueTestId === 'personal-workspace-plan-section-title-personal',
  );
  assert.ok(control);
  (control.props.onChange as (value: unknown) => void)({ mode: 'override', value: '내 실행 준비' });
  assert.deepEqual(changed?.sectionTitles, {
    personal: { mode: 'override', value: '내 실행 준비' },
  });

  const withoutEditable = renderToStaticMarkup(PersonalWorkspacePocPlanEditorSurface({
    draft: planDraft(), transaction: cleanTransaction, actions: noopActions, source,
    sections: [], items: [], impact: planImpact,
    onDraftChange: () => undefined, onOpenItem: () => undefined, onCommitIntent: () => undefined,
  }));
  assert.doesNotMatch(withoutEditable, /personal-workspace-plan-section-title-list/u);
});

test('Plan presenter emits typed shadow intent and only reorders its controlled draft', () => {
  const draft = planDraft();
  let changed: PersonalWorkspacePocPlanDraft | undefined;
  let committed: unknown;
  let opened: unknown;
  const editor = PersonalWorkspacePocPlanEditorSurface({
    draft,
    transaction: cleanTransaction,
    actions: noopActions,
    source,
    items: [
      { itemRef: draft.orderedItemRefs[0], sourceTitle: '첫 번째' },
      { itemRef: draft.orderedItemRefs[1], sourceTitle: '두 번째' },
    ],
    impact: planImpact,
    onDraftChange: (next) => { changed = next; },
    onOpenItem: (intent) => { opened = intent; },
    onCommitIntent: (intent) => { committed = intent; },
  });
  const frame = frameProps(editor);

  frame.primaryAction.onAction();
  assert.deepEqual(committed, {
    kind: 'commit-personal-plan',
    scope: 'poc-shadow',
    flowRef: draft.flowRef,
    draft,
  });

  const moveDown = findElement(
    frame.children,
    (element) => element.props['aria-label'] === '첫 번째 아래로 이동',
  );
  assert.ok(moveDown);
  (moveDown.props.onClick as () => void)();
  assert.deepEqual(changed?.orderedItemRefs, [...draft.orderedItemRefs].reverse());
  assert.deepEqual(draft.orderedItemRefs, [
    'flow-item:copy-1:flow-1:item-1',
    'flow-item:copy-1:flow-1:item-2',
  ]);

  const openSecond = findElement(
    frame.children,
    (element) => element.props['data-item-ref'] === draft.orderedItemRefs[1]
      && element.props['data-testid'] === 'personal-workspace-plan-item-open',
  );
  assert.ok(openSecond);
  (openSecond.props.onClick as () => void)();
  assert.deepEqual(opened, {
    parentFlowRef: draft.flowRef,
    itemRef: draft.orderedItemRefs[1],
    returnFocusSelector: '#personal-workspace-poc-plan-item-1',
  });
});

test('Plan Item presenter uses parent-draft-only apply and never exposes source controls', () => {
  const draft: PersonalWorkspacePocPlanItemDraft = {
    ...itemDraft('item-1', { mode: 'override', value: '개인 제목' }),
    memo: { mode: 'override', value: '개인 메모' },
    schedule: { mode: 'fixed_date', date: '2026-09-18' },
  };
  let applied: unknown;
  const element = (
    <PersonalWorkspacePocItemEditorSurface
      adapter="plan-item"
      draft={draft}
      transaction={cleanTransaction}
      actions={noopActions}
      source={source}
      execution={{
        periodLabel: '이번 주',
        dateLabel: '2026-09-20',
        orderLabel: '두 번째',
        completionLabel: '진행 전',
      }}
      impact={{ ...planImpact, targetLabel: '부모 Plan 초안', affectedCount: 1 }}
      parentFlowRef="flow:copy-1:flow-1"
      parentTitle="이사 준비"
      onDraftChange={() => undefined}
      onApplyToParentDraft={(intent) => { applied = intent; }}
    />
  );
  const markup = renderToStaticMarkup(element);
  assertOrdered(markup, [
    'data-editor-field-group="target"',
    'data-editor-field-group="source-read-only"',
    'data-editor-field-group="personal-editable"',
    'data-editor-field-group="execution-read-only"',
    'data-editor-field-group="impact-summary"',
  ]);
  const sourceStart = markup.indexOf('data-editor-field-group="source-read-only"');
  const personalStart = markup.indexOf('data-editor-field-group="personal-editable"');
  assert.doesNotMatch(markup.slice(sourceStart, personalStart), /<(?:input|textarea|select)\b/u);
  assert.match(markup, /data-editor-persistence-scope="parent-draft-only"/u);
  assert.match(markup, /data-editor-commit-role="apply-item-to-parent-personal-draft"/u);
  assert.match(markup, /data-testid="personal-workspace-item-schedule-date"/u);
  assert.match(markup, /data-testid="personal-workspace-item-title-mode"/u);
  assert.match(markup, /data-testid="personal-workspace-item-title-input"/u);
  assert.match(markup, /data-testid="personal-workspace-item-memo"/u);
  assert.match(markup, /data-item-ref="flow-item:copy-1:flow-1:item-1"/u);
  assert.match(markup, /data-parent-flow-ref="flow:copy-1:flow-1"/u);
  assert.match(markup, />계획에 반영</u);
  assert.doesNotMatch(markup, /내보내기|다운로드|source 역/u);

  const editor = PersonalWorkspacePocItemEditorSurface({
    adapter: 'plan-item',
    draft,
    transaction: cleanTransaction,
    actions: noopActions,
    source,
    execution: {},
    impact: { ...planImpact, targetLabel: '부모 Plan 초안', affectedCount: 1 },
    parentFlowRef: 'flow:copy-1:flow-1',
    parentTitle: '이사 준비',
    onDraftChange: () => undefined,
    onApplyToParentDraft: (intent) => { applied = intent; },
  });
  frameProps(editor).primaryAction.onAction();
  assert.deepEqual(applied, {
    kind: 'apply-item-to-parent-personal-draft',
    persistence: 'parent-draft-only',
    parentFlowRef: 'flow:copy-1:flow-1',
    itemRef: draft.identity.itemRef,
    draft,
  });
});

test('dirty close causes share one guarded confirmation and preserve controller callbacks', () => {
  const closeEvents: string[] = [];
  let continued = 0;
  let discarded = 0;
  const editor = PersonalWorkspacePocPlanEditorSurface({
    draft: planDraft(),
    transaction: dirtyTransaction,
    actions: {
      onRequestClose: (event) => closeEvents.push(event),
      onContinueEditing: () => { continued += 1; },
      onDiscardChanges: () => { discarded += 1; },
    },
    source,
    items: [],
    impact: planImpact,
    onDraftChange: () => undefined,
    onOpenItem: () => undefined,
    onCommitIntent: () => undefined,
  });
  const frame = frameProps(editor);

  frame.onRequestClose('escape');
  frame.onRequestClose('backdrop');
  frame.onRequestClose('x');
  frame.cancelAction.onAction();
  assert.deepEqual(closeEvents, ['escape', 'backdrop', 'x', 'cancel']);
  assert.equal(frame.discardConfirmation?.open, true);
  frame.discardConfirmation?.onContinueEditing();
  frame.discardConfirmation?.onDiscardChanges();
  assert.equal(continued, 1);
  assert.equal(discarded, 1);

  const markup = renderToStaticMarkup(editor);
  assert.match(markup, /role="alertdialog"/u);
  assert.match(markup, /data-editor-discard-action="continue-editing"/u);
  assert.match(markup, /data-editor-discard-action="discard-changes"/u);
});

test('QuickItem uses a typed root transaction without inventing a parent Flow or empty source panel', () => {
  const draft: PersonalWorkspacePocQuickItemRootDraft = {
    itemRef: 'quick-item:one',
    title: '택배 찾기',
    memo: '경비실 확인',
    executionDate: '2026-09-02',
  };
  let committed: unknown;
  const editor = PersonalWorkspacePocItemEditorSurface({
    adapter: 'quick-item-root',
    draft,
    transaction: cleanTransaction,
    actions: noopActions,
    execution: { periodLabel: '오늘', completionLabel: '진행 전' },
    impact: {
      targetLabel: '개인 QuickItem shadow',
      affectedCount: 1,
      changes: [{
        owner: 'execution',
        field: 'date',
        label: '실행일',
        before: null,
        after: '2026-09-02',
      }],
    },
    onDraftChange: () => undefined,
    onCommitIntent: (intent) => { committed = intent; },
  });
  const frame = frameProps(editor);
  assert.equal(frame.level, 'plan');
  assert.equal(frame.commitRole, 'save-personal-overlay');
  frame.primaryAction.onAction();
  assert.deepEqual(committed, {
    kind: 'commit-quick-item-root',
    scope: 'poc-shadow',
    itemRef: draft.itemRef,
    draft,
  });
  assert.equal('parentFlowRef' in (committed as Record<string, unknown>), false);

  const markup = renderToStaticMarkup(editor);
  assert.match(markup, /data-personal-workspace-editor-kind="quick-item-root"/u);
  assert.doesNotMatch(markup, /data-editor-field-group="source-read-only"/u);
  assert.match(markup, /data-editor-field-group="execution-editable"/u);
  assert.match(markup, /data-editor-schema-fields="personal-title,personal-memo,execution-date,impact-summary"/u);
  assert.match(markup, /data-editor-persistence-scope="poc-shadow-only"/u);
});

test('recoverable error disables default save and exposes only the same-intent retry action', () => {
  const plan = PersonalWorkspacePocPlanEditorSurface({
    draft: planDraft(),
    transaction: recoverableTransaction,
    actions: { ...noopActions, onRetry: () => undefined },
    source,
    items: [],
    impact: planImpact,
    onDraftChange: () => undefined,
    onOpenItem: () => undefined,
    onCommitIntent: () => undefined,
  });
  assert.equal(frameProps(plan).primaryAction.disabled, true);
  assert.equal(frameProps(plan).retryAction?.testId, 'personal-workspace-poc-plan-editor-retry');

  const quick = PersonalWorkspacePocItemEditorSurface({
    adapter: 'quick-item-root',
    draft: {
      itemRef: 'quick-item:one',
      title: '택배 찾기',
      memo: '',
    },
    transaction: recoverableTransaction,
    actions: { ...noopActions, onRetry: () => undefined },
    execution: {},
    impact: { ...planImpact, affectedCount: 1 },
    onDraftChange: () => undefined,
    onCommitIntent: () => undefined,
  });
  assert.equal(frameProps(quick).primaryAction.disabled, true);
  assert.equal(frameProps(quick).retryAction?.testId, 'personal-workspace-poc-item-editor-retry');
});

test('presenter exports fail-closed capability metadata for forbidden Stage 3 integrations', () => {
  assert.deepEqual(PERSONAL_WORKSPACE_POC_EDITOR_FORBIDDEN_CAPABILITIES, {
    operatingWriter: false,
    actualCalendarRoute: false,
    exportOrDownload: false,
    sourceReverseEdit: false,
  });
  assert.equal(Object.isFrozen(PERSONAL_WORKSPACE_POC_EDITOR_FORBIDDEN_CAPABILITIES), true);
});
