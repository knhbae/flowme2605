import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import ts from 'typescript';
import { materializePersonalWorkspacePocAuthoring } from '../../../lib/flow/personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../../../lib/flow/personal-workspace-poc-state';
import { prepareProgramInitialData } from '../../../lib/flow/integrated-poc/legacy-entry';
import { programRecurrencePeriodRows } from '../../../lib/flow/integrated-poc/recurrence-target';
import { programOccurrenceWindowFor, updateProgramOccurrenceExecution } from '../../../lib/flow/integrated-poc/recurrence-state';
import type { ProgramEditorFlush } from '../../../lib/flow/integrated-poc/document-action';
import type { ProgramRecurrenceProps } from './ProgramRecurrence';
import type { ProgramSpaceProps } from './ProgramSpace';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { createProgramDocument } from '../../../lib/flow/integrated-poc/private-space';
import { programClone } from '../../../lib/flow/integrated-poc/contract';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles } from '../../../lib/flow/source-backed-my-flow';
import { buildPersonalWorkspacePocReadModel } from '../../../lib/flow/personal-workspace-poc-read-model';
import { setProgramCreatorWorking, applyProgramCreatorAction, handoffProgramCreatorDraft, fingerprintPersonalWorkspacePocAuthoringSource as fp } from '../../../lib/flow/integrated-poc/creator-workspace';
import { programOccurrenceExecutionKey } from '../../../lib/flow/integrated-poc/recurrence-state-contract';
import { prepareProgramRecurrencePlan, applyProgramRecurrencePlanTransition } from '../../../lib/flow/integrated-poc/program-recurrence-plan-state';
import { previewProgramRecurrencePlan, readProgramRecurrencePlan } from '../../../lib/flow/integrated-poc/program-recurrence-plan';

