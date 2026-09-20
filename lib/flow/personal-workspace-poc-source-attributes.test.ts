import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { materializePersonalWorkspacePocAuthoring } from './personal-workspace-poc-authoring';
import { composePersonalWorkspacePocReadModel } from './personal-workspace-poc-composition';
import { getPersonalWorkspacePocEffectiveSourceFlow } from './personal-workspace-poc-canonical-ownership';
import {
  PERSONAL_WORKSPACE_POC_VERSION,
  type PersonalWorkspacePocAuthoredFlow, type PersonalWorkspacePocFlow, type PersonalWorkspacePocReadModel,
} from './personal-workspace-poc-contract';
import {
  buildPersonalWorkspacePocSourceReadIndex, readPersonalWorkspacePocTaskSourceContext,
  resolvePersonalWorkspacePocSourceFlow, type PersonalWorkspacePocSourceReadIndex,
} from './personal-workspace-poc-source-attributes';
import { buildPersonalWorkspacePocResultProjection } from './personal-workspace-poc-result-projection';
import { createPersonalWorkspacePocState } from './personal-workspace-poc-state';
import { buildPersonalWorkspacePocTasks } from './personal-workspace-poc-view-model';
import {
  applyPersonalWorkspacePocSourceCandidate, createPersonalWorkspacePocLocalFixtureEnvelope,
  createPersonalWorkspacePocSourceCandidateStore, resolvePersonalWorkspacePocSourceCandidateChange,
  stagePersonalWorkspacePocSourceCandidate,
} from './personal-workspace-poc-source-candidates';

const NOW = '2026-09-05T00:00:00.000Z';
const RAW = '# 같은 제목\r\n## 준비\r\n- [x] 같은 일\r\n  - 날짜: 2026-09-05\r\n  - 시간: 09:30\r\n  - 하위 확인: [ ] 준비물\r\n';
const emptyModel: PersonalWorkspacePocReadModel = { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [] };

function made(id = 'source-index-first', rawText = RAW) {
  const result = materializePersonalWorkspacePocAuthoring({ handoffId: id, documentId: `${id}-doc`, revisionId: `${id}-rev`, rawText, committedAt: NOW });
  assert.ok(result.ok); return result.flow;
}

function indexFor(...flows: PersonalWorkspacePocAuthoredFlow[]) {
  const result = buildPersonalWorkspacePocSourceReadIndex({ baseModel: emptyModel, authoredFlows: flows });
  assert.ok(result.ok); return result.index;
}

function assertBlocked(flow: PersonalWorkspacePocAuthoredFlow) {
  const result = buildPersonalWorkspacePocSourceReadIndex({ baseModel: emptyModel, authoredFlows: [made('known-good'), flow] });
  assert.equal(result.ok, false);
  assert.equal(Object.hasOwn(result, 'index'), false, 'no partial result handle');
}

function updateFixture() {
  const flow = made();
  const update = createPersonalWorkspacePocLocalFixtureEnvelope(flow, {
    candidateId: 'read-index-update', incomingRevisionId: 'read-index-incoming',
    incomingRawText: RAW.replace('09:30', '17:00').replace('# 같은 제목', '# 새 원문'), createdAt: NOW,
  });
  assert.ok(update.ok);
  let store = stagePersonalWorkspacePocSourceCandidate(createPersonalWorkspacePocSourceCandidateStore(NOW), update.envelope, update.current, NOW).store;
  for (const change of update.envelope.changes) {
    store = resolvePersonalWorkspacePocSourceCandidateChange(store, { candidateId: update.envelope.candidateId, changeId: change.changeId, resolution: 'use-incoming', now: NOW }).store;
  }
  const applied = applyPersonalWorkspacePocSourceCandidate(store, { candidateId: update.envelope.candidateId, current: update.current, now: NOW });
  assert.equal(applied.code, 'applied');
  const effective = getPersonalWorkspacePocEffectiveSourceFlow(flow, applied.store); assert.ok(effective.ok);
  return { flow, store: applied.store, effective: effective.flow };
}

test('S01 a genuinely decoded full handoff produces exact immutable source attributes without input mutation', () => {
  const flow = JSON.parse(JSON.stringify(made())) as PersonalWorkspacePocAuthoredFlow; const before = JSON.stringify(flow);
  const result = resolvePersonalWorkspacePocSourceFlow(flow, indexFor(flow)); assert.ok(result.ok);
  assert.equal(result.itemContextByRef.get(flow.items[0].ref)?.attributes.time, '09:30');
  assert.equal(result.source.authoring?.rawText, RAW); assert.equal(JSON.stringify(flow), before);
});

