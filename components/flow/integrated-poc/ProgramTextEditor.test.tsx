import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from '../../../lib/flow/integrated-poc/text-workspace';
import { planProgramDateBlockOrder } from '../../../lib/flow/integrated-poc/date-block-order';
import { applyProgramLinePermutation, createProgramPermutationHistory } from '../../../lib/flow/integrated-poc/line-permutation';
import type { createProgramTextDraft as DraftFactory, ProgramTextEditor as Component, ProgramReferencePanel as ReferencePanel, programTextProtectionMessage as ProtectionMessage, ProgramTextDraftState } from './ProgramTextEditor';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { programPreservesLockedDocumentContent, programReferenceExecutionAccess } from '../../../lib/flow/integrated-poc/reference-execution-guard';

const componentUrl = new URL('./ProgramTextEditor.tsx', import.meta.url);
const source = readFileSync(componentUrl, 'utf8');
const require = createRequire(componentUrl);
const root = resolve(dirname(fileURLToPath(componentUrl)), '../../..');
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} });
const loaded = { exports: {} as { createProgramTextDraft: typeof DraftFactory; ProgramTextEditor: typeof Component; ProgramReferencePanel: typeof ReferencePanel; programTextProtectionMessage: typeof ProtectionMessage } };
vm.runInThisContext(`(function(module, exports, require) { ${compiled.outputText}\n})`, { filename: 'ProgramTextEditor.compiled.cjs' })(loaded, loaded.exports, (id: string) => {
  if (id.endsWith('.css')) return id.endsWith('.module.css') ? { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) } : {};
  return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
});
const { createProgramTextDraft, ProgramTextEditor, ProgramReferencePanel } = loaded.exports;

