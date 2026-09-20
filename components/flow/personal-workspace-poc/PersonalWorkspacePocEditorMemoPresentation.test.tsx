import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  PersonalWorkspacePocItemEditorSurface,
  type PersonalWorkspacePocEditorSourceSummary,
  type PersonalWorkspacePocPlanItemEditorSurfaceProps,
} from './PersonalWorkspacePocEditorSurface';
import {
  PERSONAL_WORKSPACE_POC_PLAN_EDITOR_VERSION,
  type PersonalWorkspacePocPlanItemDraft,
} from '@/lib/flow/personal-workspace-poc-plan-editor';

const DESCRIPTION = '읽기 전용 원문 설명';
const CRITERION = '확인 번호를 받았다';
const baseDraft: PersonalWorkspacePocPlanItemDraft = {
  version: PERSONAL_WORKSPACE_POC_PLAN_EDITOR_VERSION,
  guardId: 'memo-ui-guard',
  identity: { itemRef: 'flow-item:copy:flow:item', savedCopyId: 'copy', flowId: 'flow', itemId: 'item' },
  title: { mode: 'inherit' }, memo: { mode: 'inherit' }, schedule: { mode: 'inherit' },
};

type Element = React.ReactElement<Record<string, unknown>>;
function find(node: React.ReactNode, predicate: (element: Element) => boolean): Element | undefined {
  if (!React.isValidElement<Record<string, unknown>>(node)) return undefined;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props.children as React.ReactNode)) {
    const result = find(child, predicate);
    if (result) return result;
  }
}

function editor(source: PersonalWorkspacePocEditorSourceSummary, draft = baseDraft) {
  let changed: PersonalWorkspacePocPlanItemDraft | undefined;
  const props: PersonalWorkspacePocPlanItemEditorSurfaceProps = {
    adapter: 'plan-item', draft, source,
    transaction: { status: 'clean', pendingClose: false },
    actions: { onRequestClose() {}, onContinueEditing() {}, onDiscardChanges() {} },
    execution: { dateLabel: '2026-09-07', completionLabel: '진행 중' },
    impact: { targetLabel: '부모 초안', affectedCount: 0, changes: [] },
    parentFlowRef: 'flow:copy:flow', parentTitle: '가져온 Flow',
    onDraftChange(value) { changed = value; }, onApplyToParentDraft() {},
  };
  const tree = PersonalWorkspacePocItemEditorSurface(props);
  const control = find(tree, element => element.props.id === 'personal-workspace-poc-item-memo');
  assert.ok(control && typeof control.type === 'function');
  const renderedControl = (control.type as (props: Record<string, unknown>) => React.ReactNode)(control.props);
  const mode = find(renderedControl, element => element.props['data-testid'] === 'personal-workspace-item-memo-mode');
  assert.ok(mode);
  return { tree, control, renderedControl, mode, changed: () => changed,
    choose(value: 'inherit' | 'override') {
      (mode.props.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
      return changed!;
    } };
}

function source(inheritedPersonalMemo?: string): PersonalWorkspacePocEditorSourceSummary {
  // This is a presentation input, not a FlowItem/schema fixture. Its producer is
  // separately asserted to read the exact existing-personal owner helper.
  return { title: '원문 할 일', description: DESCRIPTION, completionCriterion: CRITERION,
    ...(inheritedPersonalMemo === undefined ? {} : { inheritedPersonalMemo }) };
}

for (const [name, value] of [
  ['ordinary', '가져올 때 이미 있던 개인 메모'],
  ['empty', ''],
  ['whitespace', ' \t  '],
  ['CRLF', '첫 줄\r\n둘째 줄  '],
  ['source-equal', DESCRIPTION],
] as const) {
  test(`B0-M UI imported ${name} baseline has its own label and exact controlled value`, () => {
    const presentation = source(value), original = JSON.stringify({ presentation, baseDraft });
    const view = editor(presentation);
    const markup = renderToStaticMarkup(view.tree);
    assert.match(markup, /기존 개인 메모 유지/u);
    assert.doesNotMatch(renderToStaticMarkup(view.renderedControl), /개인 메모 없음/u);
    assert.equal(view.control.props.inheritedValue, value);
    const baseline = find(view.renderedControl, element => element.props['data-testid'] === 'personal-workspace-item-memo-inherited');
    assert.ok(baseline, 'the actual baseline is visible in the personal field, not inferred from source description');
    assert.equal(baseline.props.children, value === '' ? '(빈 메모)' : value);
    assert.match(String(baseline.props.className), /whitespace-pre-wrap/u);
    assert.match(String(baseline.props.className), /overflow-wrap:anywhere/u);
    const next = view.choose('override');
    assert.deepEqual(next.memo, { mode: 'override', value });
    assert.deepEqual(next.title, baseDraft.title);
    assert.deepEqual(next.schedule, baseDraft.schedule);
    assert.equal(JSON.stringify({ presentation, baseDraft }), original);
    const sourceMarkup = markup.slice(markup.indexOf('data-editor-field-group="source-read-only"'), markup.indexOf('data-editor-field-group="personal-editable"'));
    assert.ok(sourceMarkup.includes(DESCRIPTION) && sourceMarkup.includes(CRITERION));
    assert.doesNotMatch(sourceMarkup, /<(?:input|textarea|select)\b/u);
  });
}

test('B0-M UI missing imported baseline keeps the no-memo path and never seeds source instructions', () => {
  const view = editor(source());
  assert.match(renderToStaticMarkup(view.renderedControl), /개인 메모 없음/u);
  assert.match(renderToStaticMarkup(view.renderedControl), /개인 메모를 따로 저장하지 않습니다/u);
  assert.equal(find(view.renderedControl, element => element.props['data-testid'] === 'personal-workspace-item-memo-inherited'), undefined);
  assert.deepEqual(view.choose('override').memo, { mode: 'override', value: '' });
});

test('B0-M UI current override is not replaced by imported baseline; inherit removes only the mode override', () => {
  const draft: PersonalWorkspacePocPlanItemDraft = { ...baseDraft, memo: { mode: 'override', value: '' } };
  const current = editor(source('기존 메모\r\n원형'), draft);
  const input = find(current.renderedControl, element => element.props['data-testid'] === 'personal-workspace-item-memo');
  assert.ok(input); assert.equal(input.props.value, '');
  assert.deepEqual(current.choose('override').memo, { mode: 'override', value: '' });
  const inherited = current.choose('inherit');
  assert.deepEqual(inherited.memo, { mode: 'inherit' });
  assert.deepEqual(editor(source('기존 메모\r\n원형'), inherited).choose('override').memo, { mode: 'override', value: '기존 메모\r\n원형' });
  assert.deepEqual(draft.memo, { mode: 'override', value: '' });
});

test('B0-M UI producer reads the source Item exact personal baseline helper, not effective memo or description', () => {
  const surface = readFileSync('components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx', 'utf8');
  assert.ok(/inheritedPersonalMemo:\s*getPersonalWorkspacePocInheritedMemo\(sourceItem\)/u.test(surface), 'the source Item helper must supply the presentation prop');
  assert.ok(!/inheritedPersonalMemo:\s*(?:sourceItem\.description|sourceDetails\.description|task\??\.memo)/u.test(surface), 'source instructions and effective PoC memo are not imported baselines');
});