// Component-handler unit harness, not a DOM/browser or native input validation.
function harness(staleSource = false, supplied?: { data: ProgramSpaceProps['data']; documentId?: string; presentation?: ProgramRecurrenceProps['presentation']; onShowPeriod?: ProgramRecurrenceProps['onShowPeriod'] }) {
  const rawText = '# 반복\n- [ ] 회차\n  - 날짜: 2026-09-12\n  - 시간: 07:00\n  - 반복: 매일\n  - 반복 종료: 3회';
  const now = '2026-09-12T00:00:00.000Z', made = materializePersonalWorkspacePocAuthoring({ handoffId: 'date-draft', documentId: 'date-draft-doc', revisionId: 'date-draft-v1', committedAt: now, rawText });
  assert(made.ok); if (!made.ok) throw Error('fixture');
  let data = supplied?.data ?? prepareProgramInitialData({ baseModel: { version: 1, flows: [made.flow] }, legacyState: createPersonalWorkspacePocState(now) }).data;
  const query = { period: 'week' as const, date: '2026-09-12', today: '2026-09-12' }, identity = programRecurrencePeriodRows(data, query).rows[0]?.identity;
  if (staleSource) {
    assert(identity); const saved = updateProgramOccurrenceExecution(data, { actorId: data.activeActorId, flowRef: identity.sourceFlowRef, localToday: query.today, identity, expected: null, window: programOccurrenceWindowFor(identity), changes: { completion: { status: 'completed', completedAt: now } } }); assert(saved.ok); if (saved.ok) data = saved.data;
    const current = materializePersonalWorkspacePocAuthoring({ handoffId: 'date-draft', documentId: 'date-draft-doc', revisionId: 'date-draft-v2', committedAt: now, rawText: rawText.replace('07:00', '10:30') }); assert(current.ok);
    if (current.ok) data.spaces[data.activeActorId].legacySnapshot = prepareProgramInitialData({ baseModel: { version: 1, flows: [current.flow] }, legacyState: createPersonalWorkspacePocState(now) }).data.spaces[data.activeActorId].legacySnapshot;
  }
  let port: ProgramEditorFlush | null = null, writes = 0, fail = false, cursor = 0;
  const slots: any[] = [], cleanups: (() => void)[] = [];
  const hookReact = { ...React, useState: (initial: any) => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], (value: any) => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: (initial: any) => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useMemo: (fn: () => any) => { cursor++; return fn(); },
    useCallback: (fn: (...args: any[]) => any) => { cursor++; return fn; },
    useEffect: (fn: () => any) => { const i = cursor++; if (!(i in slots)) { slots[i] = true; const cleanup = fn(); if (cleanup) cleanups.push(cleanup); } } };
  const url = new URL('./ProgramRecurrence.tsx', import.meta.url), require = createRequire(url), compiled = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  const loaded = { exports: {} as { ProgramRecurrence: (props: ProgramRecurrenceProps) => React.ReactNode } };
  vm.runInThisContext(`(function(module,exports,require,window){${compiled.outputText}\n})`)(loaded, loaded.exports, (id: string) => id === 'react' ? hookReact : id === './ProgramRecurrencePlan' ? { ProgramRecurrencePlan: () => null } : id.endsWith('.css') ? { __esModule: true, default: {} } : require(id), { addEventListener() {}, removeEventListener() {} });
  function render() {
    cursor = 0; const row = programRecurrencePeriodRows(data, { ...query, includeHeld: true, includeExcluded: true }).rows.find(row => row.identity.occurrenceId === identity?.occurrenceId)!;
    const tree = loaded.exports.ProgramRecurrence({ data, ...query, period: supplied?.documentId ? 'documents' : query.period, documentId: supplied?.documentId, presentation: supplied?.presentation, onShowPeriod: supplied?.onShowPeriod, row: staleSource || supplied ? undefined : row, onRegisterEditors: value => { port = value; }, onOpenSource() {}, onUndo: async () => {}, onRedo: async () => {}, mutate: async (_label, transition) => {
      if (fail) return { ok: false, reason: 'quota' }; const result = transition(data); if (result.ok) { if (result.changed) writes++; data = result.data; return { ok: true, result: result.result }; } return { ok: false, reason: result.reason };
    } });
    const nodes: any[] = []; function visit(node: any) { if (Array.isArray(node)) node.forEach(visit); else if (node && typeof node === 'object' && node.props) { nodes.push(node); visit(node.props.children); } } visit(tree);
    return { nodes, button: (title: string) => nodes.find(node => node.type === 'button' && node.props.children === title), input: () => nodes.find(node => node.type === 'input' && node.props.type === 'date'), form: () => nodes.find(node => node.type === 'form') };
  }
  const open = () => { const view = render(); view.nodes.find(node => node.type === 'button' && Array.isArray(node.props.children) && node.props.children.includes('회차')).props.onClick(); return render(); };
  return { render, open, get data() { return data; }, setData(value: typeof data) { data = value; }, get writes() { return writes; }, get port() { return port!; }, setFail(value: boolean) { fail = value; }, cleanup() { cleanups.forEach(fn => fn()); }, peerChange() {
    const row = programRecurrencePeriodRows(data, query).rows[0]; const next = updateProgramOccurrenceExecution(data, { actorId: data.activeActorId, flowRef: row.identity.sourceFlowRef, localToday: query.today, identity: row.identity, expected: row.stored, window: programOccurrenceWindowFor(row.identity), changes: { participation: 'held' } }); assert(next.ok); if (next.ok) data = next.data;
  } };
}
test('date input/cancel/Escape perform zero writes; explicit apply makes exactly one transition', async () => {
  const h = harness(), before = JSON.stringify(h.data); let view = h.open();
  view.input().props.onChange({ target: { value: '2026-09-13' } }); view = h.render();
  assert.equal(h.writes, 0); assert.equal(JSON.stringify(h.data), before); assert(h.port.hasPendingInput?.()); assert.equal(await h.port.flushAll(), false); assert.equal(h.port.captureDrafts?.().length, 1);
  view.button('날짜 변경 취소').props.onClick(); view = h.render(); assert.equal(h.port.hasPendingInput?.(), false); assert.equal(h.writes, 0);
  view.input().props.onChange({ target: { value: '2026-09-13' } }); view = h.render();
  view.nodes.find(node => node.props.onKeyDown).props.onKeyDown({ key: 'Escape', preventDefault() {}, stopPropagation() {} }); assert.equal(h.writes, 0); assert.equal(JSON.stringify(h.data), before);
  view = h.open(); view.input().props.onChange({ target: { value: '2026-09-13' } }); view = h.render(); await view.form().props.onSubmit({ preventDefault() {} });
  assert.equal(h.writes, 1); assert.equal(h.port.hasPendingInput?.(), false); assert.equal(await h.port.flushAll(), true); h.cleanup();
});
test('input lock, stale expected entry, and storage failure preserve unapplied date draft', async () => {
  const h = harness(); let view = h.open(); view.input().props.onChange({ target: { value: '2026-09-13' } }); view = h.render();
  const release = h.port.lockInput(); view = h.render(); assert(view.input().props.disabled); await view.form().props.onSubmit({ preventDefault() {} }); assert.equal(h.writes, 0); release();
  h.setFail(true); view = h.render(); await view.form().props.onSubmit({ preventDefault() {} }); assert.equal(h.writes, 0); assert(h.port.hasPendingInput?.()); assert.equal(h.render().input().props.value, '2026-09-13');
  h.setFail(false); h.peerChange(); view = h.render(); await view.form().props.onSubmit({ preventDefault() {} }); assert.equal(h.writes, 0); assert(h.port.hasPendingInput?.()); assert.equal(h.render().input().props.value, '2026-09-13'); h.cleanup();
});

