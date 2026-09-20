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
import { PROGRAM_STATE_KEY, programClone, programResult } from '../../../lib/flow/integrated-poc/contract';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { createProgramController } from '../../../lib/flow/integrated-poc/controller';
import { hydrateProgramLegacy } from '../../../lib/flow/integrated-poc/legacy-projection';
import { createProgramLegacyPort } from '../../../lib/flow/integrated-poc/legacy-port';
import { programInputBlocksSnapshot } from '../../../lib/flow/integrated-poc/document-action';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import { createProgramFolder, setProgramDocumentFolder } from '../../../lib/flow/integrated-poc/private-space';
import { createPersonalWorkspacePocState } from '../../../lib/flow/personal-workspace-poc-state';
import { toPersonalWorkspacePocFlowRef, toPersonalWorkspacePocFlowItemRef, type PersonalWorkspacePocReadModel } from '../../../lib/flow/personal-workspace-poc-contract';
import type * as Workspace from './ProgramLegacyWorkspace';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles, sourceBackedMyFlowMaps } from '../../../lib/flow/source-backed-my-flow';
import { buildPersonalWorkspacePocReadModel } from '../../../lib/flow/personal-workspace-poc-read-model';
import { readProgramLegacyMapReview } from '../../../lib/flow/integrated-poc/legacy-map-review';
import { inspectProgramLegacySnapshotPayload } from '../../../lib/flow/integrated-poc/legacy-snapshot';
import { readProgramLegacyMapMembership, previewProgramLegacyMapMembership, applyProgramLegacyMapMembershipPreview } from '../../../lib/flow/integrated-poc/legacy-map-membership-transition';