test('S02 public index handles contain no raw payload and forged or serialized handles are rejected', () => {
  const flow = made(); const index = indexFor(flow);
  assert.equal(Object.isFrozen(index), true); assert.equal(JSON.stringify(index), '{"version":1}');
  for (const forged of [{ version: 1 }, JSON.parse(JSON.stringify(index)), Object.freeze({ ...index })]) {
    assert.deepEqual(resolvePersonalWorkspacePocSourceFlow(flow, forged as PersonalWorkspacePocSourceReadIndex), { ok: false, reason: 'invalid-source-index' });
    assert.deepEqual(readPersonalWorkspacePocTaskSourceContext(forged as PersonalWorkspacePocSourceReadIndex, flow), { ok: false, reason: 'invalid-source-index' });
  }
});

test('S03 returned source, context attributes and nested values cannot corrupt the cached index', () => {
  const flow = made(); const index = indexFor(flow); const result = resolvePersonalWorkspacePocSourceFlow(flow, index); assert.ok(result.ok);
  const context = result.itemContextByRef.get(flow.items[0].ref)!;
  assert.equal(Reflect.set(result.source.authoring!, 'rawText', '다른 원문'), false);
  assert.equal(Reflect.set(context.attributes, 'time', '23:59'), false);
  assert.equal(Reflect.set(context, 'sourceLine', 99), false);
  assert.equal(Reflect.set(result.sourceItemByRef.get(flow.items[0].ref)!, 'title', '오염'), false);
  if (context.attributes.subchecks?.length) assert.equal(Reflect.set(context.attributes.subchecks[0], 'title', '오염'), false);
  (result.itemContextByRef as Map<string, unknown>).clear();
  (result.sourceItemByRef as Map<string, unknown>).clear();
  const taskRead = readPersonalWorkspacePocTaskSourceContext(index, flow); assert.ok(taskRead.ok);
  assert.equal(Reflect.set(taskRead.itemContextByRef.get(flow.items[0].ref)!.attributes, 'time', '12:12'), false);
  (taskRead.itemContextByRef as Map<string, unknown>).clear();
  const again = resolvePersonalWorkspacePocSourceFlow(flow, index); assert.ok(again.ok);
  assert.equal(again.source.authoring?.rawText, RAW);
  assert.equal(again.itemContextByRef.get(flow.items[0].ref)?.attributes.time, '09:30');
});

test('S04 index construction validates model versions and origins instead of trusting TypeScript casts', () => {
  assert.equal(buildPersonalWorkspacePocSourceReadIndex({ baseModel: { ...emptyModel, version: 9 as 1 } }).ok, false);
  assertBlocked({ ...made(), origin: 'future-origin' } as unknown as PersonalWorkspacePocAuthoredFlow);
});

test('S05 raw, parsed time, parse id and fidelity tampering are rejected before attributes escape', () => {
  const flow = made();
  for (const authoring of [
    { ...flow.authoring, rawText: RAW + '\n변경' },
    { ...flow.authoring, parsedItems: flow.authoring.parsedItems!.map(item => ({ ...item, time: '17:45' })) },
    { ...flow.authoring, parsedItems: flow.authoring.parsedItems!.map(item => ({ ...item, time: '25:99' })) },
    { ...flow.authoring, parseResultId: 'different-parse' },
    { ...flow.authoring, fidelityManifest: { ...flow.authoring.fidelityManifest!, sourceFingerprint: 'different' } },
  ]) assertBlocked({ ...flow, authoring });
});

test('S06 incomplete or stripped typed maps cannot masquerade as a legacy handoff', () => {
  const flow = made();
  for (const authoring of [
    { ...flow.authoring, sourceLineItemIdentityMap: undefined },
    { ...flow.authoring, parsedItems: undefined },
    { ...flow.authoring, parsedItems: undefined, sourceLineItemIdentityMap: undefined },
  ]) assertBlocked({ ...flow, authoring });
});

test('S07 duplicate flow and Item identities fail the entire index without a partial handle', () => {
  const flow = made();
  const duplicate = buildPersonalWorkspacePocSourceReadIndex({ baseModel: { version: 1, flows: [flow] }, authoredFlows: [flow] });
  assert.deepEqual(duplicate, { ok: false, reason: 'duplicate-flow-identity' });
  assertBlocked({ ...flow, items: [...flow.items, flow.items[0]] });
});