test('nested plan input joins the parent save barrier, capture and lock without allowing another occurrence mutation', async () => {
  const h=harness();let view=h.open();const child=view.nodes.find(node=>typeof node.type==='function'&&node.props.onPendingChange&&node.props.row);assert(child);
  let pending=true,locks=0;const planPort:ProgramEditorFlush={hasPendingInput:()=>pending,flushAll:async()=>!pending,captureDrafts:()=>pending?[{title:'계획 선택',raw:'2026-09-19'}]:[],
    blocksExternalSnapshot:()=>pending,lockInput:()=>{locks++;return()=>{locks--;};}};
  child.props.onRegisterEditors(planPort);child.props.onPendingChange(true);view=h.render();assert(h.port.hasPendingInput?.());assert.equal(await h.port.flushAll(),false);
  assert.deepEqual(h.port.captureDrafts?.(),[{title:'계획 선택',raw:'2026-09-19'}]);assert.equal(h.port.blocksExternalSnapshot?.(h.data,h.data),true);
  view.button('오늘로 이동').props.onClick();await Promise.resolve();assert.equal(h.writes,0);assert(view.input().props.disabled);
  assert(view.button('상세 닫기 · 미적용 취소').props.disabled);const release=h.port.lockInput();assert.equal(locks,1);release();assert.equal(locks,0);
  pending=false;child.props.onPendingChange(false);assert.equal(await h.port.flushAll(),true);h.cleanup();
});

test('actual personal plan row opens by its private key and changes its date without rewriting source execution', async () => {
  const now='2026-09-12T00:00:00.000Z',made=materializePersonalWorkspacePocAuthoring({handoffId:'private-plan-ui',documentId:'private-plan-doc',revisionId:'private-plan-v1',committedAt:now,
    rawText:'# 개인 계획\n- [ ] 스트레칭\n  - 날짜: 2026-09-12\n  - 반복: 매일\n  - 반복 종료: 3회'});assert(made.ok);if(!made.ok)throw Error('fixture');
  let data=prepareProgramInitialData({baseModel:{version:1,flows:[made.flow]},legacyState:createPersonalWorkspacePocState(now)}).data;
  const first=programRecurrencePeriodRows(data,{period:'week',date:'2026-09-12',today:'2026-09-12'}).rows[0];assert(first);
  const ready=prepareProgramRecurrencePlan(data,{actorId:data.activeActorId,flowRef:made.flow.ref,sourceIdentity:first.identity,ownerId:'plan-ui-handler',localToday:'2026-09-12',now});assert(ready.ok);if(!ready.ok)throw Error('prepare');
  const read=readProgramRecurrencePlan(ready.value.owner,{start:first.originalDate,end:first.originalDate});assert(read.ok);if(!read.ok)throw Error('read');
  const preview=previewProgramRecurrencePlan(ready.value.owner,{actorId:data.activeActorId,expected:ready.value.owner,currentSource:first.identity,operation:{scope:'future_series',targetDate:'2026-09-19',target:read.value.targets[0],sourceCutover:first.identity,at:now}});assert(preview.ok);if(!preview.ok)throw Error('preview');
  const applied=applyProgramRecurrencePlanTransition(data,{actorId:data.activeActorId,expectedOwner:null,expectedSpace:ready.value.expectedSpace,preview:preview.value,localToday:'2026-09-12'});assert(applied.ok);if(!applied.ok)throw Error('apply');data=applied.data;
  const space=data.spaces[data.activeActorId],beforeRaw=space.legacySnapshot!.raw,beforeExecution=JSON.stringify(space.recurrenceExecution??null);
  const h=harness(false,{data,documentId:space.savedBindings[0].documentId});let view=h.render();
  const title=view.nodes.find(node=>node.type==='button'&&Array.isArray(node.props.children)&&node.props.children.some((part:unknown)=>typeof part==='string'&&part.includes('2026-09-19 개인 회차')));assert(title);
  title.props.onClick();view=h.render();assert(view.input(),'private key opens the selected detail');assert.equal(view.input().props.value,'2026-09-19');
  view.input().props.onChange({target:{value:'2026-09-23'}});view=h.render();await view.form().props.onSubmit({preventDefault(){}});assert.equal(h.writes,1);
  const next=h.data.spaces[h.data.activeActorId],owner=next.recurrencePlans!.owners['plan-ui-handler'];assert.equal(owner.executionEvents!.at(-1)!.next.schedule.date,'2026-09-23');
  assert.equal(next.legacySnapshot!.raw,beforeRaw);assert.equal(JSON.stringify(next.recurrenceExecution??null),beforeExecution);h.cleanup();
});

