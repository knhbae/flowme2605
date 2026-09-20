import './test-css-modules';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { PersonalWorkspacePocResultPresenter, type PersonalWorkspacePocResultPresenterProps } from '../personal-workspace-poc/PersonalWorkspacePocResultPresenter';
import { previewProgramCreatorSource } from '../../../lib/flow/integrated-poc/creator-workspace';
import { ProgramCreatorNativeResult } from './ProgramCreatorNativeContext';
import { createTextAuthoringDocument } from '../../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/parser';
import { createNativeCreatorDocumentOwner } from '../../../lib/flow/integrated-poc/native-creator-document';
import { listPersonalWorkspacePocStructureTemplatePreviews } from '../../../lib/flow/personal-workspace-poc-structure-template/preview-adapter';
import { prepareProgramCreatorStructure } from '../../../lib/flow/integrated-poc/creator-structure-sidecar';
const now = '2026-09-14T06:00:00.000Z';
function props(): PersonalWorkspacePocResultPresenterProps {
  const preview = previewProgramCreatorSource({ draftId: 'test-result', title: '내 결과', rawText: '# 내 결과\n- [ ] 시험\n  - 날짜: 2026-12-22', baseRecordRevision: null }, '2026-09-14', now);
  assert(preview.result?.ok);
  return { projection: preview.result.projection, navigation: { resultView: 'calendar' }, readOnly: true,
    onResultViewChange() {}, onCalendarBaseDateChange() {}, onCalendarSelectedDateChange() {}, onOpenItem() {} };
}
function nodes(node: any): any[] { return Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : []; }
test('TR creator scope styles actual raw and native selection states over generic buttons', () => {
  const css=readFileSync(new URL('./ProgramCreatorWorkspace.module.css',import.meta.url),'utf8');
  assert(css.includes('.workspace [role="tab"][aria-selected="true"],.workspace [aria-label="제작 결과 종류"] button[aria-pressed="true"]{background:#126e61;color:#fff;'));
});
test('TR presenter default four views and legacy txt remain unchanged', () => {
  const p = props();
  assert.deepEqual(nodes(PersonalWorkspacePocResultPresenter(p)).filter(n => n.props.role === 'tab').map(n => n.props.children), ['TXT', '할 일', '캘린더', '표']);
  assert.match(renderToStaticMarkup(<PersonalWorkspacePocResultPresenter {...p} navigation={{ resultView: 'txt' }} />), /data-result-view="txt"/);
});
test('TR restricted views preserve order, no hidden Sheet and keyboard follows only rendered tabs', () => {
  const chosen: string[] = [], p = { ...props(), availableViews: ['calendar', 'todo', 'text'] as const, onResultViewChange: (v: string) => chosen.push(v) };
  const tree = PersonalWorkspacePocResultPresenter(p), tabs = nodes(tree).filter(n => n.props.role === 'tab');
  assert.deepEqual(tabs.map(n => n.props.children), ['캘린더', '할 일', 'TXT']);
  const focus: number[] = []; let prevented = 0;
  const currentTarget = { closest: () => ({ querySelectorAll: () => tabs.map((_: any, i: number) => ({ focus: () => focus.push(i) })) }) };
  for (const [index, key] of [[0, 'ArrowLeft'], [2, 'ArrowRight'], [1, 'End'], [2, 'Home']] as const)
    tabs[index].props.onKeyDown({ key, currentTarget, preventDefault: () => prevented++ });
  assert.deepEqual(chosen, ['text', 'calendar', 'text', 'calendar']); assert.deepEqual(focus, [2, 0, 2, 0]); assert.equal(prevented, 4);
  const html = renderToStaticMarkup(tree); assert(!html.includes('personal-workspace-result-view-sheet')); assert(html.includes('grid-cols-3'));
});
test('TR restricted unavailable selection and empty port fall back to a visible tab and matching panel', () => {
  const p = props();
  for (const availableViews of [['todo', 'text'], []] as const) {
    const tree = PersonalWorkspacePocResultPresenter({ ...p, availableViews, navigation: { resultView: 'sheet' } });
    const active = nodes(tree).filter(n => n.props.role === 'tab' && n.props['aria-selected']);
    assert.equal(active.length, 1);
    assert.equal(nodes(tree).find(n => n.props.role === 'tabpanel').props['aria-labelledby'], active[0].props.id);
    assert(!renderToStaticMarkup(tree).includes('data-testid="personal-workspace-result-sheet-panel"'));
  }
});
test('TR native template result keeps source and review boundary while hiding unsupported Sheet', () => {
  const entry = listPersonalWorkspacePocStructureTemplatePreviews()[5], draftId = 'native-exam-policy';
  const prepared = prepareProgramCreatorStructure({ catalogVersion: entry.catalogVersion, draft: { ...entry.inputDraft, draftId } }, { draftId, rawText: '', now }); assert(prepared.ok);
  const document = createTextAuthoringDocument(prepared.value.command.nextRawText, { documentId: draftId, ownership: 'creator', now });
  const owner = createNativeCreatorDocumentOwner({ id: draftId, source: { storageKey: 'flow:text-authoring:drafts:v1', draftId, versionId: 'v1', revisionId: document.revision.revisionId, documentJson: JSON.stringify(document) } }, now); assert(owner.ok);
  const before = JSON.stringify(owner.owner), html = renderToStaticMarkup(<ProgramCreatorNativeResult owner={owner.owner} draftId={draftId} structure={prepared.value.after} />);
  assert.match(html, /aria-pressed="true">캘린더/); assert(!html.includes('>시트 ·')); assert(html.includes('보존된 전체 원문'));
  assert.equal(JSON.stringify(owner.owner), before);
  const ordinary = renderToStaticMarkup(<ProgramCreatorNativeResult owner={owner.owner} />); assert(ordinary.includes('>시트 ·'));
});
