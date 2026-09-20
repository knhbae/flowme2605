import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { hydrateProgramLegacy } from '../../../lib/flow/integrated-poc/legacy-projection';
import { createProgramLegacyPort } from '../../../lib/flow/integrated-poc/legacy-port';
import { applyProgramLegacySourceAction, prepareProgramLegacyView } from '../../../lib/flow/integrated-poc/legacy-transaction';
import { materializePersonalWorkspacePocAuthoring } from '../../../lib/flow/personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../../../lib/flow/personal-workspace-poc-state';
import { readProgramLegacySourceMapping, readProgramLegacyMapSourceConnection, type ProgramLegacySourceAction } from '../../../lib/flow/integrated-poc/legacy-source-lifecycle';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles } from '../../../lib/flow/source-backed-my-flow';
import { buildPersonalWorkspacePocReadModel } from '../../../lib/flow/personal-workspace-poc-read-model';
import type * as SourceReview from './ProgramLegacySourceReview';
import { programLegacySourceChanges } from '../../../lib/flow/integrated-poc/legacy-source-lifecycle-contract';
import type { ProgramStructuredMapRecurrenceContext } from '../../../lib/flow/integrated-poc/legacy-map-recurrence';
const url = new URL('./ProgramLegacySourceReview.tsx', import.meta.url), require = createRequire(url), root = resolve(dirname(fileURLToPath(url)), '../../..');
const source = readFileSync(url, 'utf8'), loaded = { exports: {} as typeof SourceReview };
const mappingModule = { exports: {} };
const mappingCompiled = ts.transpileModule(readFileSync(new URL('./ProgramLegacySourceMapping.tsx', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
vm.runInThisContext(`(function(module,exports,require){${mappingCompiled.outputText}\n})`)(mappingModule, mappingModule.exports, (id: string) => id.endsWith('.module.css') ? { __esModule: true, default: {} } : require(id));
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`)(loaded, loaded.exports, (id: string) => id.endsWith('.module.css') ? { __esModule: true, default: {} } : id === './ProgramLegacySourceMapping' ? mappingModule.exports : require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id));
const { createProgramLegacySourceEditor, ProgramLegacySourceReview, programLegacyMappingReady, programLegacySourceUnlinkedItem, programLegacySourceComparison } = loaded.exports;
const NOW = '2026-09-12T10:00:00.000Z', raw = '# 방문\n- [ ] 접수\n  - 날짜: 2026-09-13\n  - 시간: 10:00\n';
test('no-TXT Map SSR exposes genuine structured connection, Step provenance comparison and no fake authoring form or render write', () => {
  const keys: Record<string, string> = { 'flow:map:saved:moving-d30': JSON.stringify(buildSourceBackedFlowMapSavedSnapshot('moving-d30', { savedAt: NOW, anchor: '2026-09-30' })), 'flow:map:persistence:moving-d30': JSON.stringify(buildSourceBackedFlowMapPersistenceRecord('moving-d30', { savedAt: NOW, anchor: '2026-09-30' })) };
  const model = buildPersonalWorkspacePocReadModel({ length: 2, key: i => Object.keys(keys)[i] ?? null, getItem: key => keys[key] ?? null }, sourceBackedMyFlowBundles); assert.ok(model.ok);
  const h = hydrateProgramLegacy(createProgramData(), model.model, createPersonalWorkspacePocState(NOW), { actorId: 'local-user', preserveUnsupported: true }); assert.ok(h.ok);
  let data = h.data, writes = 0; const flowRef = model.model.flows[0].ref;
  const port = createProgramLegacyPort({ actorId: 'local-user', readData: () => data, mutate: async (_label, build) => { writes++; const result = build(data); if (result.ok) { data = result.data; return { ok: true, result: result.result }; } return result; } });
  const render = () => renderToStaticMarkup(<ProgramLegacySourceReview data={data} port={port} flowRef={flowRef} blocked={false} canStart={() => true} />);
  const first = render(); assert.match(first, /TXT 없이 저장된 Map 원본/); assert.match(first, /저장 구조·출처를 확인하고 연결/); assert.doesNotMatch(first, /비교할 새 원문/); assert.match(first, /품질·의료·최신성 보류/); assert.equal(writes, 0);
  const act = (action: ProgramLegacySourceAction) => { const view = port.readSource(NOW, flowRef); assert.ok(view.ok); const result = applyProgramLegacySourceAction(data, { actorId: 'local-user', expectedToken: view.token, action }); assert.ok(result.transition.ok, JSON.stringify(result.issues)); data = result.transition.data; };
  const connection = readProgramLegacyMapSourceConnection(JSON.parse(data.spaces['local-user'].legacySnapshot!.raw), flowRef)!;
  act({ type: 'connect-map', flowRef, requestId: 'connect', expectedSourceToken: connection.sourceToken, now: NOW });
  assert.match(render(), /현재 제공 Map 원본 비교·보관/);
  act({ type: 'stage-map', flowRef, requestId: 'compare', now: NOW });
  const staged = render(); assert.match(staged, /실제 Step 구조·출처/); assert.match(staged, /보관한 구조·출처 전체/); assert.match(staged, /stepId/); assert.match(staged, /sourceUrl/); assert.doesNotMatch(staged, /비교할 새 원문/); assert.equal(writes, 0);
});
function fixture() {
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'review-ui', documentId: 'review-doc', revisionId: 'v1', rawText: raw, committedAt: NOW }); assert.ok(made.ok);
  const state = createPersonalWorkspacePocState(NOW); state.authoredFlows = [made.flow]; state.authoringReceipts = [{ handoffId: 'review-ui', flowRef: made.flow.ref, committedAt: NOW }];
  const initial = hydrateProgramLegacy(createProgramData(), { version: 1, flows: [] }, state, { actorId: 'local-user' }); assert.ok(initial.ok);
  let data = initial.data, writes = 0;
  const port = createProgramLegacyPort({ actorId: 'local-user', readData: () => data, mutate: async (_label, build) => { writes++; const result = build(data); if (result.ok) { data = result.data; return { ok: true, result: result.result }; } return result; } });
  return { flowRef: made.flow.ref, read: () => data, writes: () => writes, port, stage: () => {
    const view = prepareProgramLegacyView(data, { actorId: 'local-user', now: NOW }); assert.ok(view.ok);
    const result = applyProgramLegacySourceAction(data, { actorId: 'local-user', expectedToken: view.token, action: { type: 'stage', flowRef: made.flow.ref, requestId: 'ui-candidate', rawText: raw.replace('10:00', '11:30'), now: NOW } }); assert.ok(result.transition.ok); data = result.transition.data;
  } };
}
test('source comparison SSR renders actual typed field choices, stored raw and honest origin, with no mutation', () => {
  const f = fixture(); f.stage();
  const html = renderToStaticMarkup(<ProgramLegacySourceReview data={f.read()} port={f.port} flowRef={f.flowRef} blocked={false} canStart={() => true} />);
  assert.match(html, /원본 변경 비교/); assert.match(html, /시간/); assert.match(html, /10:00/); assert.match(html, /11:30/);
  assert.match(html, /현재 원본 유지/); assert.match(html, /새 원문 사용/); assert.match(html, /보관한 원문 전체/); assert.match(html, /개인 입력 원문/);
  assert.match(html, /<button disabled="">선택한 내용 적용/); assert.equal(f.writes(), 0);
});

test('identical reappearing source item still shows its title and explicit membership change without rewriting private content', () => {
  const f = fixture(); f.stage();
  const owner = JSON.parse(f.read().spaces['local-user'].legacySnapshot!.raw).sourceLifecycle.owners[f.flowRef];
  const revisionId = 'program-source:ui-candidate', itemRef = Object.keys(owner.effective.itemRevisions)[0];
  owner.effective.itemRevisions[itemRef] = revisionId;
  owner.effective.retainedItemRefs = [itemRef];
  const before = JSON.stringify(owner);
  const rows = programLegacySourceComparison(owner, revisionId, { id: `item:${itemRef}`, kind: 'modified', itemRef });
  assert.deepEqual(rows.find(row => row.label === '항목'), { label: '항목', mine: '접수', incoming: '접수' });
  assert.deepEqual(rows.find(row => row.label === '원본 연결'), {
    label: '원본 연결', mine: '원본에서 빠짐을 확인함 · 개인 항목 보존', incoming: '현재 제공 원본에 다시 연결',
  });
  assert.equal(rows.length, 2);
  assert.equal(JSON.stringify(owner), before);
  assert.equal(f.writes(), 0);
  owner.effective.retainedItemRefs = [];
  assert.deepEqual(programLegacySourceComparison(owner, revisionId, { id: `item:${itemRef}`, kind: 'modified', itemRef }), []);
});
test('kind-change SSR compares execution modes and exact private records before explicit incoming choice, without a render write', async () => {
  const f = fixture(), view = f.port.read(NOW, f.flowRef); assert.ok(view.ok);
  const staged = await f.port.commitSource({ expectedToken: view.token, action: { type: 'stage', flowRef: f.flowRef, requestId: 'series-ui', rawText: raw + '  - 반복: 매일\n  - 반복 종료: 3회', now: NOW } }); assert.ok(staged.ok);
  const count = f.writes();
  const html = renderToStaticMarkup(<ProgramLegacySourceReview data={f.read()} port={f.port} flowRef={f.flowRef} blocked={false} canStart={() => true} />);
  assert.match(html, /실행 방식/); assert.match(html, /일반 항목/); assert.match(html, /반복 회차/);
  assert.match(html, /보존할 일반 항목·회차 기록 확인/); assert.match(html, /반복 완료로 자동 복사하지 않습니다/);
  assert.match(html, /날짜·순서로 새 실행에 연결하지 않습니다/); assert.equal(f.writes(), count);
});
const draft = { actorId: 'local-user', documentId: 'doc', flowRef: 'flow', raw: '# 원문\n- [ ] 실제 입력', requestId: 'fixed-request', expectedToken: 'exact-token' };
test('recurrence confirmation is never automatic on navigation flush; failure preserves pending selection and cancel writes nothing', async () => {
  let calls = 0;
  const editor = createProgramLegacySourceEditor({ change: () => undefined, lockChanged: () => undefined, save: async () => { calls++; return false; } });
  // Input-registry unit stub, not recurrence-domain or genuine source evidence.
  const pending = { ...draft, recurrence: { context: {} as ProgramStructuredMapRecurrenceContext, expectedSelection: 'selected-exact', confirmed: false } };
  assert(editor.update(pending)); assert.equal(await editor.flushAll(), false); assert.equal(calls, 0);
  assert(editor.update({ ...pending, recurrence: { ...pending.recurrence, confirmed: true } })); assert.equal(await editor.flushAll(), false); assert.equal(calls, 1);
  assert(editor.read()?.recurrence); assert(editor.update(null)); assert.equal(calls, 1); assert(!editor.hasPendingInput());
  assert.match(source, /view.token !== draft.expectedToken/); assert.match(source, /event.key === 'Escape'/); assert.match(source, /원문 영상의 고정 처방이 아닙니다/);
});
test('raw input registry is synchronous; failed save and actor/external change retain exact input', async () => {
  let captures = 0;
  const editor = createProgramLegacySourceEditor({ change: () => { captures++; }, lockChanged: () => undefined, save: async saved => { assert.deepEqual(saved, draft); return false; } });
  assert.equal(editor.update(draft), true); assert.equal(editor.hasPendingInput(), true); assert.equal(captures, 1);
  assert.deepEqual(editor.captureDrafts(), [{ title: '비교 전 원문', raw: draft.raw }]); assert.deepEqual(editor.pendingDocumentIds(), ['doc']);
  const release = editor.lockInput(); assert.equal(editor.update(null), false); assert.equal(await editor.flushAll(), false); assert.deepEqual(editor.read(), draft); release();
  const before = createProgramData(), next = createProgramData(); next.spaces['local-user'].position.start = 1;
  assert.equal(editor.blocksExternalSnapshot(before, next), true); assert.equal(editor.update({ ...draft, raw: '연결 실패 뒤 계속 편집' }), true);
});
test('IME under a synchronous parent lock captures its final DOM text before flush; no intermediate publish', async () => {
  const saved: string[] = [];
  const editor = createProgramLegacySourceEditor({ change: () => undefined, lockChanged: () => undefined, save: async value => { saved.push(value.raw); return true; } });
  editor.update(draft); assert.equal(editor.composition(true), true);
  const release = editor.lockInput(); assert.equal(await editor.flushAll(), false); assert.deepEqual(saved, []);
  assert.equal(editor.finishComposition('# 완성된 한글\n- [ ] 할 일'), true);
  assert.equal(editor.update({ ...draft, raw: '잠금 중 뒤늦은 변경' }), false);
  assert.equal(await editor.flushAll(), true); assert.deepEqual(saved, ['# 완성된 한글\n- [ ] 할 일']); release(); assert.equal(editor.hasPendingInput(), false);
});
test('double flush shares one request; apply in flight blocks navigation even with no raw draft', async () => {
  let finish!: (value: boolean) => void, calls = 0, busy = false;
  const editor = createProgramLegacySourceEditor({ change: () => undefined, lockChanged: () => undefined, isBusy: () => busy, save: async () => { calls++; return new Promise<boolean>(resolve => { finish = resolve; }); } });
  editor.update(draft); const a = editor.flushAll(), b = editor.flushAll(); assert.equal(a, b); await Promise.resolve(); assert.equal(calls, 1);
  assert.equal(editor.update({ ...draft, raw: '저장 중 입력' }), false); finish(true); assert.equal(await a, true);
  busy = true; assert.equal(editor.hasPendingInput(), true); assert.equal(await editor.flushAll(), false); assert.equal(editor.update(draft), false);
  busy = false; assert.equal(await editor.flushAll(), true);
});
test('source UI has minimum touch targets, wrapping, no direct storage/fetch or hidden old writer', () => {
  assert.match(readFileSync(new URL('./ProgramLegacySourceReview.module.css', import.meta.url), 'utf8'), /min-height:44px/);
  assert.match(readFileSync(new URL('./ProgramLegacySourceReview.module.css', import.meta.url), 'utf8'), /overflow-wrap:anywhere/);
  assert(!/localStorage|sessionStorage|fetch\(|source-candidate-storage|writePersonalWorkspace/.test(source));
  assert.match(source, /onCompositionEnd/); assert.match(source, /undoReview.token !== view.token/);
});
test('raw-only SSR offers explicit mapping, not guessed defaults; pending mapping never auto-confirms on global flush', async () => {
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'mapping-ui', documentId: 'mapping-doc', revisionId: 'v1', rawText: raw, committedAt: NOW }); assert.ok(made.ok);
  const { source: _s, parsedItems: _p, sourceLineItemIdentityMap: _m, fidelityManifest: _f, ...legacy } = made.flow.authoring;
  const state = createPersonalWorkspacePocState(NOW); state.authoredFlows = [{ ...made.flow, authoring: legacy }]; state.authoringReceipts = [{ handoffId: 'mapping-ui', flowRef: made.flow.ref, committedAt: NOW }];
  const payload = { model: { version: 1 as const, flows: [] }, state }, initial = hydrateProgramLegacy(createProgramData(), payload.model, state, { actorId: 'local-user', preserveUnsupported: true }); assert.ok(initial.ok);
  let writes = 0; const port = createProgramLegacyPort({ actorId: 'local-user', readData: () => initial.data, mutate: async () => { writes++; return { ok: false, reason: 'storage-unavailable' }; } });
  const html = renderToStaticMarkup(<ProgramLegacySourceReview data={initial.data} port={port} flowRef={made.flow.ref} blocked={false} canStart={() => true} />);
  assert.match(html, /저장 원문과 기존 항목 직접 연결/); assert.equal(writes, 0);
  const prepared = readProgramLegacySourceMapping(payload, made.flow.ref); assert.ok(prepared.ok);
  const editor = createProgramLegacySourceEditor({ change: () => undefined, lockChanged: () => undefined, save: async () => { writes++; return false; } });
  editor.update({ ...draft, mapping: { prepared, itemRefs: {}, confirmed: false } }); assert.equal(editor.hasPendingInput(), true);
  const release = editor.lockInput(); assert.equal(await editor.flushAll(), false); assert.equal(writes, 0); assert.match(editor.captureDrafts()[0].raw, /선택한 행 연결/); release();
  const captured = editor.read()!; editor.update({ ...captured, mapping: { ...captured.mapping!, confirmed: true } }); assert.equal(await editor.flushAll(), false); assert.equal(writes, 1); assert.ok(editor.read()?.mapping);
});
test('partial mapping requires every raw row and every unmatched old item; failed flush preserves explicit decisions', async () => {
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'partial-ui', documentId: 'partial-doc', revisionId: 'v1', rawText: raw + '- [ ] 새 원문 행\n', committedAt: NOW }); assert.ok(made.ok);
  const { source: _s, parsedItems: _p, sourceLineItemIdentityMap: _m, fidelityManifest: _f, ...legacy } = made.flow.authoring;
  const state = createPersonalWorkspacePocState(NOW);state.authoredFlows=[{...made.flow,items:made.flow.items.slice(0,1),authoring:legacy}];state.authoringReceipts=[{handoffId:'partial-ui',flowRef:made.flow.ref,committedAt:NOW}];
  const payload={model:{version:1 as const,flows:[]},state},prepared=readProgramLegacySourceMapping(payload,made.flow.ref,{partial:true});assert.ok(prepared.ok);
  const mapping={prepared,partial:true as const,itemRefs:{[made.flow.items[0].ref]:'source-only',[made.flow.items[1].ref]:'new'},unmatchedItems:{},confirmed:false};
  assert.equal(programLegacyMappingReady(mapping),false);const ready={...mapping,unmatchedItems:{[made.flow.items[0].ref]:'archive-execution' as const}};assert.equal(programLegacyMappingReady(ready),true);
  let calls=0;const editor=createProgramLegacySourceEditor({change:()=>undefined,lockChanged:()=>undefined,save:async()=>{calls++;return false;}});editor.update({...draft,mapping:ready});assert.equal(await editor.flushAll(),false);assert.equal(calls,0);
  editor.update({...draft,mapping:{...ready,confirmed:true}});assert.equal(await editor.flushAll(),false);assert.equal(calls,1);assert.equal(editor.read()?.mapping?.unmatchedItems?.[made.flow.items[0].ref],'archive-execution');assert.match(editor.captureDrafts()[0].raw,/source-only/);assert.match(editor.captureDrafts()[0].raw,/archive-execution/);
  const initial=hydrateProgramLegacy(createProgramData(),payload.model,state,{actorId:'local-user',preserveUnsupported:true});assert.ok(initial.ok);const port=createProgramLegacyPort({actorId:'local-user',readData:()=>initial.data,mutate:async()=>{calls++;return{ok:false,reason:'no-write'};}});
  const before=calls,html=renderToStaticMarkup(<ProgramLegacySourceReview data={initial.data} port={port} flowRef={made.flow.ref} blocked={false} canStart={()=>true}/>);assert.match(html,/저장 원문과 기존 항목 직접 연결/);assert.equal(calls,before);
});
test('partial unmatched private records are not labeled as deleted raw rows; exact mapped refs still use true removal language', () => {
  const raw = '# 원문 연결\n- [ ] 같은 제목\n  - 시간: 10:00\n- [ ] 같은 제목\n  - 시간: 14:00\n- [ ] 보관할 참고\n- [ ] 원문 참고\n';
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'unlinked-label', documentId: 'unlinked-label-doc', revisionId: 'v1', rawText: raw, committedAt: NOW }); assert.ok(made.ok);
  const { source: _s, parsedItems: _p, sourceLineItemIdentityMap: _m, fidelityManifest: _f, ...authoring } = made.flow.authoring;
  const state = createPersonalWorkspacePocState(NOW); state.authoredFlows = [{ ...made.flow, authoring, items: made.flow.items.slice(0, 3) }]; state.authoringReceipts = [{ handoffId: authoring.handoffId, flowRef: made.flow.ref, committedAt: NOW }];
  const payload = { model: { version: 1 as const, flows: [] }, state }, prepared = readProgramLegacySourceMapping(payload, made.flow.ref, { partial: true }); assert.ok(prepared.ok);
  const h = hydrateProgramLegacy(createProgramData(), payload.model, state, { actorId: 'local-user', preserveUnsupported: true }); assert.ok(h.ok); let data = h.data;
  const act = (action: ProgramLegacySourceAction) => { const view = prepareProgramLegacyView(data, { actorId: 'local-user', now: NOW, onlyFlowRef: made.flow.ref }); assert.ok(view.ok); const r = applyProgramLegacySourceAction(data, { actorId: 'local-user', expectedToken: view.token, action }); assert.ok(r.transition.ok, JSON.stringify(r.issues)); data = r.transition.data; };
  act({ type: 'map-partial-items', flowRef: made.flow.ref, requestId: 'map-unlinked', expectedSourceToken: prepared.sourceToken, now: NOW,
    rowChoices: { [made.flow.items[0].ref]: { kind: 'existing', itemRef: made.flow.items[0].ref }, [made.flow.items[1].ref]: { kind: 'new' }, [made.flow.items[2].ref]: { kind: 'source-only' }, [made.flow.items[3].ref]: { kind: 'source-only' } },
    unmatchedItems: { [made.flow.items[1].ref]: 'keep-personal', [made.flow.items[2].ref]: 'archive-execution' } });
  act({ type: 'stage', flowRef: made.flow.ref, requestId: 'time-only', rawText: raw.replace('10:00', '11:00'), now: NOW });
  const owner = JSON.parse(data.spaces['local-user'].legacySnapshot!.raw).sourceLifecycle.owners[made.flow.ref], before = JSON.stringify(data), changes = programLegacySourceChanges(owner, 'program-source:time-only');
  const unlinked = changes.filter(change => programLegacySourceUnlinkedItem(owner, change)); assert.equal(unlinked.length, 2);
  assert.equal(made.flow.items[0].title, made.flow.items[1].title);
  const trulyRemoved = { id: `item:${made.flow.items[0].ref}`, itemRef: made.flow.items[0].ref, kind: 'removed' as const };
  assert.equal(programLegacySourceUnlinkedItem(owner, trulyRemoved), false);
  assert.equal(programLegacySourceUnlinkedItem({ ...owner, partialMapping: undefined }, unlinked[0]), false);
  assert.equal(programLegacySourceUnlinkedItem({ ...owner, effective: { ...owner.effective, itemRevisions: { ...owner.effective.itemRevisions, [unlinked[0].itemRef!]: 'program-source:time-only' } } }, unlinked[0]), false);
  for (const change of unlinked) {
    const rows = programLegacySourceComparison(owner, 'program-source:time-only', change);
    assert.ok(rows.some(row => row.incoming === '새 원문 행 연결 없음 · 개인 항목 보존'));
    assert.ok(rows.every(row => !row.incoming.includes('빠짐') && !row.incoming.includes('(없음)')));
  }
  let writes = 0; const port = createProgramLegacyPort({ actorId: 'local-user', readData: () => data, mutate: async () => { writes++; return { ok: false, reason: 'no-write' }; } });
  const html = renderToStaticMarkup(<ProgramLegacySourceReview data={data} port={port} flowRef={made.flow.ref} blocked={false} canStart={() => true} />);
  assert.equal((html.match(/<legend>기존 개인 항목 · 새 원문 행 연결 없음<\/legend>/g) ?? []).length, 2);
  assert.match(html, /기존 항목 유지/); assert.match(html, /원문 연결 없음 확인 · 개인 항목 보존/);
  assert.doesNotMatch(html, /새 원문에서 빠진 항목|원문 삭제 확인/); assert.match(html, /바뀐 항목/); assert.match(html, /11:00/);
  assert.equal(writes, 0); assert.equal(JSON.stringify(data), before);
});
test('authentic removed source identity still renders deletion comparison and explicit private preservation', () => {
  const originalRaw = '# 실제 원문 삭제\n- [ ] 빠질 항목\n  - 시간: 10:00\n- [ ] 남길 항목\n';
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'true-removal', documentId: 'true-removal-doc', revisionId: 'v1', rawText: originalRaw, committedAt: NOW }); assert.ok(made.ok);
  const state = createPersonalWorkspacePocState(NOW); state.authoredFlows = [made.flow]; state.authoringReceipts = [{ handoffId: made.flow.authoring.handoffId, flowRef: made.flow.ref, committedAt: NOW }];
  const h = hydrateProgramLegacy(createProgramData(), { version: 1, flows: [] }, state, { actorId: 'local-user' }); assert.ok(h.ok);
  const view = prepareProgramLegacyView(h.data, { actorId: 'local-user', now: NOW, onlyFlowRef: made.flow.ref }); assert.ok(view.ok);
  const staged = applyProgramLegacySourceAction(h.data, { actorId: 'local-user', expectedToken: view.token, action: { type: 'stage', flowRef: made.flow.ref, requestId: 'removed-source', rawText: originalRaw.replace('- [ ] 빠질 항목\n  - 시간: 10:00\n', ''), now: NOW } }); assert.ok(staged.transition.ok);
  const data = staged.transition.data, owner = JSON.parse(data.spaces['local-user'].legacySnapshot!.raw).sourceLifecycle.owners[made.flow.ref];
  const changes = programLegacySourceChanges(owner, 'program-source:removed-source'); assert.ok(changes.some(change => change.kind === 'removed')); assert.ok(changes.every(change => !programLegacySourceUnlinkedItem(owner, change)));
  let writes = 0; const port = createProgramLegacyPort({ actorId: 'local-user', readData: () => data, mutate: async () => { writes++; return { ok: false, reason: 'no-write' }; } });
  const html = renderToStaticMarkup(<ProgramLegacySourceReview data={data} port={port} flowRef={made.flow.ref} blocked={false} canStart={() => true} />);
  assert.match(html, /새 원문에서 빠진 항목/); assert.match(html, /원문 삭제 확인 · 내 항목 보존/); assert.doesNotMatch(html, /새 원문 행 연결 없음/); assert.equal(writes, 0);
});