test('source comparison is read-only; cancel/keep write zero and explicit reconnect preserves completion in one transition', async () => {
  const h = harness(true), before = JSON.stringify(h.data); let view = h.render();
  view.button('개인 기록과 원본 비교').props.onClick(); view = h.render();
  const comparison = view.nodes.filter(node => node.type === 'pre').map(node => node.props.children).join('\n'); assert(comparison.includes('07:00')); assert(comparison.includes('10:30')); assert.equal(h.writes, 0);
  view.button('비교 취소').props.onClick(); assert.equal(JSON.stringify(h.data), before);
  view = h.render(); view.button('개인 기록과 원본 비교').props.onClick(); view = h.render(); await view.button('이전 원본과 보관 유지').props.onClick();
  // Click intentionally invokes a void handler; settle its microtask before rereading.
  await Promise.resolve(); assert.equal(h.writes, 0); assert.equal(JSON.stringify(h.data), before);
  view = h.render(); view.button('개인 기록과 원본 비교').props.onClick(); view = h.render(); view.button('개인 기록을 유지하고 현재 원본에 연결').props.onClick(); await Promise.resolve();
  assert.equal(h.writes, 1); const entry = Object.values(h.data.spaces[h.data.activeActorId].recurrenceExecution!.entries)[0]; assert.equal(entry.completion.status, 'completed'); assert(entry.sourceRevisionToken.includes('10:30'));
  assert.equal(h.render().button('개인 기록과 원본 비교'), undefined); h.cleanup();
});

test('source change hides an obsolete reconnect success and changed values precede folded source details', async () => {
  const h = harness(true), oldData = programClone(h.data); let view = h.render(); view.button('개인 기록과 원본 비교').props.onClick(); view = h.render();
  const folded = view.nodes.find(node => node.type === 'details'); assert(folded); assert(!folded.props.open);
  const changes = view.nodes.find(node => node.type === 'dl' && node.props.children?.some?.((child: any) => child?.props?.children?.[0]?.props?.children === '시간'));
  assert(changes, 'human-readable time comparison is not limited to a preformatted JSON block');
  view.button('개인 기록을 유지하고 현재 원본에 연결').props.onClick(); await Promise.resolve();
  assert(h.render().nodes.some(node => node.props.role === 'status' && String(node.props.children).includes('현재 원본에 연결했습니다')));
  const connected=programClone(h.data);h.setData(oldData);assert(!h.render().nodes.some(node=>node.props.role==='status'&&String(node.props.children).includes('현재 원본에 연결했습니다')),'Undo restoring an old entry hides the obsolete success');h.setData(connected);
  const original = JSON.parse(oldData.spaces[oldData.activeActorId].legacySnapshot!.raw).model.flows[0].authoring.rawText;
  const updatedSource = materializePersonalWorkspacePocAuthoring({ handoffId: 'date-draft', documentId: 'date-draft-doc', revisionId: 'date-draft-v3', committedAt: '2026-09-12T00:00:00.000Z', rawText: original.replace('10:30', '11:30') });assert(updatedSource.ok);if(!updatedSource.ok)throw Error('fixture');
  const changed = programClone(h.data); changed.spaces[changed.activeActorId].legacySnapshot = prepareProgramInitialData({baseModel:{version:1,flows:[updatedSource.flow]},legacyState:createPersonalWorkspacePocState('2026-09-12T00:00:00.000Z')}).data.spaces[changed.activeActorId].legacySnapshot;h.setData(changed);
  assert(!h.render().nodes.some(node => node.props.role === 'status' && String(node.props.children).includes('현재 원본에 연결했습니다')));h.cleanup();
});

