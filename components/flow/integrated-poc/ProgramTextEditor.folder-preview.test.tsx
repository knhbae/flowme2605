import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from '../../../lib/flow/integrated-poc/text-workspace';
import { programFolderLinkPreview, isProgramFolderLinkPreviewCurrent, type ProgramFolderLinkPreview } from '../../../lib/flow/integrated-poc/folder-link-preview';
import { programFolderLineTitle, linkProgramFolder } from '../../../lib/flow/integrated-poc/folder-link-slot';
import { programFolderInputSuggestion, programFolderPath, programFolderSuggestionPreservesSource } from '../../../lib/flow/integrated-poc/folder-link-suggestions';

// Run production functions and JSX with the real model/helper. Native dialog geometry is separate browser QA.
const source = readFileSync(new URL('./ProgramTextEditor.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramTextEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate: (node: ts.Node) => boolean): ts.Node {
  let result: ts.Node | undefined;
  function visit(node: ts.Node) { if (!result && predicate(node)) result = node; if (!result) ts.forEachChild(node, visit); }
  visit(ast); assert(result); return result;
}
function evaluate(expression: string, context: Record<string, unknown>) {
  const code = ts.transpileModule('const value = ' + expression + ';', { fileName: 'fragment.tsx', compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React,
  } }).outputText;
  return new Function('React', ...Object.keys(context), code + '; return value;')(React, ...Object.values(context));
}
function actualFunction(name: string, context: Record<string, unknown>) {
  const node = find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  return evaluate('(' + node.getText(ast) + ')', context);
}
function actualVariable(name: string, context: Record<string, unknown>) {
  const node = find(node => ts.isVariableDeclaration(node) && node.name.getText(ast) === name) as ts.VariableDeclaration;
  return evaluate(node.initializer!.getText(ast), context);
}
const styles = new Proxy({}, { get: (_, key) => String(key) });
type FolderPanel = { kind: 'folder'; lineId: string | null; folderSuggestionTitle?: string; folderLinkPreview: ProgramFolderLinkPreview };
function harness(raw = '- 미분류') {
  let working = M.addDocument(createEmptyTextWorkspace(), { title: '폴더 위치 문서' });
  const docId = working.documents[0].id;
  working = M.editText(working, docId, raw);
  const lineId = working.documents[0].lines[0]?.id ?? null;
  const props = { docId, workspace: working, readOnly: false, folderId: null as string | null };
  const propsRef = { current: { ...props } }, composingRef = { current: false }, inputLockedRef = { current: false };
  const area = { value: raw, selectionStart: raw.length, selectionEnd: raw.length };
  const h = {
    working, props, propsRef, composingRef, inputLockedRef, area, lineId, panel: null as FolderPanel | null,
    folderName: '', invalid: false, saving: false, messages: [] as string[], applied: [] as { next: TextWorkspaceState; label: string }[],
    links: [] as unknown[][], closeCount: 0, focusCount: 0, cancelCount: 0, saveCount: 0,
    suggestion: programFolderInputSuggestion(working, docId, lineId), suggestionLineRef: { current: lineId },
    saveNow: async () => true,
  };
  const draftRef = { current: { getState: () => ({ working: h.working, committed: props.workspace,
    raw: M.raw(M.getDocument(h.working, propsRef.current.docId)), invalid: h.invalid, saving: h.saving }) } };
  function context(extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      M, props, propsRef, composingRef, inputLockedRef, draftRef, panel: h.panel, folderName: h.folderName,
      programFolderLinkPreview, isProgramFolderLinkPreviewCurrent, programFolderLineTitle,
      programFolderInputSuggestion, programFolderPath, programFolderSuggestionPreservesSource,
      programSame: (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b),
      linkProgramFolder: (...args: Parameters<typeof linkProgramFolder>) => { h.links.push(args); return linkProgramFolder(...args); },
      currentState: () => h.working, currentDoc: () => M.getDocument(h.working, propsRef.current.docId),
      textArea: () => area, setFolderName: (value: string) => { h.folderName = value; },
      setPanel: (value: FolderPanel | null) => { h.panel = value; }, setMessage: (message: string) => h.messages.push(message),
      dialogRef: { current: { close: () => h.closeCount++ } }, editorRef: { current: { focus: () => h.focusCount++ } }, setOrderPreview() {},
      actionsDisabled: () => actualVariable('actionsDisabled', context())(),
      closePanel: () => actualFunction('closePanel', context())(),
      cancelMove: () => { h.cancelCount++; },
      apply: async (next: TextWorkspaceState, label: string) => { h.applied.push({ next, label }); return true; },
      saveNow: async () => { h.saveCount++; return h.saveNow(); },
      suggestion: h.suggestion, suggestionLineRef: h.suggestionLineRef,
      currentSuggestion: (savedFrom?: TextWorkspaceState) => actualFunction('currentSuggestion', context())(savedFrom),
      openFolderPanel: (id: string | null, title?: string) => actualFunction('openFolderPanel', context())(id, title),
      attachFolder: (id: string | null) => actualFunction('attachFolder', context())(id),
      ...extra,
    };
  }
  return Object.assign(h, { context, call: (name: string, ...args: unknown[]) => actualFunction(name, context())(...args) });
}