test('S08 foreign saved-copy identity is rejected even for the same source title and line', () => {
  const flow = made(); const foreign = made('foreign'); const line = Object.keys(flow.authoring.sourceLineItemIdentityMap!)[0];
  assertBlocked({ ...flow, authoring: { ...flow.authoring, sourceLineItemIdentityMap: {
    ...flow.authoring.sourceLineItemIdentityMap, [line]: { ...flow.authoring.sourceLineItemIdentityMap![line], savedCopyId: foreign.savedCopyId, itemRef: foreign.items[0].ref },
  } } });
});

test('S09 stale raw/revision from a new valid source cannot read an old index', () => {
  const flow = made(); const index = indexFor(flow); const fresh = made('source-index-first', RAW.replace('09:30', '12:20'));
  assert.deepEqual(resolvePersonalWorkspacePocSourceFlow(fresh, index), { ok: false, reason: 'invalid-source-index' });
  assert.deepEqual(readPersonalWorkspacePocTaskSourceContext(index, fresh), { ok: false, reason: 'invalid-source-index' });
});

test('S10 caller mutation after index construction cannot mutate cached values or revive a stale source', () => {
  const flow = JSON.parse(JSON.stringify(made())) as PersonalWorkspacePocAuthoredFlow;
  const snapshot = JSON.parse(JSON.stringify(flow)) as PersonalWorkspacePocAuthoredFlow; const index = indexFor(flow);
  Reflect.set(flow.authoring.parsedItems![0], 'time', '20:20');
  assert.equal(resolvePersonalWorkspacePocSourceFlow(flow, index).ok, false);
  const intact = resolvePersonalWorkspacePocSourceFlow(snapshot, index); assert.ok(intact.ok);
  assert.equal(intact.itemContextByRef.get(snapshot.items[0].ref)?.attributes.time, '09:30');
});

test('S11 personal title, memo, date and order compose after exact source identity validation', () => {
  const flow = made('two', RAW + '- [ ] 둘째\n  - 시간: 15:00\n'); const index = indexFor(flow);
  const state = createPersonalWorkspacePocState(NOW); state.authoredFlows = [flow];
  state.personalPlanOverlays = { [flow.ref]: { flowRef: flow.ref, savedCopyId: flow.savedCopyId, flowId: flow.flowId,
    title: '개인 Flow', orderedItemRefs: flow.items.map(item => item.ref).reverse(), items: {
      [flow.items[0].ref]: { itemRef: flow.items[0].ref, title: '개인 제목', memo: '메모', schedule: { mode: 'unscheduled' } },
    },
  } };
  const composed = composePersonalWorkspacePocReadModel(emptyModel, state); assert.ok(composed.ok);
  const taskRead = readPersonalWorkspacePocTaskSourceContext(index, composed.model.flows[0]); assert.ok(taskRead.ok);
  assert.equal(taskRead.itemContextByRef.get(flow.items[0].ref)?.attributes.time, '09:30');
  assert.equal(resolvePersonalWorkspacePocSourceFlow(composed.model.flows[0], index).ok, false, 'Result still requires the pre-personal source');
});

test('S12 one foreign composed Item causes zero partial tasks rather than mixed trusted rows', () => {
  const first = made(); const second = made('second'); const index = indexFor(first, second);
  const corrupted: PersonalWorkspacePocFlow = { ...second, items: [{ ...second.items[0], itemId: first.items[0].itemId + '-foreign' }] };
  assert.deepEqual(buildPersonalWorkspacePocTasks({ version: 1, flows: [first, corrupted] }, createPersonalWorkspacePocState(NOW), index), []);
});

test('S13 validated legacy lineage remains readable without guessing a time from its label', () => {
  const flow = made(); const { source: _s, parsedItems: _p, sourceLineItemIdentityMap: _m, fidelityManifest: _f, ...legacy } = flow.authoring;
  const old = { ...flow, authoring: legacy } as PersonalWorkspacePocAuthoredFlow;
  const result = resolvePersonalWorkspacePocSourceFlow(old, indexFor(old)); assert.ok(result.ok);
  assert.equal(result.source.authoring?.itemMapping, 'legacy-unavailable'); assert.equal(result.itemContextByRef.size, 0);
});