const CREATOR_UI_RAW = '# 걷기\n- [ ] 걷기\n  - 날짜: 2026-09-12\n  - 시간: 09:30\n  - 시간대: Asia/Seoul\n  - 반복: 매일';
function creatorUiFixture(raw = CREATOR_UI_RAW, data = createProgramData()) {
  const actorId = data.activeActorId, now = '2026-09-12T00:00:00.000Z', previous = data.spaces[actorId].creatorWorkspace?.working ?? null;
  const working = setProgramCreatorWorking(data, { actorId, expectedWorking: previous, working: { draftId: 'creator-ui', title: '걷기 제작', rawText: raw, baseRecordRevision: previous?.baseRecordRevision ?? null } }, now); assert(working.ok);if(!working.ok)throw Error('fixture');
  const library = working.data.spaces[actorId].creatorWorkspace!.library;
  const saved = applyProgramCreatorAction(working.data, { actorId, requestId: `save-ui-${library.revision}`, action: { type: 'save', draftId: 'creator-ui', rawText: raw, title: '걷기 제작', sourceFingerprint: fp(raw), expectedLibraryRevision: library.revision, ...(previous?.baseRecordRevision ? { expectedRecordRevision: previous.baseRecordRevision } : {}), now } }, now); assert(saved.ok);if(!saved.ok)throw Error('fixture');
  const handed = handoffProgramCreatorDraft(saved.data, { actorId, requestId: `handoff-ui-${library.revision}`, draftId: 'creator-ui', expectedRecordRevision: saved.data.spaces[actorId].creatorWorkspace!.library.records['creator-ui'].recordRevision, today: '2026-09-12' }, now); assert(handed.ok);if(!handed.ok)throw Error('fixture');return handed.data;
}
test('creator-owned occurrence opens by shared key, applies date once, and exposes timezone and retained recovery', async () => {
  const data = creatorUiFixture(), actorId = data.activeActorId, documentId = data.spaces[actorId].creatorWorkspace!.executionSources!['creator-ui'].documentId;
  const h = harness(false, { data, documentId }); let view = h.render();
  view.nodes.find(node => node.type === 'button' && Array.isArray(node.props.children) && node.props.children.includes('회차')).props.onClick(); view = h.render();
  assert(view.input(), 'creator key locates detail'); assert(view.nodes.some(node => Array.isArray(node.props.children) && node.props.children.some((value: unknown) => typeof value === 'string' && value.includes('Asia/Seoul'))));
  view.input().props.onChange({ target: { value: '2026-09-20' } }); view = h.render();await view.form().props.onSubmit({ preventDefault() {} });assert.equal(h.writes,1);
  const entry=Object.values(h.data.spaces[actorId].recurrenceExecution!.entries)[0];assert(entry.creatorOwner);assert.equal(h.data.spaces[actorId].recurrenceExecution!.entries[programOccurrenceExecutionKey(entry)],entry);
  const changed = creatorUiFixture(CREATOR_UI_RAW.replace('09:30','10:00'),h.data);h.setData(changed);view=h.render();assert(view.button('개인 기록과 원본 비교'));view.button('개인 기록과 원본 비교').props.onClick();view=h.render();view.button('개인 기록을 유지하고 현재 원본에 연결').props.onClick();await Promise.resolve();assert.equal(h.writes,2);
  assert.equal(Object.values(h.data.spaces[actorId].recurrenceExecution!.entries)[0].schedule.date,'2026-09-20');
  const ordinary=creatorUiFixture(CREATOR_UI_RAW.replace('\n  - 반복: 매일',''),h.data);h.setData(ordinary);assert(h.render().button('개인 기록과 원본 비교'),'series removed from metadata still has creator history recovery');h.cleanup();
});
test('bounded creator query explains its cap and date lookup is a guarded presentation-only action', async () => {
  const data=creatorUiFixture(),documentId=data.spaces[data.activeActorId].creatorWorkspace!.executionSources!['creator-ui'].documentId,opened:unknown[]=[];
  const h=harness(false,{data,documentId,presentation:{page:128,includeHeld:false,includeExcluded:false},onShowPeriod:(period,date)=>opened.push({period,date})});let view=h.render();
  assert(view.nodes.some(node=>node.props.role==='status'&&String(node.props.children).includes('조회 범위에 도달')));
  const lookup=view.nodes.find(node=>node.type==='form'&&node.props.children?.some?.((child:any)=>child?.type==='button'&&child.props.children==='날짜로 기간 보기'));assert(lookup);
  const release=h.port.lockInput();lookup.props.onSubmit({preventDefault(){}});assert.equal(opened.length,0);release();
  lookup.props.onSubmit({preventDefault(){}});assert.deepEqual(opened,[{period:'week',date:'2026-09-12'}]);assert.equal(h.writes,0);
  view=h.render();view.nodes.find(node=>node.type==='button'&&Array.isArray(node.props.children)&&node.props.children.includes('회차')).props.onClick();view=h.render();view.input().props.onChange({target:{value:'2036-09-12'}});view=h.render();
  const pendingLookup=view.nodes.find(node=>node.type==='form'&&node.props.children?.some?.((child:any)=>child?.type==='button'&&child.props.children==='날짜로 기간 보기'));pendingLookup.props.onSubmit({preventDefault(){}});assert.equal(opened.length,1);assert.equal(h.writes,0);h.cleanup();
});