test('actual folder opener refuses read-only, locked, saving, invalid, composing and missing targets without writes', () => {
  for (const block of ['readonly', 'locked', 'saving', 'invalid', 'composing', 'line', 'document']) {
    const h = harness(), before = JSON.stringify(h.working);
    if (block === 'readonly') h.propsRef.current.readOnly = true;
    if (block === 'locked') h.inputLockedRef.current = true;
    if (block === 'saving') h.saving = true;
    if (block === 'invalid') h.invalid = true;
    if (block === 'composing') h.composingRef.current = true;
    if (block === 'document') h.propsRef.current.docId = 'missing-document';
    h.call('openFolderPanel', block === 'line' ? 'missing-line' : h.lineId);
    assert.equal(h.panel, null, block); assert.equal(h.links.length, 0); assert.equal(h.applied.length, 0);
    assert.equal(JSON.stringify(h.working), before);
  }
});

test('actual folder JSX displays the captured location and source rather than recomputing a changed selection', () => {
  const h = harness('- [ ] 할 일\n  - 메모: 하위 내용'), before = JSON.stringify(h.working);
  h.call('openFolderPanel', h.lineId); assert(h.panel);
  const captured = h.panel.folderLinkPreview;
  assert.equal(captured.destination.relation, 'after-subtree');
  h.working = M.editText(h.working, h.props.docId, '- [ ] 달라진 할 일');
  const fragment = find(node => ts.isJsxFragment(node) && node.getText(ast).includes('className={styles.folderPreview}'));
  const html = renderToStaticMarkup(evaluate(fragment.getText(ast), h.context({ styles, draft: { working: h.working }, disabled: false,
    creationLocation: captured.creationLocation })));
  assert(html.includes(captured.locationLabel)); assert.match(html, /기준 줄: - \[ \] 할 일/);
  assert.match(html, /기존 내용과 하위 항목은 그대로 둡니다/); assert.doesNotMatch(html, /기준 줄: - \[ \] 달라진/);
  assert.equal(h.links.length, 0); assert.equal(h.applied.length, 0);
  assert.equal(JSON.stringify(h.props.workspace), before);
});

test('actual attachment rejects stale row, subtree, folder catalog and changed document before any transition', async () => {
  for (const change of ['row', 'subtree', 'catalog', 'document']) {
    const h = harness('- [ ] 할 일'); h.call('openFolderPanel', h.lineId); assert(h.panel);
    if (change === 'row') h.working = M.editText(h.working, h.props.docId, '- [ ] 수정한 할 일');
    if (change === 'subtree') h.working = M.editText(h.working, h.props.docId, '- [ ] 할 일\n  - 메모: 추가');
    if (change === 'catalog') h.working = { ...h.working, folders: [...h.working.folders, { id: 'new-owner', title: '새 위치', parentId: null }] };
    if (change === 'document') {
      h.working = M.addDocument(h.working, { title: '다른 문서' });
      h.propsRef.current.docId = h.working.documents.at(-1)!.id;
    }
    const before = JSON.stringify(h.working);
    await h.call('attachFolder', 'folder-unfiled');
    assert.equal(h.links.length, 0, change); assert.equal(h.applied.length, 0); assert(h.panel);
    assert.match(h.messages.at(-1)!, /위치가 바뀌었습니다/); assert.equal(JSON.stringify(h.working), before);
  }
});

test('actual close button and dialog cancellation close and restore focus without linking or applying', () => {
  for (const method of ['button', 'cancel']) {
    const h = harness(), before = JSON.stringify(h.working); h.call('openFolderPanel', h.lineId);
    if (method === 'button') {
      const button = find(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'button'
        && node.openingElement.attributes.properties.some(attr => ts.isJsxAttribute(attr) && attr.name.getText(ast) === 'aria-label'
          && attr.initializer?.getText(ast) === '"닫기"'));
      evaluate(button.getText(ast), h.context()).props.onClick();
    } else {
      const attribute = find(node => ts.isJsxAttribute(node) && node.name.getText(ast) === 'onCancel') as ts.JsxAttribute;
      assert(attribute.initializer && ts.isJsxExpression(attribute.initializer));
      let prevented = 0;
      evaluate(attribute.initializer.expression!.getText(ast), h.context())({ preventDefault() { prevented++; } });
      assert.equal(prevented, 1); assert.equal(h.cancelCount, 1);
    }
    assert.equal(h.panel, null); assert.equal(h.closeCount, 1); assert.equal(h.focusCount, 1);
    assert.equal(h.links.length, 0); assert.equal(h.applied.length, 0); assert.equal(JSON.stringify(h.working), before);
  }
});