// Run the component's native action and React callbacks without a browser or store.
function referenceMenuHarness() {
  const f = fixture(), space = createProgramData().spaces['local-user'];
  space.text = M.addDocument(f.workspace, { title: '한 줄 참조' });
  const docId = space.text.documents.at(-1)!.id, taskId = M.tasks(space.text)[0].id;
  space.text = M.linkTask(space.text, docId, 0, taskId);
  const states: any[] = [], refs: any[] = [], effects: (() => unknown)[] = [];
  let si = 0, ri = 0, writes = 0, focus = 0, accept = true, config: any;
  const origins: unknown[] = [], events: Record<string, () => void> = {};
  const textarea = { value: M.raw(M.getDocument(space.text, docId)), selectionStart: 0, selectionEnd: 0, scrollTop: 0, addEventListener() {}, removeEventListener() {} };
  const host = { querySelector: () => textarea, addEventListener: (name: string, fn: () => void) => { events[name] = fn; }, removeEventListener() {} };
  const native = { create: (_host: unknown, options: unknown) => { config = options; return { refresh() {}, focus() { focus++; }, setMoveState() {}, destroy() {}, setMode() {} }; } };
  const mockedReact = { ...React, useId: () => 'reference-test', useRef: (value: unknown) => refs[ri++] ?? (refs[ri - 1] = { current: value }),
    useState: (value: any) => { const i = si++; if (!(i in states)) states[i] = typeof value === 'function' ? value() : value; return [states[i], (next: any) => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useEffect: (effect: () => unknown) => { effects.push(effect); } };
  const mod = { exports: {} as typeof loaded.exports };
  vm.runInThisContext(`(function(module,exports,require,window){${compiled.outputText}\n})`)(mod, mod.exports, (id: string) => {
    if (id === 'react') return mockedReact;
    if (id.endsWith('text-editor.cjs')) return native;
    if (id.endsWith('.css')) return {};
    return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
  }, { addEventListener() {}, removeEventListener() {} });
  const props: any = { workspace: space.text, docId, onCommit: async () => { writes++; return accept; }, taskAccess: (id: string) => programReferenceExecutionAccess(space, id), onOpenTaskOrigin: (...args: unknown[]) => origins.push(args) };
  const render = () => { si = 0; ri = 0; effects.length = 0; return mod.exports.ProgramTextEditor(props); };
  render(); refs[1].current = host;
  // Only the editor-mount effect is needed; no timers or DOM are installed globally.
  effects[1]();
  const nodes = (tree: any): any[] => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
  const button = (label: string) => nodes(render()).find(n => n.type === 'button' && (n.props.children === label || n.props['aria-label'] === label));
  return { props, space, docId, taskId, refs, events, render, nodes, button, origins,
    menu: () => { config.onAction({ type: 'row-menu', lineIndex: 0 }); },
    panel: () => nodes(render()).find(n => n.type === mod.exports.ProgramReferencePanel),
    draft: () => refs[3].current as ReturnType<typeof createProgramTextDraft>,
    writes: () => writes, focus: () => focus, reject: () => { accept = false; } };
}

test('one-row reference native menu opens existing exact-origin panel; close and Escape do not write', async () => {
  for (const cancel of ['close', 'escape', 'native-cancel']) {
    const h = referenceMenuHarness(); h.menu();
    assert(h.button('진행 기록')); assert(h.button('날짜 바꾸기'));
    h.button('연결된 항목 보기').props.onClick();
    assert.equal(h.panel().props.access.documentId, h.space.text.documents[0].id);
    assert.equal(h.panel().props.access.lineId, h.taskId);
    if (cancel === 'close') h.button('닫기').props.onClick();
    else if (cancel === 'escape') h.render().props.onKeyDownCapture({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
    else h.nodes(h.render()).find(n => n.type === 'dialog').props.onCancel({ preventDefault() {} });
    assert.equal(h.panel(), undefined); assert.equal(h.writes(), 0); assert(h.focus() > 0);
  }
  const h = referenceMenuHarness(); h.menu(); h.button('연결된 항목 보기').props.onClick();
  h.panel().props.onOrigin(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(h.origins, [[h.space.text.documents[0].id, h.taskId]]); assert.equal(h.writes(), 0);
});

test('reference menu preserves dirty-save failure, IME, readonly and input-lock boundaries', async () => {
  const h = referenceMenuHarness(); h.reject();
  h.draft().updateRaw(M.raw(M.getDocument(h.space.text, h.docId)) + '\n개인 입력 유지', '2026-09-14');
  h.menu(); h.button('연결된 항목 보기').props.onClick(); h.panel().props.onOrigin();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.writes(), 1); assert.deepEqual(h.origins, []); assert.match(h.draft().getState().raw, /개인 입력 유지/); assert(h.draft().getState().dirty);
  for (const mode of ['composition', 'readonly', 'locked']) {
    const g = referenceMenuHarness(); g.menu(); const entry = g.button('연결된 항목 보기');
    if (mode === 'composition') g.events.compositionstart();
    if (mode === 'readonly') g.props.readOnly = true;
    if (mode === 'locked') g.refs[7].current = true;
    entry.props.onClick(); assert.equal(g.panel(), undefined); assert.equal(g.writes(), 0);
  }
});

test('ordinary tasks and unresolved access do not gain reference action; protected reference keeps its existing route', () => {
  const h = referenceMenuHarness(); h.props.docId = h.space.text.documents[0].id; h.menu(); assert.equal(h.button('연결된 항목 보기'), undefined);
  const missing = referenceMenuHarness(); missing.props.taskAccess = () => undefined; missing.menu(); assert.equal(missing.button('연결된 항목 보기'), undefined);
  const wrong = referenceMenuHarness(); wrong.props.taskAccess = () => ({ kind: 'active', reason: null, documentId: 'another-owner-document', lineId: 'another-task' }); wrong.menu(); assert.equal(wrong.button('연결된 항목 보기'), undefined);
  const blocked = referenceMenuHarness(); blocked.space.archivedDocumentIds = [blocked.space.text.documents[0].id]; blocked.menu();
  assert.equal(blocked.button('연결된 항목 보기'), undefined); assert.equal(blocked.button('진행 기록'), undefined);
  blocked.button('기록·원래 항목 보기').props.onClick(); assert.equal(blocked.panel().props.access.kind, 'archived'); assert.equal(blocked.writes(), 0);
});

test('beforeinput rejection reports actual archived/trash/retention reason rather than asserting recurrence',()=>{
 const {programTextProtectionMessage:message}=loaded.exports;
 for(const [kind,reason]of [['archived','원래 문서가 보관되어 있습니다.'],['trash','원래 문서가 휴지통에 있습니다.'],['retention','판본 복구 중 보관된 내용입니다.']] as const){assert.equal(message({kind,reason,documentId:'actual-document',lineId:'actual-task'}),reason);assert.doesNotMatch(message({kind,reason,documentId:'actual-document',lineId:'actual-task'}),/원문 반복 규칙/);}
 assert.match(message(),/직접 수정할 수 없는 원문 표시/);assert.match(source,/setMessage\(programTextProtectionMessage\(accessFor/);assert.doesNotMatch(source,/이 줄은 원문 반복 규칙 표시입니다/);
});

test('locked reference exposes reason, immutable history and exact canonical origin without date/progress writers',()=>{
 const f=fixture(),space=createProgramData().spaces['local-user'];space.text=f.workspace;space.archivedDocumentIds=[f.docId];const taskId=M.tasks(space.text)[0].id,access=programReferenceExecutionAccess(space,taskId);let calls=0;
 const props={access,title:'준비',date:'2026-10-12',history:[{date:'2026-09-12',percent:35}],onOrigin:()=>{calls++;},onUnlink:()=>{calls++;},onProgress:()=>{calls++;},onDate:()=>{calls++;}};
 const html=renderToStaticMarkup(<ProgramReferencePanel {...props}/>);assert.match(html,/원래 문서가 보관되어/);assert.match(html,/날짜별 기록 읽기/);assert.match(html,/2026-09-12.*35%/);assert.match(html,/원래 문서의 항목 열기/);assert.match(html,/이 연결만 해제/);assert.doesNotMatch(html,/>진행 기록<|>날짜 바꾸기<|<input/);assert.equal(calls,0);
 const active=renderToStaticMarkup(<ProgramReferencePanel {...props} access={{...access,kind:'active',reason:null}}/>);assert.match(active,/>진행 기록</);assert.match(active,/>날짜 바꾸기</);
 const missing=renderToStaticMarkup(<ProgramReferencePanel {...props} access={programReferenceExecutionAccess(space,'missing')}/>);assert.match(missing,/원래 항목을 찾을 수 없습니다/);assert.doesNotMatch(missing,/원래 문서의 항목 열기/);
});
test('actual raw draft guard blocks reference completion while keeping rejected input and unrelated note edits',async()=>{
 const f=fixture(),space=createProgramData().spaces['local-user'];space.text=M.addDocument(f.workspace,{title:'활성 참조'});const refId=space.text.documents.at(-1)!.id,taskId=M.tasks(space.text)[0].id;space.text=M.linkTask(space.text,refId,0,taskId);space.archivedDocumentIds=[f.docId];let writes=0;
 const draft=createProgramTextDraft(space.text,refId,async()=>{writes++;return true;},()=>{},next=>programPreservesLockedDocumentContent(space,next));const original=M.raw(M.getDocument(space.text,refId)),changed=original.replace('[ ]','[100]');assert.notEqual(changed,original);assert.equal(draft.updateRaw(changed,'2026-09-12'),false);assert.equal(await draft.save(),false);assert.equal(writes,0);assert.equal(draft.getState().raw,changed);
 assert(draft.updateRaw(original+'\n자유 메모','2026-09-12'));assert(await draft.save());assert.equal(writes,1);
 const spaceSource=readFileSync(new URL('./ProgramSpace.tsx',import.meta.url),'utf8');assert.match(spaceSource,/programPreservesLockedDocumentContent\(before, merged\)/);assert.match(spaceSource,/onOpenTaskOrigin=\{\(documentId, lineId\) => \{ void openDocument\(documentId, lineId\)/);assert.match(source,/protectedExecutionPanel/);assert.doesNotMatch(source,/const scopeId = row.scopeId!/);
});

test('actual draft boundary accepts date-section plus numeric/memo bulk input once without normalizing away typed raw', async () => {
  let workspace=M.addDocument(createEmptyTextWorkspace(),{title:'제작 인계 입력'});const docId=workspace.documents[0].id;
  const original='# 브라우저 현재 초안\n- [ ] 현재 준비\n  - 설명: 함께 확인할 공개 설명\n- [ ] 비공개 선택 제외\n  - 메모: PRIVATE_CREATOR_UNSELECTED_1127\n비공개 자유 메모 PRIVATE_CREATOR_FREE_1127';
  workspace=M.editText(workspace,docId,original);const ids=M.tasks(workspace).map(task=>task.id);let writes=0;
  const input=original.replace('- [ ] 현재 준비','[2026-09-13]\n- [20%] 현재 준비\n  - 메모: PRIVATE_CREATOR_EXECUTION_1134');
  const draft=createProgramTextDraft(workspace,docId,async(next,_label,options)=>{writes++;assert.equal(options?.expectedWorkspace,workspace);assert.equal(M.raw(M.getDocument(next,docId)),input);assert.deepEqual(M.tasks(next).map(task=>task.id),ids);return true;},()=>{});
  assert(draft.updateRaw(input,'2026-09-12'));assert.equal(draft.getState().invalid,false);assert(await draft.save());assert.equal(writes,1);assert.equal(draft.getState().raw,input);assert.equal(draft.getState().dirty,false);
  assert.deepEqual(M.latestProgress(draft.getState().committed,ids[0]),{date:'2026-09-13',percent:20});
  const invalid=input.replace('[20%]','[101%]');assert.equal(draft.updateRaw(invalid,'2026-09-12'),false);assert.equal(await draft.save(),false);assert.equal(writes,1);assert.equal(draft.getState().raw,invalid);
});

test('line-specific metadata guard preserves ordinary/free typing and retains rejected IME/raw without a write', async () => {
  let workspace = M.addDocument(createEmptyTextWorkspace(), { title: '혼합 문서' }); const id = workspace.documents[0].id;
  workspace = M.editText(workspace, id, '반복 규칙: 보존\n- [ ] 일반 할 일\n자유 메모');
  const protectedId = workspace.documents[0].lines[0].id; let writes = 0;
  const validate = (next: TextWorkspaceState) => M.getDocument(next, id)?.lines.some(line => line.id === protectedId && line.text === '반복 규칙: 보존') === true;
  const draft = createProgramTextDraft(workspace, id, async () => { writes++; return true; }, () => {}, validate);
  assert(draft.updateRaw('반복 규칙: 보존\n- [ ] 일반 수정\n자유 메모를 계속 작성', '2026-09-12'));
  assert(await draft.save()); assert.equal(writes, 1);
  const raw = '반복 규칙: 한글 조합 원문\n- [ ] 일반 수정\n자유 메모를 계속 작성';
  assert.equal(draft.updateRaw(raw, '2026-09-12'), false); assert.equal(await draft.save(), false);
  assert.equal(writes, 1); assert.equal(draft.getState().raw, raw); assert(draft.getState().error.includes('원문 표시'));
  assert(source.includes('!event.defaultPrevented && !composingRef.current'));
});

function fixture() {
  let workspace = M.addDocument(createEmptyTextWorkspace(), { title: '메모' });
  const docId = workspace.documents[0].id;
  workspace = M.editText(workspace, docId, '- [ ] 준비');
  return { workspace, docId };
}

test('failed save preserves exact draft and committed source until a successful retry', async () => {
  const { workspace, docId } = fixture();
  let accept = false, calls = 0;
  const states: ProgramTextDraftState[] = [];
  const draft = createProgramTextDraft(workspace, docId, async (_next, _label, options) => { calls++; assert.equal(options?.expectedWorkspace, workspace); return accept; }, state => states.push(state));
  const raw = '- [20] 준비';
  assert(draft.updateRaw(raw, '2026-09-12'));
  assert.equal(await draft.save(), false);
  assert.equal(draft.getState().committed, workspace);
  assert.equal(draft.getState().raw, raw); assert.equal(draft.getState().dirty, true);
  assert.equal(M.raw(workspace.documents[0]), '- [ ] 준비');
  accept = true;
  assert.equal(await draft.save(), true);
  assert.equal(calls, 2); assert.equal(draft.getState().dirty, false);
  assert.equal(M.raw(draft.getState().committed.documents[0]), raw);
  assert(states.some(state => state.saving));
});

test('invalid text remains visible without calling storage and can recover through typing', async () => {
  const { workspace, docId } = fixture(); let writes = 0;
  const draft = createProgramTextDraft(workspace, docId, async () => { writes++; return true; }, () => {});
  assert.equal(draft.updateRaw('- [.1] 준비', '2026-09-12'), false);
  assert.equal(await draft.save(), false); assert.equal(writes, 0);
  assert.equal(draft.getState().raw, '- [.1] 준비'); assert.equal(draft.getState().working, workspace);
  assert(draft.updateRaw('- [0.1] 준비', '2026-09-12'));
  assert(await draft.save()); assert.equal(writes, 1);
});

test('M7-2 ambiguous parent rename plus child outdent keeps input and identities, then accepts split edits', async () => {
  let workspace = M.addDocument(createEmptyTextWorkspace(), { title: '격리 편집 시험' });
  const docId = workspace.documents[0].id;
  const initial = '검증용 메모\n- [ ] 부모 @2026-09-24\n  - [ ] 자식';
  workspace = M.editText(workspace, docId, initial);
  const before = JSON.stringify(workspace), ids = workspace.documents[0].lines.map(line => line.id);
  const combined = '검증용 메모\n- [ ] 부모\n- [ ] 자식';
  const result = M.editTextResult(workspace, docId, combined, { progressDate: '2026-09-24' });
  assert.equal(result.reason, 'identity-ambiguous'); assert.equal(result.state, workspace);
  assert.equal(M.editText(workspace, docId, combined), workspace);
  let writes = 0;
  const draft = createProgramTextDraft(workspace, docId, async () => { writes++; return true; }, () => {});
  assert.equal(draft.updateRaw(combined, '2026-09-24'), false); assert.equal(await draft.save(), false);
  assert.equal(writes, 0); assert.equal(draft.getState().raw, combined);
  assert.equal(draft.getState().working, workspace); assert.equal(JSON.stringify(workspace), before);
  assert.match(draft.getState().error, /기존 항목과 연결하지 못해/);
  assert.match(draft.getState().error, /제목 수정과 줄 이동은 나누고/);
  assert.doesNotMatch(draft.getState().error, /날짜·진행률/);
  assert(draft.updateRaw(initial.replace(' @2026-09-24', ''), '2026-09-24'));
  assert(await draft.save()); assert.equal(draft.getState().error, '');
  assert(draft.updateRaw(combined, '2026-09-24')); assert(await draft.save());
  assert.equal(writes, 2); assert.equal(draft.getState().dirty, false);
  assert.deepEqual(draft.getState().committed.documents[0].lines.map(line => line.id), ids);
  assert.equal(draft.getState().raw, combined);
});

test('M7-2 diagnostic distinguishes format, unchanged and generic blocked edits without persisting reasons', async () => {
  const { workspace, docId } = fixture(); let writes = 0;
  const initial = M.raw(workspace.documents[0]);
  assert.deepEqual(M.editTextResult(workspace, docId, initial), { state: workspace, reason: null });
  assert.deepEqual(M.editTextResult(workspace, 'missing', initial), { state: workspace, reason: 'blocked' });
  assert.deepEqual(M.editTextResult(workspace, docId, 'x'.repeat(100001)), { state: workspace, reason: 'blocked' });
  const draft = createProgramTextDraft(workspace, docId, async () => { writes++; return true; }, () => {});
  for (const input of ['- [101%] 준비', '- [ ] 준비\n  [2026-09-24]', ' - [ ] 준비']) {
    assert.equal(M.editTextResult(workspace, docId, input).reason, 'invalid-format');
    assert.equal(draft.updateRaw(input, '2026-09-24'), false); assert.equal(await draft.save(), false);
    assert.match(draft.getState().error, /날짜·진행률·들여쓰기 형식/);
    assert.doesNotMatch(draft.getState().error, /기존 항목과 연결/);
    assert.equal(draft.getState().raw, input); assert.equal(writes, 0);
  }
  assert.equal(draft.updateRaw('x'.repeat(100001), '2026-09-24'), false);
  assert.match(draft.getState().error, /안전하게 반영하지 못했습니다/);
  assert.doesNotMatch(draft.getState().error, /날짜·진행률|기존 항목과 연결/);
  assert(draft.updateRaw(initial, '2026-09-24')); assert.equal(draft.getState().error, '');
  const accepted = M.editTextResult(workspace, docId, '- [ ] 정상 수정');
  assert.equal(accepted.reason, null); assert(M.validate(accepted.state));
  // An invalid date value was already a nonblocking source warning; do not tighten that policy.
  const warning = M.editTextResult(workspace, docId, '[2026-02-30]\n- [ ] 준비');
  assert.equal(warning.reason, null);
  assert(M.parseDocument(warning.state.documents[0], warning.state).issues.some(issue => issue.code === 'invalid-date' && !issue.blocking));
  assert.equal('reason' in accepted.state, false); assert.equal('reason' in workspace, false);
  assert.equal(writes, 0);
});

test('typing while a commit is pending is serialized and neither draft nor ID is lost', async () => {
  const { workspace, docId } = fixture();
  const writes: TextWorkspaceState[] = [];
  let release!: (value: boolean) => void;
  const draft = createProgramTextDraft(workspace, docId, next => {
    writes.push(next);
    return writes.length === 1 ? new Promise<boolean>(resolve => { release = resolve; }) : Promise.resolve(true);
  }, () => {});
  draft.updateRaw('- [10] 준비', '2026-09-12');
  const save = draft.save();
  const firstId = M.tasks(draft.getState().working)[0].id;
  draft.updateRaw('- [20] 준비 마무리', '2026-09-12');
  assert.equal(draft.save(), save);
  release(true); assert(await save);
  assert.equal(writes.length, 2);
  assert.equal(M.tasks(draft.getState().committed)[0].id, firstId);
  assert.equal(draft.getState().raw, '- [20] 준비 마무리');
  assert.equal(M.latestProgress(draft.getState().committed, firstId)?.percent, 20);
});

test('a pending failure keeps typing that arrived after the submitted snapshot', async () => {
  const { workspace, docId } = fixture();
  let release!: (value: boolean) => void;
  const draft = createProgramTextDraft(workspace, docId, () => new Promise<boolean>(resolve => { release = resolve; }), () => {});
  draft.updateRaw('- [ ] 첫 편집', '2026-09-12'); const save = draft.save();
  draft.updateRaw('- [ ] 두 번째 편집', '2026-09-12'); release(false);
  assert.equal(await save, false);
  assert.equal(draft.getState().raw, '- [ ] 두 번째 편집');
  assert.equal(draft.getState().committed, workspace); assert.equal(draft.getState().dirty, true);
});

test('external rerenders cannot replace an unsaved or invalid local draft', () => {
  const { workspace, docId } = fixture();
  const draft = createProgramTextDraft(workspace, docId, async () => true, () => {});
  draft.updateRaw('- [invalid', '2026-09-12');
  const external = M.updateTask(workspace, M.tasks(workspace)[0].id, { title: '외부 변경' });
  assert.equal(draft.synchronize(external), false);
  assert.equal(draft.getState().raw, '- [invalid');
  assert(draft.discard(external)); assert.equal(draft.getState().raw, '- [ ] 외부 변경');
});

test('move transaction preserves descendants, source IDs, progress and exact undo snapshot', async () => {
  const { workspace, docId } = fixture();
  const withChildren = M.editText(workspace, docId, '- [ ] 준비\n  - [ ] 물품\n- [ ] 예약');
  const source = M.editText(withChildren, docId, '- [10] 준비\n  - [ ] 물품\n- [ ] 예약', { progressDate: '2026-09-12' });
  const taskId = M.tasks(source)[0].id;
  const draft = createProgramTextDraft(source, docId, async () => true, () => {});
  const next = M.moveSubtree(source, docId, taskId, null, 0);
  assert.notEqual(next, source); assert(draft.apply(next, '하위 묶음 이동')); assert(await draft.save());
  assert.deepEqual(draft.getState().committed.progressRecords, source.progressRecords);
  assert(M.getDocument(draft.getState().committed, docId)?.lines.some(line => line.id === taskId));
  assert(draft.apply(source, '이동 되돌리기')); assert(await draft.save());
  assert.deepEqual(draft.getState().committed, source);
});

test('server rendering exposes one native editor mount and clear read-only controls', () => {
  const { workspace, docId } = fixture();
  const html = renderToStaticMarkup(<ProgramTextEditor workspace={workspace} docId={docId} onCommit={async () => true} readOnly disabledReason="저장소 확인 중" />);
  assert.equal((html.match(/data-native-editor="v11-core"/g) ?? []).length, 1);
  assert.match(html, /저장소 확인 중/); assert.match(html, /aria-label="개인 문서 편집"/);
  assert.match(html, /disabled=""[^>]*>＋ 추가/);
  assert.doesNotMatch(html, /iframe|srcDoc|ux-review:text-workspace/);
});

test('component keeps mount lifetime on document identity and restores source position', () => {
  assert.match(source, /\}, \[props\.docId\]\);/);
  assert.match(source, /textarea\.setSelectionRange\(Math\.min\(position\.start/);
  assert.match(source, /textarea\.scrollTop = position\.scrollTop/);
  assert.match(source, /if \(draftRef\.current\?\.synchronize\(props\.workspace\)\)/);
  assert.doesNotMatch(source, /localStorage|localStorage\.clear|flowme-text-workspace-v11\.html/);
});

test('explicit date order, failed save, retry and genuine history bridge retain exact identities', async () => {
  const f = fixture();
  const workspace = M.editText(M.editText(f.workspace, f.docId, ''), f.docId, '## 준비\n- [ ] 같은 제목\n  - 날짜: 2026-09-23\n- [ ] 같은 제목\n  - 날짜: 2026-09-20');
  const plan = planProgramDateBlockOrder(workspace, f.docId, workspace.documents[0].lines[0].id);
  assert.equal(plan.status, 'ready'); if (plan.status !== 'ready') return;
  const next = applyProgramLinePermutation(workspace, f.docId, plan.afterLineIds)!;
  let accepted = false, calls = 0;
  const draft = createProgramTextDraft(workspace, f.docId, async () => { calls++; return accepted; }, () => {});
  assert.equal(calls, 0); // preview/cancel/no-op do not use the commit port
  assert(draft.apply(next, '같은 구간 날짜순 정렬'));
  assert.equal(await draft.save(), false);
  assert.equal(draft.getState().raw, plan.afterRaw); assert.equal(draft.getState().committed, workspace);
  accepted = true; assert(await draft.save());
  assert.equal(draft.synchronize(structuredClone(next)), false, 'own commit echo must not reset native history');
  const history = createProgramPermutationHistory(f.docId); assert(history.record(workspace, next));
  const undo = history.resolve(draft.getState().working, plan.beforeRaw, 'historyUndo')!;
  assert(draft.apply(undo, '날짜순 정렬 입력 취소')); assert(await draft.save());
  assert.deepEqual(draft.getState().working, workspace);
  const redo = history.resolve(draft.getState().working, plan.afterRaw, 'historyRedo')!;
  assert(draft.apply(redo, '날짜순 정렬 다시 실행')); assert(await draft.save());
  assert.deepEqual(draft.getState().working, next); assert.equal(calls, 4);
});

test('date order UI uses one native replacement and explicitly guards composition and stale preview', () => {
  assert.match(source, /pendingOrderRef\.current = \{ before: capture\.before, next, raw: plan\.afterRaw \}/);
  assert.match(source, /replaceRange\(plan\.replacement\.start, plan\.replacement\.end, plan\.replacement\.text/);
  assert.match(source, /capture\.epoch !== orderEpochRef\.current/);
  assert.match(source, /composingRef\.current/);
  assert.match(source, /historyType === 'historyUndo'/);
  const { workspace, docId } = fixture();
  const html = renderToStaticMarkup(<ProgramTextEditor workspace={workspace} docId={docId} onCommit={async () => true} readOnly />);
  assert.match(html, /disabled=""[^>]*>날짜순 정렬/);
});