function spaceActionHarness(data: ProgramSpaceProps['data'], port: ProgramEditorFlush | null, execute = false) {
  let currentData = data; const selectedDocumentId = [...data.spaces[data.activeActorId].text.documents, ...data.spaces[data.activeActorId].text.flows][0].id;
  let cursor = 0, saves = 0, writes = 0, publishes = 0, revisions = 0; const slots: any[] = [];
  const hookReact = { ...React, useState: (initial: any) => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], (value: any) => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: (initial: any) => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; }, useMemo: (fn: () => any) => { cursor++; return fn(); }, useEffect: () => { cursor++; } };
  const markers = Object.fromEntries(['ProgramTextEditor', 'ProgramRecurrence', 'ProgramRecurrencePlanRecovery', 'ProgramOutputReturn', 'ProgramTaskDocumentMove', 'ProgramDocumentTrash', 'ProgramDocumentTrashAction', 'ProgramDocumentProvenance'].map(name => [name, function child() { return null; }]));
  const file = new URL('./ProgramSpace.tsx', import.meta.url), require = createRequire(file), root = resolve(dirname(fileURLToPath(file)), '../../..');
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  const loaded = { exports: {} as { ProgramSpace: (props: ProgramSpaceProps) => React.ReactNode } };
  vm.runInThisContext(`(function(module,exports,require,document){${compiled.outputText}\n})`)(loaded, loaded.exports, (id: string) => {
    if (id === 'react') return hookReact;
    if (id.endsWith('.css')) return { __esModule: true, default: {} };
    if (id.startsWith('./Program')) return markers;
    return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
  }, { activeElement: null });
  function render() {
    cursor = 0; const tree = loaded.exports.ProgramSpace({ data: currentData, selectedDocumentId, today: '2026-09-12',
      mutate: async (_label, build) => { if (!execute) { writes++; return { ok: true, result: 'spy' }; } const next = build(currentData); if (!next.ok) return { ok: false, reason: next.reason }; if (next.changed) writes++; currentData = next.data; return { ok: true, result: next.result, changed: next.changed }; }, navigate() {}, onUndo: async () => {}, onRedo: async () => {}, onPublishDocument() { publishes++; }, onInspectCopy() {}, onRevisionHistory() { revisions++; } });
    const nodes: any[] = []; function visit(node: any) { if (Array.isArray(node)) node.forEach(visit); else if (node && typeof node === 'object' && node.props) { nodes.push(node); visit(node.props.children); } } visit(tree);
    return { nodes, button: (title: string) => nodes.find(node => node.type === 'button' && node.props.children === title), child: (name: string) => nodes.find(node => node.type === markers[name]) };
  }
  const view = render(); if (port) view.child('ProgramRecurrence').props.onRegisterEditors(port);
  const editor = view.child('ProgramTextEditor').props; editor.onDirtyChange(true); editor.onRegisterSave(async () => { saves++; editor.onDirtyChange(false); return true; });
  return { render, get data() { return currentData; }, setData(next: typeof data) { currentData = next; }, get counts() { return { saves, writes, publishes, revisions }; },
    openTask(title: string) { render().button('오늘').props.onClick(); const view = render(); view.nodes.find(node => node.props['aria-label'] === `${title} 작업`).props.onClick({ detail: 0 }); return render().child('ProgramTaskDocumentMove').props; } };
}
test('Space archive/trash/publish/revision handlers refuse a real unapplied occurrence port before text save or action', async () => {
  const occurrence = harness(); let detail = occurrence.open(); detail.input().props.onChange({ target: { value: '2026-09-13' } }); occurrence.render();
  const space = spaceActionHarness(occurrence.data, occurrence.port), settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  for (const action of ['선택해서 공개', '저장판본·복구', '문서 보관']) { space.render().button(action).props.onClick(); await settle(); }
  const outcome = await space.render().child('ProgramDocumentTrashAction').props.onChange(true); assert.equal(outcome.ok, false);
  assert.deepEqual(space.counts, { saves: 0, writes: 0, publishes: 0, revisions: 0 });
  assert(space.render().nodes.some(node => node.props.children === '회차 날짜를 적용하거나 취소한 뒤 문서 작업을 다시 열어 주세요.'));
  detail = occurrence.render(); assert.equal(detail.input().props.value, '2026-09-13'); assert.equal(detail.input().props.disabled, false, 'finally releases the input lock');
  detail.button('날짜 변경 취소').props.onClick(); occurrence.render(); space.render().button('선택해서 공개').props.onClick(); await settle();
  assert.deepEqual(space.counts, { saves: 1, writes: 0, publishes: 1, revisions: 0 }); occurrence.cleanup();
});