const componentUrl = new URL('./ProgramLegacyWorkspace.tsx', import.meta.url), require = createRequire(componentUrl);
const root = resolve(dirname(fileURLToPath(componentUrl)), '../../..');
const source = readFileSync(componentUrl, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
const loaded = { exports: {} as typeof Workspace };
const loadedChildren = new Map<string, { exports: unknown }>();
function componentRequire(id: string): unknown {
  if (id.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) };
  if (id.startsWith('./Program')) {
    const cached = loadedChildren.get(id); if (cached) return cached.exports;
    const child = { exports: {} }, code = ts.transpileModule(readFileSync(new URL(`${id}.tsx`, componentUrl), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
    loadedChildren.set(id, child);
    vm.runInThisContext(`(function(module,exports,require){${code.outputText}\n})`)(child, child.exports, componentRequire);
    return child.exports;
  }
  return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
}
vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`, { filename: 'ProgramLegacyWorkspace.compiled.cjs' })(loaded, loaded.exports, componentRequire);
const { ProgramLegacyWorkspace, ProgramLegacyEditorPanel, programLegacyWorkspaceCatalog, createProgramLegacyEditorCoordinator, programLegacyDraftText, programLegacyWorkspaceModel, makeProgramLegacyEditAction, makeProgramLegacyOrderAction, programLegacyIssueText } = loaded.exports;
const ACTOR = 'local-user', NOW = '2026-09-12T05:00:00.000Z';

test('retained Map child shows its document and source, not an empty execution surface; sibling remains executable', t => {
  const mapId = 'curated-opic-mock-course', index = sourceBackedMyFlowMaps.findIndex(map => map.id === mapId);
  const originalMap = sourceBackedMyFlowMaps[index]; assert.ok(originalMap);
  t.after(() => { sourceBackedMyFlowMaps[index] = originalMap; });
  const entries: Record<string, string> = {
    [`flow:map:saved:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: NOW, anchor: '2026-09-30' })),
    [`flow:map:persistence:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: NOW, anchor: '2026-09-30' })),
  };
  const read = buildPersonalWorkspacePocReadModel({ length: 2, key: i => Object.keys(entries)[i] ?? null, getItem: key => entries[key] ?? null }, sourceBackedMyFlowBundles); assert.ok(read.ok);
  const hydrated = hydrateProgramLegacy(createProgramData(), read.model, createPersonalWorkspacePocState(NOW), { actorId: ACTOR, preserveUnsupported: true }); assert.ok(hydrated.ok);
  const removed = read.model.flows.find(flow => flow.title === '오픽 모의고사 2주 계획표')!, sibling = read.model.flows.find(flow => flow.ref !== removed.ref)!;
  const groupRef = removed.presentation!.mapGroup!.groupRef;
  const membership = readProgramLegacyMapMembership(hydrated.data, ACTOR, groupRef); assert.ok(membership.ok);
  sourceBackedMyFlowMaps[index] = { ...originalMap, flowSlugs: originalMap.flowSlugs.filter(slug => slug !== removed.sourceSlug) };
  const stage = { type: 'stage' as const, groupRef, requestId: 'retained-ui', expectedSourceToken: membership.sourceToken, now: NOW };
  const preview = previewProgramLegacyMapMembership(hydrated.data, { actorId: ACTOR, ...stage }); assert.ok(preview.ok);
  const result = applyProgramLegacyMapMembershipPreview(hydrated.data, { actorId: ACTOR, expectedSpace: hydrated.data.spaces[ACTOR], stage, choices: { [`child:${removed.ref}`]: 'incoming' }, expectedPreview: preview.data }); assert.ok(result.ok);
  sourceBackedMyFlowMaps[index] = originalMap;
  const before = JSON.stringify(result.data); let writes = 0;
  const render = (selectedFlowId: string) => renderToStaticMarkup(<ProgramLegacyWorkspace data={result.data} selectedFlowId={selectedFlowId} mutate={async () => { writes++; return { ok: false, reason: 'unexpected' }; }} navigate={() => undefined} onUndo={async () => undefined} today="2026-09-30" />);
  const excluded = render(removed.ref);
  assert.match(excluded, /data-testid="program-retained-flow"/);
  assert.match(excluded, /Map 실행에서 제외하고 기록을 보존 중/);
  assert.match(excluded, /같은 개인 문서 열기/); assert.match(excluded, /제목 수정/);
  assert.match(excluded, /계획 폴더/); assert.match(excluded, /원문과 연결 정보/);
  assert.doesNotMatch(excluded, /0\/0개 완료|my-plan-date-grouped-todos|my-plan-todo-checkbox/);
  const active = render(sibling.ref);
  assert.doesNotMatch(active, /data-testid="program-retained-flow"/);
  assert.match(active, /my-plan-date-grouped-todos/);
  assert.equal(JSON.stringify(result.data), before); assert.equal(writes, 0);
  assert.deepEqual(result.data.spaces[ACTOR].text, hydrated.data.spaces[ACTOR].text);
});

test('Map registry treats both legacy-array and structured-object source tokens as opaque; exact captured documents protect actor/deletion without throwing after commit', async () => {
  const f = fixture(), initial = f.controller.snapshot().envelope.data, documentId = initial.spaces[ACTOR].savedBindings[0].documentId;
  for (const sourceToken of ['[{"ref":"original"}]', '{"children":[{"ref":"original"}],"structured":[{"evidence":"exact"}]}', 'not navigation JSON']) {
    let draft: Workspace.ProgramLegacyMapDraft | null = { token: 'view-cas', documentIds: [documentId], action: { groupRef: 'group', requestId: 'review', expectedSourceToken: sourceToken, now: NOW, acknowledgedReasons: ['확인'], sourceByItemRef: { exact: 'https://example.com/source' } } };
    const editor = loaded.exports.createProgramLegacyMapEditor(() => draft, () => false), registry = loaded.exports.programLegacyEditorRegistry(() => [editor]);
    assert.deepEqual(registry.pendingDocumentIds?.(), [documentId]); assert.equal(await registry.flushAll(), false);
    assert.equal(programInputBlocksSnapshot(initial, initial, [registry]), false);
    const deleted = programClone(initial); deleted.spaces[ACTOR].text.flows = deleted.spaces[ACTOR].text.flows.filter(doc => doc.id !== documentId);
    assert.equal(programInputBlocksSnapshot(initial, deleted, [registry]), true);
    const switched = programClone(initial); switched.activeActorId = 'minji'; assert.equal(programInputBlocksSnapshot(initial, switched, [registry]), true);
    let presented = initial, writes = 0;
    const values = new Map<string, string>();
    const controller = createProgramController({ initialData: initial, exclusive: async work => work(), storage: { getItem: key => values.get(key) ?? null, setItem: (key, raw) => { writes++; values.set(key, raw); }, removeItem: key => { values.delete(key); } }, onChange: next => {
      assert.equal(programInputBlocksSnapshot(presented, next.envelope.data, [registry]), false); presented = next.envelope.data;
    } }); assert.ok(controller.ok);
    const result = await controller.mutate('Map observer integration', before => { const next = programClone(before); M.getDocument(next.spaces[ACTOR].text, documentId)!.title = '저장과 화면 모두 반영'; return programResult(before, next, 'saved'); }, { actorId: ACTOR });
    assert.equal(result.ok, true); assert.equal(writes, 1); assert.equal(M.getDocument(presented.spaces[ACTOR].text, documentId)?.title, '저장과 화면 모두 반영');
    assert.equal(draft?.action.expectedSourceToken, sourceToken); assert.match(registry.captureDrafts?.()[0].raw ?? '', /https:\/\/example.com\/source/);
    draft = null; assert.equal(await registry.flushAll(), true); assert.deepEqual(registry.pendingDocumentIds?.(), []);
  }
  assert.doesNotMatch(source, /JSON\.parse\(draft\.action\.expectedSourceToken\)/);
  assert.match(source, /documentIds: data\.spaces\[actorId\]\.savedBindings\.filter/);
});

test('held real-source Map SSR exposes exact review reasons, original source and explicit start without execution or writes', () => {
  const mapId = 'moving-d30', saved = buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: NOW });
  const persistence = buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: NOW }); assert.ok(saved); assert.ok(persistence);
  persistence.readiness = { ...persistence.readiness, content: 'needs_creator_review', reasons: ['항목별 원문 URL을 확인하세요'] };
  const keys: Record<string, string> = { [`flow:map:saved:${mapId}`]: JSON.stringify(saved), [`flow:map:persistence:${mapId}`]: JSON.stringify(persistence) };
  const read = buildPersonalWorkspacePocReadModel({ get length() { return Object.keys(keys).length; }, key: index => Object.keys(keys)[index] ?? null, getItem: key => keys[key] ?? null }, sourceBackedMyFlowBundles); assert.ok(read.ok);
  const data = hydrateProgramLegacy(createProgramData(), read.model, createPersonalWorkspacePocState(NOW), { actorId: ACTOR, preserveUnsupported: true }); assert.ok(data.ok);
  let writes = 0;
  const html = renderToStaticMarkup(<ProgramLegacyWorkspace data={data.data} mutate={async () => { writes++; return { ok: false, reason: 'unexpected' }; }} navigate={() => undefined} onUndo={async () => undefined} today="2026-09-12" />);
  assert.match(html, /Map 원문·실행 조건 검토/); assert.match(html, /항목별 원문 URL을 확인하세요/);
  assert.match(html, /조건과 출처를 확인하며 검토 시작/); assert.match(html, /공식 정보의 검증을 대신하지 않습니다/);
  assert.match(html, /원문 보기:/); assert.doesNotMatch(html, /role="checkbox"/); assert.equal(writes, 0);
  assert.match(html, /실행 보류 중/); assert.doesNotMatch(html, /0\/0개 완료/);
});

test('actual Funmom quality hold does not claim execution availability or zero-of-zero completion and retains six original evidence disclosures',()=>{
  const mapId='curated-funmom-learning-park',saved=buildSourceBackedFlowMapSavedSnapshot(mapId,{savedAt:NOW}),persistence=buildSourceBackedFlowMapPersistenceRecord(mapId,{savedAt:NOW});assert(saved);assert(persistence);
  const keys:Record<string,string>={[`flow:map:saved:${mapId}`]:JSON.stringify(saved),[`flow:map:persistence:${mapId}`]:JSON.stringify(persistence)};
  const read=buildPersonalWorkspacePocReadModel({get length(){return Object.keys(keys).length;},key:index=>Object.keys(keys)[index]??null,getItem:key=>keys[key]??null},sourceBackedMyFlowBundles);assert(read.ok);
  const hydrated=hydrateProgramLegacy(createProgramData(),read.model,createPersonalWorkspacePocState(NOW),{actorId:ACTOR,preserveUnsupported:true});assert(hydrated.ok);
  const before=JSON.stringify(hydrated.data);let writes=0;
  const html=renderToStaticMarkup(<ProgramLegacyWorkspace data={hydrated.data} mutate={async()=>{writes++;return{ok:false,reason:'unexpected'};}} navigate={()=>undefined} onUndo={async()=>undefined} today="2026-09-12"/>);
  assert.match(html,/실행 보류 중/);assert.doesNotMatch(html,/0\/0개 완료|<p>공개 저장 후 My Flow에서 실행 가능한 source-backed Step 기록으로 사용할 수 있습니다\.<\/p>/);
  assert.match(html,/제작·원문 품질 검토가 먼저 필요합니다/);assert.equal((html.match(/<summary>(?:월|화|수|목|금|토):/g)??[]).length,6);
  assert.equal((html.match(/원문 보기:/g)??[]).length,6);assert.doesNotMatch(html,/개인 검토 완료/);
  assert.equal(JSON.stringify(hydrated.data),before);assert.equal(writes,0);
});

test('unknown executable saved Map separates source-review blockers from execution and preserves ordinary completion intent', async () => {
  const f = fixture(), original = { ...f.model.flows[0], origin: 'source-backed-map' as const, presentation: { mapGroup: { groupRef: 'flow-group:map-one', ownerId: 'map-one', title: '검증 지도', childOrder: 0, childCount: 1, executionState: 'executable' as const, reviewReasons: [] } } };
  const model: PersonalWorkspacePocReadModel = { ...f.model, flows: [original] };
  const hydrated = hydrateProgramLegacy(createProgramData(), model, createPersonalWorkspacePocState(NOW), { actorId: ACTOR, preserveUnsupported: true }); assert.ok(hydrated.ok);
  let writes = 0, raw: string | null = null;
  const controller = createProgramController({ initialData: hydrated.data, exclusive: async work => work(), storage: { getItem: () => raw, setItem: (_key, value) => { writes++; raw = value; }, removeItem: () => { throw Error('unexpected'); } } }); assert.ok(controller.ok);
  const mutate: Workspace.ProgramLegacyWorkspaceProps['mutate'] = (label, build, options) => controller.mutate(label, build, { actorId: ACTOR, ...options });
  const port = createProgramLegacyPort({ actorId: ACTOR, readData: () => controller.snapshot().envelope.data, mutate });
  const view = port.read(NOW); assert.ok(view.ok); const effective = programLegacyWorkspaceModel(view)!.flows[0];
  const checked = inspectProgramLegacySnapshotPayload(view.payload); assert.ok(checked.ok);
  const review = readProgramLegacyMapReview(checked.mapSourceFlows, 'flow-group:map-one')!; assert.ok(review.blockers.length > 0);
  assert.equal(loaded.exports.programLegacyMapExecutionHeld(effective), false);
  const html = renderToStaticMarkup(<ProgramLegacyWorkspace data={hydrated.data} mutate={mutate} navigate={() => undefined} onUndo={async () => undefined} today="2026-09-12" />);
  assert.match(html, /원문 연결 보완 필요/); assert.match(html, /기존 개인 실행은 보류되지 않았습니다/); assert.match(html, /0\/2개 완료/); assert.doesNotMatch(html, /실행 보류 중/);
  assert.match(html, /<details class="source"><summary>Map 원문·실행 조건 검토/); assert.equal(writes, 0);
  const result = await port.commit({ expectedToken: view.token, action: { type: 'complete', itemRef: original.items[0].ref, completed: true, now: NOW }, now: NOW, executionDate: '2026-09-12' }); assert.ok(result.ok); assert.equal(writes, 1);
  const after = controller.snapshot().envelope.data;
  assert.equal(after.spaces[ACTOR].text.progressRecords.length, 1); assert.deepEqual(JSON.parse(after.spaces[ACTOR].legacySnapshot!.raw).model, view.payload.model);
  assert.deepEqual(after.public, hydrated.data.public); assert.equal(original.presentation.mapGroup!.executionState, 'executable');
});

test('actual review-hold and curated quality hold reject completion with zero writes and disable the Program edit entry', async () => {
  for (const mapId of ['moving-d30', 'curated-funmom-learning-park']) {
    const saved = buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: NOW }), persistence = buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: NOW }); assert.ok(saved); assert.ok(persistence);
    if (mapId === 'moving-d30') persistence.readiness = { ...persistence.readiness, content: 'needs_creator_review', reasons: ['항목별 원문 URL 확인'] };
    const keys: Record<string, string> = { [`flow:map:saved:${mapId}`]: JSON.stringify(saved), [`flow:map:persistence:${mapId}`]: JSON.stringify(persistence) };
    const read = buildPersonalWorkspacePocReadModel({ length: 2, key: index => Object.keys(keys)[index] ?? null, getItem: key => keys[key] ?? null }, sourceBackedMyFlowBundles); assert.ok(read.ok);
    const hydrated = hydrateProgramLegacy(createProgramData(), read.model, createPersonalWorkspacePocState(NOW), { actorId: ACTOR, preserveUnsupported: true }); assert.ok(hydrated.ok);
    let writes = 0;
    const controller = createProgramController({ initialData: hydrated.data, exclusive: async work => work(), storage: { getItem: () => null, setItem: () => { writes++; }, removeItem: () => { throw Error('unexpected'); } } }); assert.ok(controller.ok);
    const mutate: Workspace.ProgramLegacyWorkspaceProps['mutate'] = (label, build, options) => controller.mutate(label, build, { actorId: ACTOR, ...options });
    const port = createProgramLegacyPort({ actorId: ACTOR, readData: () => controller.snapshot().envelope.data, mutate }), view = port.read(NOW); assert.ok(view.ok);
    const effective = programLegacyWorkspaceModel(view)!.flows[0]; assert.equal(loaded.exports.programLegacyMapExecutionHeld(effective), true);
    const html = renderToStaticMarkup(<ProgramLegacyWorkspace data={hydrated.data} mutate={mutate} navigate={() => undefined} onUndo={async () => undefined} today="2026-09-12" />);
    assert.match(html, /실행 보류 중/); assert.doesNotMatch(html, /data-testid="my-plan-edit"|기존 개인 실행은 보류되지 않았습니다/);
    const result = await port.commit({ expectedToken: view.token, action: { type: 'complete', itemRef: effective.items[0].ref, completed: true, now: NOW }, now: NOW, executionDate: '2026-09-12' }); assert.equal(result.ok, false); assert.equal(writes, 0); assert.deepEqual(controller.snapshot().envelope.data, hydrated.data);
    if (mapId === 'curated-funmom-learning-park') assert.equal(loaded.exports.programLegacyMapExecutionHeld({ ...effective, presentation: { ...effective.presentation, mapGroup: { ...effective.presentation!.mapGroup!, executionState: 'executable' } } }), true);
  }
  assert.match(source, /if \(executionHeld \|\| pending\.current/);
  assert.match(source, /if \(executionHeld \|\| !view\.ok/);
  assert.match(source, /onToggleItem: row => \{ if \(!executionHeld && canAct\(\)\)/);
});

test('validated personal Map review closes completed disclosure without weakening source quality or showing a disabled repeat action', async () => {
  const mapId = 'moving-d30', saved = buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: NOW });
  const persistence = buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: NOW }); assert.ok(saved); assert.ok(persistence);
  persistence.readiness = { ...persistence.readiness, content: 'needs_creator_review', reasons: ['항목별 원문 URL을 확인하세요'] };
  const keys: Record<string, string> = { [`flow:map:saved:${mapId}`]: JSON.stringify(saved), [`flow:map:persistence:${mapId}`]: JSON.stringify(persistence) };
  const read = buildPersonalWorkspacePocReadModel({ get length() { return Object.keys(keys).length; }, key: index => Object.keys(keys)[index] ?? null, getItem: key => keys[key] ?? null }, sourceBackedMyFlowBundles); assert.ok(read.ok);
  const hydrated = hydrateProgramLegacy(createProgramData(), read.model, createPersonalWorkspacePocState(NOW), { actorId: ACTOR, preserveUnsupported: true }); assert.ok(hydrated.ok);
  let raw: string | null = null, writes = 0;
  const controller = createProgramController({ initialData: hydrated.data, storage: { getItem: () => raw, setItem: (_key, value) => { raw = value; writes++; }, removeItem: () => { throw Error('unexpected'); } }, exclusive: async work => work() }); assert.ok(controller.ok);
  const mutate: Workspace.ProgramLegacyWorkspaceProps['mutate'] = (label, build, options) => controller.mutate(label, build, { actorId: ACTOR, ...options });
  const port = createProgramLegacyPort({ actorId: ACTOR, readData: () => controller.snapshot().envelope.data, mutate }), view = port.read(NOW); assert.ok(view.ok);
  const checked = inspectProgramLegacySnapshotPayload(view.payload); assert.ok(checked.ok);
  const review = readProgramLegacyMapReview(checked.mapSourceFlows, checked.mapSourceFlows[0].presentation!.mapGroup!.groupRef)!;
  const beforeHtml = renderToStaticMarkup(<ProgramLegacyWorkspace data={hydrated.data} mutate={mutate} navigate={() => undefined} onUndo={async () => undefined} today="2026-09-12" />);
  assert.match(beforeHtml, /<details[^>]*open=""><summary>Map 원문·실행 조건 검토/);
  assert.equal((beforeHtml.match(/Map 실행 조건 검토가 필요합니다\./g) ?? []).length, 1);
  for (const item of review.items) assert.ok(beforeHtml.includes(item.title));
  const result = await port.commitMapReview({ expectedToken: view.token, action: { groupRef: review.groupRef, expectedSourceToken: review.sourceToken, requestId: 'map-display-review', now: NOW, acknowledgedReasons: review.reasons, sourceByItemRef: Object.fromEntries(review.items.map(item => [item.itemRef, item.sourceUrls[0]])) } }); assert.ok(result.ok);
  const after = controller.snapshot().envelope.data, beforeRender = raw;
  const html = renderToStaticMarkup(<ProgramLegacyWorkspace data={after} mutate={mutate} navigate={() => undefined} onUndo={async () => undefined} today="2026-09-12" />);
  assert.match(html, /<details class="source"><summary>Map 원문·실행 조건 검토<span class="reviewState">개인 검토 완료/);
  assert.doesNotMatch(html, /조건과 출처를 확인하며 검토 시작/); assert.match(html, /role="checkbox"/);
  assert.match(html, /0\/5개 완료/); assert.doesNotMatch(html, /실행 보류 중/);
  assert.equal(raw, beforeRender); assert.equal(writes, 1);
  const refreshed = port.read(NOW); assert.ok(refreshed.ok);
  const effective = programLegacyWorkspaceModel(refreshed)!.flows[0], present = loaded.exports.programLegacyMapReviewPresentation;
  assert.deepEqual(present(review, effective), { confirmed: true, required: false });
  assert.deepEqual(present({ ...review, blockers: ['원문 품질 보류'] }, effective), { confirmed: false, required: true });
  assert.deepEqual(present(review), { confirmed: false, required: true });
  assert.deepEqual(present(review, { ...effective, presentation: { ...effective.presentation, mapGroup: { ...effective.presentation!.mapGroup!, groupRef: 'foreign-group' } } }), { confirmed: false, required: true });
  assert.deepEqual(JSON.parse(after.spaces[ACTOR].legacySnapshot!.raw).model, view.payload.model);
});

test('capability notices group only equal reasons and preserve every actual item and accessible checkbox sizing', () => {
  const base = { flowRef: 'flow', savedCopyId: 'copy', flowId: 'flow', itemId: 'item', seriesId: null, capability: 'held' as const, reason: 'map-review-required', itemRef: 'one', title: '첫 항목' };
  const groups = loaded.exports.programLegacyCapabilityNotices([base, { ...base, itemRef: 'two', title: '다음 항목' }, { ...base, itemRef: 'three', reason: 'source-item-execution-archived', title: '보관한 항목' }, { ...base, itemRef: 'four', capability: 'series', reason: 'recurrence-window-required', title: '반복 항목' }]);
  assert.equal(groups.length, 3); assert.deepEqual(groups.map(group => group.items.length), [2, 1, 1]);
  assert.deepEqual(groups[0].items.map(item => item.title), ['첫 항목', '다음 항목']);
  assert.match(groups[1].text, /실행 보관/); assert.match(groups[2].text, /회차 도구/);
  const css = readFileSync(new URL('./ProgramLegacyWorkspace.module.css', import.meta.url), 'utf8');
  assert.match(css, /\.workspace \.mapAcknowledge\{[^}]*min-height:44px/);
  assert.match(css, /\.workspace \.mapAcknowledge input\{width:20px;height:20px;min-height:20px/);
});
test('Map pending registry retains exact selection on quota and actor rejection, and successful retry releases only an explicitly cleared draft', async () => {
  const f = fixture(), initial = f.controller.snapshot().envelope.data, documentId = initial.spaces[ACTOR].savedBindings[0].documentId;
  let draft: Workspace.ProgramLegacyMapDraft | null = { token: 'exact-cas', documentIds: [documentId], action: { groupRef: 'group', requestId: 'same-retry', expectedSourceToken: '{"children":[],"structured":[]}', now: NOW, acknowledgedReasons: ['원문 확인'], sourceByItemRef: { item: 'https://example.com/actual' } } };
  const captured = draft, editor = loaded.exports.createProgramLegacyMapEditor(() => draft, () => false);
  let quota = true, count = 0; const values = new Map<string, string>();
  const controller = createProgramController({ initialData: initial, exclusive: async work => work(), storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => { count++; if (quota) throw new Error('QuotaExceededError'); values.set(key, value); }, removeItem: () => { throw new Error('unexpected remove'); } } }); assert.ok(controller.ok);
  const build = (before: typeof initial) => { const next = programClone(before); M.getDocument(next.spaces[ACTOR].text, documentId)!.title = '승인 뒤 화면'; return programResult(before, next, 'same-retry'); };
  assert.equal((await controller.mutate('Map 확인', build, { actorId: ACTOR })).ok, false); assert.equal(values.size, 0); assert.equal(draft, captured); assert.equal(await editor.flushAll(), false);
  const attempts = count; assert.equal((await controller.mutate('Map 확인', build, { actorId: 'foreign' })).ok, false); assert.equal(count, attempts); assert.equal(draft, captured);
  quota = false; assert.equal((await controller.mutate('Map 확인', build, { actorId: ACTOR })).ok, true); assert.equal(count, attempts + 1); assert.equal(draft, captured); assert.match(editor.captureDrafts?.()[0].raw ?? '', /원문 확인/);
  draft = null; assert.equal(await editor.flushAll(), true);
});
function fixture() {
  const savedCopyId = 'saved', flowId = 'flow', flowRef = toPersonalWorkspacePocFlowRef(savedCopyId, flowId);
  const model: PersonalWorkspacePocReadModel = { version: 1, flows: [{ ref: flowRef, savedCopyId, flowId, title: '이사 준비', origin: 'legacy-saved-plan', sourceSlug: 'source-exact',
    items: ['one', 'two'].map((itemId, sourceOrder) => ({ ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, itemId), savedCopyId, flowId, itemId, title: `실제 원문 ${itemId}`, description: '원문에 있는 구체적 설명', completionCriterion: '원문의 완료 기준', sourceOrder, sourceDate: '2026-09-10' })) }] };
  const state = createPersonalWorkspacePocState(NOW); state.folders = [{ folderId: 'folder-a', title: '내 폴더', orderKey: 0 }];
  const hydrated = hydrateProgramLegacy(createProgramData(), model, state, { actorId: ACTOR }); assert.ok(hydrated.ok);
  const values = new Map<string, string>([['flow:protected', 'exact source bytes']]), writes: string[] = [];
  const controller = createProgramController({ initialData: hydrated.data, exclusive: async work => work(), storage: {
    getItem: key => { assert.equal(key, PROGRAM_STATE_KEY); return values.get(key) ?? null; },
    setItem: (key, raw) => { assert.equal(key, PROGRAM_STATE_KEY); values.set(key, raw); writes.push(key); },
    removeItem: key => { assert.equal(key, PROGRAM_STATE_KEY); values.delete(key); writes.push(key); },
  } }); assert.ok(controller.ok);
  const mutate: Workspace.ProgramLegacyWorkspaceProps['mutate'] = (label, build, options) => controller.mutate(label, build, { actorId: ACTOR, ...options });
  const port = createProgramLegacyPort({ actorId: ACTOR, readData: () => controller.snapshot().envelope.data, mutate });
  const getView = () => { const view = port.read(NOW); assert.ok(view.ok); return view; };
  return { model, flowRef, itemRef: model.flows[0].items[0].ref, controller, port, mutate, getView, writes, values };
}
test('controlled SSR reuses actual MyPlanExecutionSurface, renders connected identity, source and supported controls with zero writes', () => {
  const f = fixture(), html = renderToStaticMarkup(<ProgramLegacyWorkspace data={f.controller.snapshot().envelope.data} mutate={f.mutate} navigate={() => undefined} onUndo={async () => undefined} today="2026-09-12" />);
  assert.match(html, /my-flow-overview-card/); assert.match(html, /my-plan-date-grouped-todos/); assert.match(html, /실제 원문 one/);
  assert.match(html, /같은 개인 문서 열기/); assert.match(html, /폴더와 개인 항목 순서/); assert.match(html, /원문과 연결 정보/);
  assert.match(html, /source-exact/); assert.match(html, /기존 기능의 연결 범위/); assert.match(html, /반복 회차/); assert.match(html, /원본 변경 비교/);
  assert(!html.includes('my-flow-export-entry')); assert.equal(f.writes.length, 0);
});
test('empty snapshot explains missing connection without rendering an independent old writer', () => {
  const html = renderToStaticMarkup(<ProgramLegacyWorkspace data={createProgramData()} mutate={async () => ({ ok: false, reason: 'unexpected' })} navigate={() => undefined} onUndo={async () => undefined} today="2026-09-12" />);
  assert.match(html, /내 공간에서 기존 계획을 먼저 연결/); assert(!html.includes('my-plan-todo-checkbox'));
  assert(!source.includes('PersonalWorkspacePocSurface')); assert(!/localStorage|commitPersonalWorkspacePocStorage|savePersonalWorkspacePoc/u.test(source));
});
test('explicit legacy route opens the requested saved copy rather than the first sorted binding, with zero writes', () => {
  const f = fixture(), secondCopy = 'second-copy', secondFlowId = 'second-flow';
  const second = { ...f.model.flows[0], savedCopyId: secondCopy, flowId: secondFlowId,
    ref: toPersonalWorkspacePocFlowRef(secondCopy, secondFlowId), title: '두 번째로 고른 계획',
    items: f.model.flows[0].items.map(item => ({ ...item, savedCopyId: secondCopy, flowId: secondFlowId,
      ref: toPersonalWorkspacePocFlowItemRef(secondCopy, secondFlowId, item.itemId) })) };
  const projected = hydrateProgramLegacy(createProgramData(), { ...f.model, flows: [...f.model.flows, second] }, createPersonalWorkspacePocState(NOW), { actorId: ACTOR });
  assert.ok(projected.ok);
  let writes = 0;
  const html = renderToStaticMarkup(<ProgramLegacyWorkspace data={projected.data} selectedFlowId={second.ref}
    mutate={async () => { writes++; return { ok: false, reason: 'unexpected' }; }} navigate={() => undefined} onUndo={async () => undefined} today="2026-09-12" />);
  assert.match(html, /<h2[^>]*>두 번째로 고른 계획<\/h2>/);
  assert.doesNotMatch(html, /<h2[^>]*>이사 준비<\/h2>/);
  assert.equal(writes, 0);
});
test('missing exact legacy target does not fall back to an unrelated saved plan or write', () => {
  const f = fixture(), html = renderToStaticMarkup(<ProgramLegacyWorkspace data={f.controller.snapshot().envelope.data}
    selectedFlowId="saved-flow:missing:missing" mutate={f.mutate} navigate={() => undefined} onUndo={async () => undefined} today="2026-09-12" />);
  assert.match(html, /요청한 기존 계획을 찾을 수 없습니다/);
  assert.doesNotMatch(html, /my-flow-overview-card/);
  assert.equal(f.writes.length, 0);
});
test('actual library selection delegates to guarded parent navigation and does not pre-empt failed input flushing', () => {
  const ast = ts.createSourceFile('workspace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(ast) === 'button'
      && node.attributes.getText(ast).includes("aria-current={selected === entry.ref")) {
      const attr = node.attributes.properties.find(value => ts.isJsxAttribute(value) && value.name.getText(ast) === 'onClick') as ts.JsxAttribute;
      assert.ok(attr.initializer && ts.isJsxExpression(attr.initializer)); handler = attr.initializer.expression;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(handler);
  for (const allowed of [false, true]) {
    const calls: unknown[] = [], entry = { ref: 'saved-flow:exact:second' };
    const click = vm.runInNewContext(`(${handler.getText(ast)})`, { canAct: () => allowed, navigate: (value: unknown) => calls.push(value), entry });
    click(); assert.equal(JSON.stringify(calls), JSON.stringify(allowed ? [{ view: 'legacy', id: entry.ref }] : []));
  }
});
test('actual UI edit action -> port -> one controller write -> same Program document, with original payload and extra private rows retained', async () => {
  const f = fixture(), initial = f.controller.snapshot().envelope.data, binding = initial.spaces[ACTOR].savedBindings[0], lineId = binding.itemLines[f.itemRef];
  await f.mutate('개인 추가', current => { const next = programClone(current); M.getDocument(next.spaces[ACTOR].text, binding.documentId)!.lines.push({ id: 'private-extra', text: '나만 추가한 원문 메모' }); return programResult(current, next, 'private-extra'); });
  const view = f.getView(), draft: Workspace.ProgramLegacyEdit = { kind: 'item', flowRef: f.flowRef, itemRef: f.itemRef, title: '개인 화면에서 바꾼 제목', memo: '새 개인 메모', date: '' };
  const action = makeProgramLegacyEditAction(view, draft, NOW); assert.ok(action);
  const count = f.writes.length, result = await f.port.commit({ expectedToken: view.token, action, now: NOW }); assert.ok(result.ok, JSON.stringify(result)); assert.equal(f.writes.length, count + 1);
  const data = f.controller.snapshot().envelope.data, task = M.tasks(data.spaces[ACTOR].text).find(task => task.id === lineId)!;
  assert.equal(task.title, draft.title); assert.equal(task.note, draft.memo); assert.equal(task.docId, binding.documentId);
  assert.ok(M.getDocument(data.spaces[ACTOR].text, binding.documentId)!.lines.some(line => line.id === 'private-extra'));
  assert.deepEqual(f.getView().payload.model, f.model); assert.equal(f.values.get('flow:protected'), 'exact source bytes');
});
test('date, completion, folder and personal order actions preserve one shared identity and source dates', async () => {
  const f = fixture();
  let view = f.getView(); const date = makeProgramLegacyEditAction(view, { kind: 'date', flowRef: f.flowRef, itemRef: f.itemRef, title: '', memo: '', date: '2026-10-01' }, NOW); assert.ok(date);
  assert.ok((await f.port.commit({ expectedToken: view.token, action: date, now: NOW })).ok);
  view = f.getView(); assert.ok((await f.port.commit({ expectedToken: view.token, action: { type: 'complete', itemRef: f.itemRef, completed: true, now: NOW }, executionDate: '2026-09-12', now: NOW })).ok);
  view = f.getView(); assert.ok((await f.port.commit({ expectedToken: view.token, action: { type: 'move-folder', member: 'saved_flow', memberRef: f.flowRef, folderId: 'folder-a', now: NOW }, now: NOW })).ok);
  view = f.getView(); const order = makeProgramLegacyOrderAction(view, f.flowRef, f.itemRef, 1, NOW); assert.ok(order);
  assert.ok((await f.port.commit({ expectedToken: view.token, action: order, now: NOW })).ok);
  const data = f.controller.snapshot().envelope.data, binding = data.spaces[ACTOR].savedBindings[0], task = M.tasks(data.spaces[ACTOR].text).find(task => task.id === binding.itemLines[f.itemRef])!;
  assert.equal(task.date, '2026-10-01'); assert.equal(task.done, true); assert.equal(M.getDocument(data.spaces[ACTOR].text, binding.documentId)!.folder, '내 폴더');
  assert.equal(programLegacyWorkspaceModel(f.getView())!.flows[0].items.find(item => item.ref === f.itemRef)!.sourceOrder, 1);
  assert.deepEqual(f.getView().payload.model, f.model); assert.equal(f.writes.length, 4);
});
test('stale editor input cannot overwrite a later Program save, and rebuilding against an explicitly accepted latest view retains other fields', async () => {
  const f = fixture(), view = f.getView(), draft: Workspace.ProgramLegacyEdit = { kind: 'item', flowRef: f.flowRef, itemRef: f.itemRef, title: '내 초안', memo: '내 메모', date: '' };
  const action = makeProgramLegacyEditAction(view, draft, NOW); assert.ok(action);
  await f.mutate('날짜 먼저 저장', current => { const next = programClone(current), space = next.spaces[ACTOR]; space.text = M.updateTask(space.text, space.savedBindings[0].itemLines[f.itemRef], { date: '2026-11-11' }); return programResult(current, next, 'date'); });
  assert.equal((await f.port.commit({ expectedToken: view.token, action, now: NOW })).ok, false); assert.equal(f.writes.length, 1); assert.equal(draft.title, '내 초안');
  const latest = f.getView(), acceptedAction = makeProgramLegacyEditAction(latest, draft, NOW); assert.ok(acceptedAction);
  assert.ok((await f.port.commit({ expectedToken: latest.token, action: acceptedAction, now: NOW })).ok);
  const task = M.tasks(f.controller.snapshot().envelope.data.spaces[ACTOR].text)[0]; assert.equal(task.date, '2026-11-11'); assert.equal(task.title, '내 초안');
});
test('invalid dates, foreign refs, empty titles and boundary reorder never produce an action', () => {
  const f = fixture(), view = f.getView(), base: Workspace.ProgramLegacyEdit = { kind: 'item', flowRef: f.flowRef, itemRef: f.itemRef, title: '좋은 제목', memo: '', date: '' };
  assert.equal(makeProgramLegacyEditAction(view, { ...base, kind: 'date', date: '2026-02-30' }, NOW), null);
  assert.equal(makeProgramLegacyEditAction(view, { ...base, title: '' }, NOW), null);
  assert.equal(makeProgramLegacyEditAction(view, { ...base, itemRef: 'foreign' }, NOW), null);
  assert.equal(makeProgramLegacyOrderAction(view, f.flowRef, f.itemRef, -1, NOW), null); assert.equal(f.writes.length, 0);
});
test('flow rename action is a personal overlay, not a source write', async () => {
  const f = fixture(), view = f.getView(), action = makeProgramLegacyEditAction(view, { kind: 'flow', flowRef: f.flowRef, title: '개인 이름', memo: '', date: '' }, NOW); assert.ok(action);
  assert.ok((await f.port.commit({ expectedToken: view.token, action, now: NOW })).ok);
  assert.equal(programLegacyWorkspaceModel(f.getView())!.flows[0].title, '개인 이름'); assert.equal(f.getView().payload.model.flows[0].title, '이사 준비');
});
test('unsupported cases retain accurate recovery text and responsive minimum targets', () => {
  assert.match(programLegacyIssueText('recurrence-window-required'), /회차·예외/); assert.match(programLegacyIssueText('map-review-required'), /Map/);
  assert.match(programLegacyIssueText('unrepresentable-shadow-field'), /버리지 않고/);
  const css = readFileSync(new URL('./ProgramLegacyWorkspace.module.css', import.meta.url), 'utf8');
  assert.match(css, /min-height:44px/); assert.match(css, /max-width:760px/); assert.match(css, /overflow-wrap:anywhere/);
});

function editorFixture() {
  const f = fixture(), view = f.getView();
  const editor: Workspace.ProgramLegacyEditor = { actorId: ACTOR, documentId: f.controller.snapshot().envelope.data.spaces[ACTOR].savedBindings[0].documentId, view,
    draft: { kind: 'item', flowRef: f.flowRef, itemRef: f.itemRef, title: '편집 중인 제목', memo: '첫 줄\n두 번째 줄 <script>', date: '2026-09-12' } };
  return { ...f, editor };
}
test('draft registry changes synchronously before a render, captures exact TXT and blocks other actions', () => {
  const { editor } = editorFixture(), changes: (Workspace.ProgramLegacyEditor | null)[] = [];
  const coordinator = createProgramLegacyEditorCoordinator({ onChange: value => changes.push(value), onLockChange: () => undefined, isBusy: () => false, save: async () => false });
  assert.equal(coordinator.hasPendingInput(), false); assert.equal(coordinator.canAct(), true);
  assert.equal(coordinator.replace(editor), true); assert.equal(coordinator.hasPendingInput(), true); assert.equal(coordinator.canAct(), false);
  assert.deepEqual(coordinator.pendingDocumentIds(), [editor.documentId]);
  assert.equal(coordinator.update({ title: '', memo: '지금 입력한\n미저장 메모', date: '잘못된 날짜' }), true);
  assert.equal(coordinator.read()!.draft.memo, '지금 입력한\n미저장 메모');
  assert.equal(coordinator.captureDrafts()[0].raw, programLegacyDraftText(coordinator.read()!));
  assert.match(coordinator.captureDrafts()[0].raw, /실행 날짜: 잘못된 날짜/); assert.match(coordinator.captureDrafts()[0].raw, /지금 입력한\n미저장 메모/);
  assert.equal(changes.length, 2); assert.equal(coordinator.replace(null), true); assert.deepEqual(coordinator.captureDrafts(), []);
});
test('nested synchronous locks prevent re-input/discard while flush saves once through the single Program port', async () => {
  const f = editorFixture(); let saves = 0; const lockStates: boolean[] = [];
  const coordinator = createProgramLegacyEditorCoordinator({ onChange: () => undefined, onLockChange: locked => lockStates.push(locked), isBusy: () => false, save: async editor => {
    saves++; const action = makeProgramLegacyEditAction(editor.view, editor.draft, NOW); assert.ok(action);
    return (await f.port.commit({ expectedToken: editor.view.token, action, now: NOW })).ok;
  } });
  coordinator.replace(f.editor); const unlockA = coordinator.lockInput(), unlockB = coordinator.lockInput();
  assert.equal(coordinator.update({ title: '잠금 후 재입력' }), false); assert.equal(coordinator.replace(null), false);
  assert.equal(coordinator.canAct(), false); const first = coordinator.flushAll(), second = coordinator.flushAll(); assert.equal(first, second);
  assert.equal(coordinator.update({ memo: 'flush 중 변경' }), false); assert.ok(await first); assert.equal(saves, 1); assert.equal(f.writes.length, 1);
  assert.equal(coordinator.hasPendingInput(), false); assert.equal(await coordinator.flushAll(), true); assert.equal(coordinator.canAct(), false);
  unlockA(); unlockA(); assert.equal(coordinator.canAct(), false); unlockB(); assert.equal(coordinator.canAct(), true);
  assert.deepEqual(lockStates, [true, true, true, false]);
  const task = M.tasks(f.controller.snapshot().envelope.data.spaces[ACTOR].text)[0]; assert.equal(task.title, f.editor.draft.title); assert.equal(task.note, f.editor.draft.memo);
  assert.deepEqual(f.getView().payload.model, f.model);
});
test('invalid input or rejected save survives flush and remains editable after releasing the lock', async () => {
  const f = editorFixture(); let failByThrow = false;
  const coordinator = createProgramLegacyEditorCoordinator({ onChange: () => undefined, onLockChange: () => undefined, isBusy: () => false, save: async editor => {
    if (failByThrow) throw new Error('unavailable');
    const action = makeProgramLegacyEditAction(editor.view, editor.draft, NOW); return action ? (await f.port.commit({ expectedToken: editor.view.token, action, now: NOW })).ok : false;
  } });
  coordinator.replace({ ...f.editor, draft: { ...f.editor.draft, kind: 'date', date: '2026-02-30' } });
  const before = coordinator.read(), unlock = coordinator.lockInput(); assert.equal(await coordinator.flushAll(), false);
  assert.equal(coordinator.read(), before); assert.equal(f.writes.length, 0); assert.deepEqual(coordinator.pendingDocumentIds(), [f.editor.documentId]);
  unlock(); coordinator.update({ date: '2026-02-28' }); failByThrow = true;
  assert.equal(await coordinator.flushAll(), false); assert.equal(coordinator.read()!.draft.date, '2026-02-28'); assert.equal(f.writes.length, 0);
  failByThrow = false; assert.equal(await coordinator.flushAll(), true); assert.equal(f.writes.length, 1);
});
test('a stale port failure preserves registry input and never writes a second copy', async () => {
  const f = editorFixture(), coordinator = createProgramLegacyEditorCoordinator({ onChange: () => undefined, onLockChange: () => undefined, isBusy: () => false, save: async editor => {
    const action = makeProgramLegacyEditAction(editor.view, editor.draft, NOW); assert.ok(action);
    return (await f.port.commit({ expectedToken: editor.view.token, action, now: NOW })).ok;
  } });
  coordinator.replace(f.editor);
  await f.mutate('다른 변경', current => { const next = programClone(current); next.spaces[ACTOR].text = M.updateTask(next.spaces[ACTOR].text, next.spaces[ACTOR].savedBindings[0].itemLines[f.itemRef], { date: '2026-11-11' }); return programResult(current, next, 'date'); });
  const before = coordinator.captureDrafts(); assert.equal(await coordinator.flushAll(), false); assert.equal(f.writes.length, 1);
  assert.deepEqual(coordinator.captureDrafts(), before); assert.equal(coordinator.hasPendingInput(), true);
});
test('unavailable-view panel keeps editable fields, escaped copyable raw and explicit close/continue paths', () => {
  const { editor } = editorFixture(), noop = () => undefined;
  const props = { editor, locked: false, busy: false, stale: true, latest: null, discarding: true, update: noop, save: noop, acceptLatest: noop, close: noop, discard: noop, resume: noop, copy: noop };
  const html = renderToStaticMarkup(<ProgramLegacyEditorPanel {...props} />);
  assert.match(html, /편집 중인 제목/); assert.match(html, /개인 메모/); assert.match(html, /복사할 편집 원문/); assert.match(html, /입력 원문 복사/);
  assert.match(html, /편집 닫기/); assert.match(html, /입력 버리고 닫기/); assert.match(html, /계속 편집/); assert.match(html, /&lt;script&gt;/); assert(!html.includes('<script>'));
  assert.match(html, /<textarea[^>]*readOnly=""/); assert.match(html, /<input[^>]*value="편집 중인 제목"/);
  assert(source.indexOf('{editor && <ProgramLegacyEditorPanel') < source.indexOf('{!view.ok || !model ?'));
  assert(!source.includes('setEditor(null)')); assert.match(source, /captured.actorId !== dataRef.current.activeActorId/);
});
test('locked editor disables inputs and discard, but valid explicit save stays enabled', () => {
  const { editor } = editorFixture(), noop = () => undefined;
  const html = renderToStaticMarkup(<ProgramLegacyEditorPanel editor={editor} locked busy={false} stale={false} latest={null} discarding update={noop} save={noop} acceptLatest={noop} close={noop} discard={noop} resume={noop} copy={noop} />);
  assert.match(html, /<input[^>]*disabled=""/); assert.match(html, /<button class="primary">개인 변경 저장/);
  assert.match(html, /<button disabled="">입력 버리고 닫기/); assert.match(html, /<textarea[^>]*readOnly=""/);
});
test('deep canonical folder paths and selected values render without rewriting or flattening legacy folders', () => {
  const f = fixture(); let data = f.controller.snapshot().envelope.data, parentId: string | null = null;
  const original = data.spaces[ACTOR].legacySnapshot!.raw;
  for (const title of ['내 프로젝트', '이사 준비', '당일 서류']) {
    const created = createProgramFolder(data, { actorId: ACTOR, expectedSpace: data.spaces[ACTOR], requestId: `ssr-${title}`, title, parentId }); assert.ok(created.ok);
    data = created.data; parentId = created.result;
  }
  const moved = setProgramDocumentFolder(data, { actorId: ACTOR, expectedSpace: data.spaces[ACTOR], requestId: 'ssr-folder', documentId: data.spaces[ACTOR].savedBindings[0].documentId, folderId: parentId! }); assert.ok(moved.ok);
  const html = renderToStaticMarkup(<ProgramLegacyWorkspace data={moved.data} mutate={f.mutate} navigate={() => undefined} onUndo={async () => undefined} today="2026-09-12" />);
  assert.match(html, /my-plan-date-grouped-todos/); assert.match(html, /내 프로젝트 \/ 이사 준비 \/ 당일 서류/);
  assert.ok(html.includes(`value="${parentId}" selected=""`)); assert.equal(moved.data.spaces[ACTOR].legacySnapshot!.raw, original);
  assert.equal(programLegacyWorkspaceCatalog(moved.data).byItem[f.itemRef].folderId, parentId);
});
test('an archived selected document leaves the source list, same-document recovery and exact source readable', () => {
  const f = fixture(), data = programClone(f.controller.snapshot().envelope.data);
  data.spaces[ACTOR].archivedDocumentIds.push(data.spaces[ACTOR].savedBindings[0].documentId);
  const html = renderToStaticMarkup(<ProgramLegacyWorkspace data={data} mutate={f.mutate} navigate={() => undefined} onUndo={async () => undefined} today="2026-09-12" />);
  assert.match(html, /계획 찾기/); assert.match(html, /보관 중/); assert.match(html, /연결한 개인 문서 열기/); assert.match(html, /선택한 계획 원문/); assert.match(html, /원문에 있는 구체적 설명/);
  assert(!html.includes('my-plan-todo-checkbox')); assert.equal(f.writes.length, 0);
});
test('mounted source child registry propagates immediate raw, busy/IME refusal and locks without a self-deadlock', async () => {
  let dirty = true, locked = false, valid = false, calls = 0;
  const sourcePort = { hasPendingInput: () => dirty, pendingDocumentIds: () => ['source-document'], captureDrafts: () => [{ title: '비교 원문', raw: '아직 보관하지 않은 원문' }],
    lockInput: () => { locked = true; return () => { locked = false; }; }, flushAll: async () => { calls++; if (valid) dirty = false; return valid; } };
  const ordinary = createProgramLegacyEditorCoordinator({ onChange: () => undefined, onLockChange: () => undefined, isBusy: () => false, save: async () => true });
  const registry = loaded.exports.programLegacyEditorRegistry(() => [ordinary, sourcePort]);
  assert.equal(registry.hasPendingInput!(), true); assert.deepEqual(registry.pendingDocumentIds!(), ['source-document']); assert.equal(registry.captureDrafts!()[0].raw, '아직 보관하지 않은 원문');
  const release = registry.lockInput(); assert.equal(locked, true); assert.equal(await registry.flushAll(), false); assert.equal(dirty, true);
  valid = true; assert.equal(await registry.flushAll(), true); assert.equal(calls, 2); assert.equal(registry.hasPendingInput!(), false); release(); assert.equal(locked, false);
});
test('top-level source review keeps clearance for its outer keyboard focus ring', () => {
  const css = readFileSync(new URL('./ProgramLegacyWorkspace.module.css', import.meta.url), 'utf8');
  assert.match(css, /\.content>\.source\{margin-bottom:12px\}/);
  assert.match(css, /:focus-visible\{outline:3px[^}]*outline-offset:3px/);
});