test('S14 all four saved origins stay untimed without exact authoring attributes', () => {
  const flow = made(); const { authoring: _a, ...base } = flow;
  for (const origin of ['source-backed-map', 'personal-draft', 'canonical-personal-copy', 'legacy-saved-plan'] as const) {
    const saved: PersonalWorkspacePocFlow = { ...base, origin }; const read = buildPersonalWorkspacePocSourceReadIndex({ baseModel: { version: 1, flows: [saved] } });
    assert.ok(read.ok); const result = resolvePersonalWorkspacePocSourceFlow(saved, read.index); assert.ok(result.ok);
    assert.equal(result.itemContextByRef.size, 0);
  }
});

test('S15 authoring preview and execution use the same source index without changing completion owners', () => {
  const flow = made(); const sourceIndex = indexFor(flow); const state = createPersonalWorkspacePocState(NOW);
  const input = { model: { version: 1 as const, flows: [flow] }, state, flowRef: flow.ref, localToday: '2026-09-05', sourceIndex };
  const preview = buildPersonalWorkspacePocResultProjection({ ...input, purpose: 'authoring-preview' });
  const personal = buildPersonalWorkspacePocResultProjection({ ...input, purpose: 'personal-execution' });
  assert.ok(preview.ok && personal.ok); assert.equal(preview.projection.items[0].completed, true); assert.equal(personal.projection.items[0].completed, false);
  assert.equal(preview.projection.items[0].time, personal.projection.items[0].time);
});

test('S16 only an actual validated source update gets an unavailable mapping without stale source-time fallback', () => {
  const { flow, store, effective } = updateFixture(); const before = JSON.stringify({ flow, store });
  const read = buildPersonalWorkspacePocSourceReadIndex({ baseModel: emptyModel, authoredFlows: [flow], sourceCandidateStore: store }); assert.ok(read.ok);
  const result = resolvePersonalWorkspacePocSourceFlow(effective, read.index); assert.ok(result.ok);
  assert.equal(result.source.authoring?.itemMapping, 'legacy-unavailable'); assert.equal(result.itemContextByRef.size, 0);
  assert.equal(resolvePersonalWorkspacePocSourceFlow(effective).ok, false, 'an effective source cannot claim persisted-source provenance by its prefix');
  assert.equal(buildPersonalWorkspacePocSourceReadIndex({ baseModel: { version: 1, flows: [effective] } }).ok, false);
  assert.equal(resolvePersonalWorkspacePocSourceFlow(flow, read.index).ok, false, 'old source cannot borrow current index');
  assert.equal(JSON.stringify({ flow, store }), before);
});

test('S17 malformed source-candidate input or missing base is blocked without publishing partial context', () => {
  const { flow, store } = updateFixture();
  const bad = buildPersonalWorkspacePocSourceReadIndex({ baseModel: emptyModel, authoredFlows: [flow], sourceCandidateStore: { ...store, version: 999 as 1 } });
  assert.equal(bad.ok, false); assert.equal(Object.hasOwn(bad, 'index'), false);
  const missing = buildPersonalWorkspacePocSourceReadIndex({ baseModel: emptyModel, sourceCandidateStore: store });
  assert.equal(missing.ok, false); assert.equal(Object.hasOwn(missing, 'index'), false);
});

test('S18 emitted source DTOs have no runtime imports and the shared reader cannot reach its consumers', (context) => {
  const root = path.resolve('lib/flow'); const entry = path.join(root, 'personal-workspace-poc-source-attributes.ts');
  const contract = readFileSync(path.join(root, 'personal-workspace-poc-source-attributes-contract.ts'), 'utf8');
  const emitted = ts.transpileModule(contract, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  assert.doesNotMatch(emitted, /\brequire\s*\(/u);
  const visited = new Set<string>(); const visiting = new Set<string>(); const cycles: string[] = [];
  function walk(file: string) {
    if (visiting.has(file)) { cycles.push(file); return; }
    if (visited.has(file)) return;
    visited.add(file); visiting.add(file);
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      if (!specifier.startsWith('.')) continue;
      const stem = path.resolve(path.dirname(file), specifier);
      const target = [stem + '.ts', stem + '.tsx', path.join(stem, 'index.ts')].find(existsSync);
      if (target) walk(target);
    }
    visiting.delete(file);
  }
  walk(entry);
  assert.equal(visited.has(path.join(root, 'personal-workspace-poc-result-projection.ts')), false);
  assert.equal(visited.has(path.join(root, 'personal-workspace-poc-view-model.ts')), false);
  assert.deepEqual(cycles, []);
  context.diagnostic(JSON.stringify({ runtimeModules: visited.size, runtimeCycles: cycles.length, dtoRuntimeImports: 0 }));
});