function moveFixture() {
  let data = createProgramData(); const actorId = data.activeActorId;
  const a = createProgramDocument(data, { actorId, expectedSpace: data.spaces[actorId], requestId: 'move-a', title: '출발', raw: '[2026-09-12]\n- [ ] 옮길 일\n  - 메모: 원래 메모\n  - [ ] 하위 내용' }); assert(a.ok); if (!a.ok) throw Error('fixture'); data = a.data;
  const b = createProgramDocument(data, { actorId, expectedSpace: data.spaces[actorId], requestId: 'move-b', title: '도착', raw: '도착 메모' }); assert(b.ok); if (!b.ok) throw Error('fixture'); data = b.data;
  const task = M.tasks(data.spaces[actorId].text)[0]; data.spaces[actorId].text = M.recordProgress(data.spaces[actorId].text, task.id, '2026-09-12', 20);
  return { data, actorId, task, from: a.result, to: b.result };
}
test('one Space move rebases only its successful text flush and retains IDs, memo and records', async () => {
  const f = moveFixture(), h = spaceActionHarness(f.data, null, true), move = h.openTask('옮길 일'), expected = h.data.spaces[f.actorId];
  const editor = h.render().child('ProgramTextEditor').props, locks: boolean[] = []; editor.onRegisterInputLock((locked: boolean) => locks.push(locked));
  const edited = M.editText(expected.text, f.from, M.raw(M.getDocument(expected.text, f.from)).replace('원래 메모', '미저장 수정 메모'));
  editor.onRegisterSave(async () => { const saved = await editor.onCommit(edited, '본문 flush', { expectedWorkspace: expected.text }); if (saved) editor.onDirtyChange(false); return saved; });
  const result = await move.onMove(f.to, expected); assert(result.ok); assert.equal(h.counts.writes, 2, 'one text save plus one move');
  const task = M.tasks(h.data.spaces[f.actorId].text).find(task => task.id === f.task.id)!; assert.equal(task.docId, f.to); assert(task.note.includes('미저장 수정 메모')); assert.deepEqual(task.subchecks.map(child => child.id), f.task.subchecks.map(child => child.id));
  assert.deepEqual(h.data.spaces[f.actorId].text.progressRecords, expected.text.progressRecords); assert.deepEqual(locks, [false, true, false]);
});
test('foreign space or actor during flush is not adopted as move authority; failures and duplicate calls release locks', async () => {
  for (const mode of ['foreign', 'actor', 'failed', 'duplicate'] as const) {
    const f = moveFixture(), h = spaceActionHarness(f.data, null, true), move = h.openTask('옮길 일'), expected = h.data.spaces[f.actorId], editor = h.render().child('ProgramTextEditor').props, locks: boolean[] = [];
    editor.onRegisterInputLock((locked: boolean) => locks.push(locked));
    const edited = M.editText(expected.text, f.from, M.raw(M.getDocument(expected.text, f.from)).replace('원래 메모', '미저장 수정 메모'));
    let resume: (() => void) | null = null;
    editor.onRegisterSave(async () => {
      if (mode === 'failed') return false;
      if (mode === 'duplicate') await new Promise<void>(resolve => { resume = resolve; });
      if (mode === 'foreign' || mode === 'actor') { const peer = programClone(h.data); if (mode === 'actor') peer.activeActorId = 'creator-minji'; else peer.spaces[f.actorId].position.scrollTop = 123; h.setData(peer); }
      const saved = await editor.onCommit(edited, '본문 flush', { expectedWorkspace: expected.text }); if (saved) editor.onDirtyChange(false); return saved;
    });
    const pending = move.onMove(f.to, expected);
    if (mode === 'duplicate') { for (let i = 0; i < 12 && !resume; i++) await Promise.resolve(); const duplicate = await move.onMove(f.to, expected); assert.equal(duplicate.ok, false); assert(resume); (resume as () => void)(); }
    const result = await pending; assert.equal(result.ok, mode === 'duplicate');
    assert.equal(M.tasks(h.data.spaces[f.actorId].text).find(task => task.id === f.task.id)!.docId, mode === 'duplicate' ? f.to : f.from);
    if (mode === 'foreign') assert.equal(h.data.spaces[f.actorId].position.scrollTop, 123);
    assert.deepEqual(locks, [false, true, false], mode);
  }
});