test('unchanged direct confirmation uses the existing real transition for either an existing or a new folder', async () => {
  for (const target of ['existing', 'new']) {
    const h = harness('- 연결 위치'), before = JSON.stringify(h.working), original = h.working.documents[0].lines[0];
    h.call('openFolderPanel', h.lineId); h.folderName = '새 폴더';
    await h.call('attachFolder', target === 'existing' ? 'folder-unfiled' : null);
    assert.equal(h.links.length, 1); assert.equal(h.links[0][0], h.working); assert.equal(h.links[0][1], h.props.docId);
    assert.equal(h.links[0][2], h.lineId); assert.deepEqual(h.links[0][3], target === 'existing' ? { scopeId: 'folder-unfiled' } : { title: '새 폴더' });
    assert.equal(h.applied.length, 1); assert.equal(h.applied[0].label, target === 'existing' ? '폴더 연결' : '새 폴더');
    const next = h.applied[0].next; assert(M.validate(next));
    assert.equal(next.documents[0].lines[0].id, original.id); assert.equal(next.documents[0].lines.length, 1);
    const bound = next.bindings.find(binding => binding.docId === h.props.docId && binding.lineId === original.id); assert(bound);
    assert.equal(next.folders.length, h.working.folders.length + (target === 'new' ? 1 : 0));
    assert.equal(h.panel, null); assert.equal(JSON.stringify(h.working), before);
  }
});

test('a refused model operation or an input/composition lock acquired after opening never applies preparation', async () => {
  for (const block of ['empty-name', 'locked', 'composing', 'readonly']) {
    const h = harness(), before = JSON.stringify(h.working); h.call('openFolderPanel', h.lineId); h.folderName = '';
    if (block === 'locked') h.inputLockedRef.current = true;
    if (block === 'composing') h.composingRef.current = true;
    if (block === 'readonly') h.propsRef.current.readOnly = true;
    await h.call('attachFolder', null);
    assert.equal(h.applied.length, 0, block); assert(h.panel); assert.equal(JSON.stringify(h.working), before);
    assert.equal(h.links.length, block === 'empty-name' ? 1 : 0);
  }
});

test('actual new-name suggestion opens the captured proposal without creating and existing-name suggestion does not open creation', () => {
  const h = harness('- 새 폴더'), before = JSON.stringify(h.working);
  h.call('createSuggestion'); assert(h.panel); assert.equal(h.panel.folderSuggestionTitle, '새 폴더');
  assert.equal(h.panel.folderLinkPreview.mode, 'proposal'); assert.equal(h.panel.folderLinkPreview.destination.relation, 'same-line');
  assert.equal(h.folderName, '새 폴더'); assert.equal(h.links.length, 0); assert.equal(h.applied.length, 0);
  assert.equal(JSON.stringify(h.working), before);
  const existing = harness(); existing.call('createSuggestion'); assert.equal(existing.panel, null);
  assert.equal(existing.links.length, 0); assert.equal(existing.applied.length, 0);
});

test('actual existing suggestion waits for save and rechecks document, authority, selection and source before applying', async () => {
  for (const change of ['none', 'save-failed', 'readonly', 'document', 'selection', 'source', 'authority']) {
    const h = harness(); let settle!: (saved: boolean) => void;
    h.saveNow = () => new Promise<boolean>(resolve => { settle = resolve; });
    const pending = h.call('chooseSuggestion', 'folder-unfiled') as Promise<void>;
    assert.equal(h.saveCount, 1); assert.equal(h.links.length, 0); assert.equal(h.applied.length, 0);
    if (change === 'readonly') h.propsRef.current.readOnly = true;
    if (change === 'document') { h.working = M.addDocument(h.working, { title: '다른 문서' }); h.propsRef.current.docId = h.working.documents.at(-1)!.id; }
    if (change === 'selection') h.area.selectionStart = 0;
    if (change === 'source') { h.working = M.editText(h.working, h.props.docId, '- 변경한 이름'); h.area.value = M.raw(h.working.documents[0]); h.area.selectionStart = h.area.selectionEnd = h.area.value.length; }
    if (change === 'authority') h.propsRef.current.workspace = M.addDocument(h.working, { title: '다른 저장본' });
    const before = JSON.stringify(h.working);
    settle(change !== 'save-failed'); await pending;
    assert.equal(h.applied.length, change === 'none' ? 1 : 0, change);
    assert.equal(h.links.length, change === 'none' ? 1 : 0, change);
    if (change === 'none') {
      assert.equal(h.applied[0].label, '기존 폴더 연결');
      assert(programFolderSuggestionPreservesSource(h.working, h.applied[0].next));
      assert.equal(h.applied[0].next.bindings.length, 1);
    }
    assert.equal(JSON.stringify(h.working), before);
  }
});