test('Space blocks an old quality-held checkbox commit while preserving unrelated free memo editing', async () => {
  const now = '2026-09-12T00:00:00.000Z', mapId = 'baby-health-schedule';
  const keys: Record<string, string> = {
    [`flow:map:saved:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: now, anchor: '2026-09-30' })),
    [`flow:map:persistence:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: now, anchor: '2026-09-30' })),
  };
  const model = buildPersonalWorkspacePocReadModel({ get length() { return Object.keys(keys).length; }, key: index => Object.keys(keys)[index] ?? null, getItem: key => keys[key] ?? null }, sourceBackedMyFlowBundles); assert(model.ok); if (!model.ok) throw Error('fixture');
  const data = prepareProgramInitialData({ baseModel: model.model, legacyState: createPersonalWorkspacePocState(now) }).data;
  const space = data.spaces[data.activeActorId], binding = space.savedBindings[0], id = Object.values(binding.itemLines)[0], doc = M.getDocument(space.text, binding.documentId)!;
  // Reproduce a previously persisted canonical checkbox without changing its source snapshot.
  doc.lines.find(line => line.id === id)!.text = '- [ ] 이전에 저장된 원본 항목';
  space.text.taskScopes[id] = doc.id; space.text.itemScopes[id] = doc.id;
  const h = spaceActionHarness(data, null, true), editor = h.render().child('ProgramTextEditor').props;
  const changed = M.editText(space.text, doc.id, M.raw(doc).replace('- [ ] 이전에 저장된 원본 항목', '- [x] 이전에 저장된 원본 항목'));
  assert.equal(editor.validateWorkspace(changed), false);
  assert.equal(await editor.onCommit(changed, '보류 항목 우회', { expectedWorkspace: space.text }), false);
  assert.equal(h.counts.writes, 0); assert.equal(JSON.stringify(h.data), JSON.stringify(data));
  assert(h.render().nodes.some(node => node.props.role === 'status' && Array.isArray(node.props.children) && node.props.children.some((value: unknown) => typeof value === 'string' && value.includes('원문 품질'))));
  const memo = M.editText(space.text, doc.id, `자유 메모를 덧붙임\n${M.raw(doc)}`);
  assert.equal(editor.validateWorkspace(memo), true);
  assert.equal(await editor.onCommit(memo, '개인 메모', { expectedWorkspace: space.text }), true);
  assert.equal(h.counts.writes, 1); assert.equal(h.data.spaces[data.activeActorId].legacySnapshot!.raw, space.legacySnapshot!.raw);
});
