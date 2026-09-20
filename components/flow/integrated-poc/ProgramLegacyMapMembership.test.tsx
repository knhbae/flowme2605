import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { loadProgramPlanUi } from './ProgramLegacyPlan.test-support';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles, sourceBackedMyFlowMaps } from '../../../lib/flow/source-backed-my-flow';
import { buildPersonalWorkspacePocReadModel } from '../../../lib/flow/personal-workspace-poc-read-model';
import { createPersonalWorkspacePocState } from '../../../lib/flow/personal-workspace-poc-state';
import { createProgramData, validateProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { hydrateProgramLegacy } from '../../../lib/flow/integrated-poc/legacy-projection';
import { programClone } from '../../../lib/flow/integrated-poc/contract';
import { readProgramLegacyMapMembership } from '../../../lib/flow/integrated-poc/legacy-map-membership-transition';
import type { ProgramEditorFlush } from '../../../lib/flow/integrated-poc/document-action';
import type * as Component from './ProgramLegacyMapMembership';

const now = '2026-09-14T11:00:00.000Z', mapId = 'curated-opic-mock-course';
function harness(canStart = () => true) {
  const entries: Record<string, string> = {
    [`flow:map:saved:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: now, anchor: '2026-09-30' })),
    [`flow:map:persistence:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: now, anchor: '2026-09-30' })),
  };
  const read = buildPersonalWorkspacePocReadModel({ length: 2, key: i => Object.keys(entries)[i] ?? null, getItem: k => entries[k] ?? null }, sourceBackedMyFlowBundles);
  assert.ok(read.ok);
  const hydrated = hydrateProgramLegacy(createProgramData(), read.model, createPersonalWorkspacePocState(now), { actorId: 'local-user', preserveUnsupported: true });
  assert.ok(hydrated.ok);
  let data = hydrated.data, cursor = 0, writes = 0, fail = false, port: ProgramEditorFlush | null = null;
  const slots: any[] = [];
  const hooks = { ...React,
    useState: (initial: any) => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], (value: any) => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: (initial: any) => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useEffect: (fn: () => void) => { const i = cursor++; if (!(i in slots)) { slots[i] = true; fn(); } },
  };
  const component = loadProgramPlanUi(fileURLToPath(new URL('./ProgramLegacyMapMembership.tsx', import.meta.url)), hooks) as typeof Component;
  const groupRef = read.model.flows[0].presentation!.mapGroup!.groupRef;
  function render() {
    cursor = 0;
    const tree = component.ProgramLegacyMapMembership({ data, groupRef, canStart, onRegisterEditors: p => { port = p; }, mutate: async (_label, build) => {
      if (fail) return { ok: false, reason: 'quota' }; const result = build(data);
      if (!result.ok) return { ok: false, reason: result.reason }; if (result.changed) writes++; data = result.data;
      return { ok: true, result: result.result };
    } });
    const nodes: any[] = []; const visit = (node: any) => { if (Array.isArray(node)) node.forEach(visit); else if (node?.props) { nodes.push(node); visit(node.props.children); } }; visit(tree);
    return { tree, nodes, button: (name: string) => nodes.find(node => node.type === 'button' && node.props.children === name), radios: nodes.filter(node => node.type === 'input' && node.props.type === 'radio') };
  }
  return { render, groupRef, get data() { return data; }, get writes() { return writes; }, get port() { return port!; }, fail: (value: boolean) => { fail = value; }, replace: (next: typeof data) => { data = next; } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('reading unchanged actual Map membership and comparing identical source write nothing', async () => {
  const h = harness(), before = JSON.stringify(h.data); const view = h.render();
  assert.ok(renderToStaticMarkup(view.tree).includes('Map 구성 변경 확인'));
  view.button('현재 Map 구성 비교').props.onClick(); await settle();
  const after = h.render(); assert.equal(h.writes, 0); assert.equal(JSON.stringify(h.data), before);
  assert.ok(renderToStaticMarkup(after.tree).includes('비교할 하위 Flow 구성 변경이 없습니다.'));
});

test('local membership choices cancel and Escape without writes; locked and quota saves retain exact choices before atomic retry', async t => {
  const h = harness(), originalData = programClone(h.data), index = sourceBackedMyFlowMaps.findIndex(map => map.id === mapId);
  const original = sourceBackedMyFlowMaps[index]; assert.ok(original.flowSlugs.length > 1);
  t.after(() => { sourceBackedMyFlowMaps[index] = original; });
  sourceBackedMyFlowMaps[index] = { ...original, flowSlugs: original.flowSlugs.slice(1) };
  let view = h.render(); view.button('현재 Map 구성 비교').props.onClick(); await settle(); view = h.render();
  assert.equal(h.writes, 0); assert.equal(JSON.stringify(h.data), JSON.stringify(originalData)); assert.equal(view.radios.length, 2); assert.ok(view.radios.every(radio => !radio.props.checked));
  const staged = JSON.stringify(h.data);
  view.radios[1].props.onChange(); view = h.render(); assert.equal(h.writes, 0); assert.equal(await h.port.flushAll(), false);
  assert.equal(h.port.pendingDocumentIds?.().length, 2); assert.ok(h.port.captureDrafts?.()[0].raw.includes('incoming'));
  view.button('취소').props.onClick(); view = h.render(); assert.equal(JSON.stringify(h.data), staged); assert.equal(h.port.hasPendingInput?.(), false);
  view.button('현재 Map 구성 비교').props.onClick(); await settle(); view = h.render();
  view.radios[1].props.onChange(); view = h.render(); view.tree.props.onKeyDown({ key: 'Escape', preventDefault() {} }); view = h.render(); assert.equal(JSON.stringify(h.data), staged);
  view.button('현재 Map 구성 비교').props.onClick(); await settle(); view = h.render();
  view.radios[1].props.onChange(); view = h.render(); const release = h.port.lockInput(); view.button('선택한 구성 적용').props.onClick(); await settle(); assert.equal(h.writes, 0); release();
  h.fail(true); view = h.render(); view.button('선택한 구성 적용').props.onClick(); await settle(); view = h.render(); assert.equal(JSON.stringify(h.data), staged); assert.equal(view.radios[1].props.checked, true);
  h.fail(false); view.button('선택한 구성 적용').props.onClick(); await settle(); h.render(); assert.equal(h.writes, 1);
  const result = readProgramLegacyMapMembership(h.data, 'local-user', h.groupRef); assert.ok(result.ok); assert.equal(result.retainedChildren.length, 1);
  assert.deepEqual(h.data.spaces['local-user'].text, originalData.spaces['local-user'].text); assert.deepEqual(h.data.public, originalData.public);
});

test('personal edits during a local membership choice disable stale apply and preserve the local selection', async t => {
  const h = harness(), index = sourceBackedMyFlowMaps.findIndex(map => map.id === mapId), original = sourceBackedMyFlowMaps[index];
  t.after(() => { sourceBackedMyFlowMaps[index] = original; }); sourceBackedMyFlowMaps[index] = { ...original, flowSlugs: original.flowSlugs.slice(1) };
  let view = h.render(); view.button('현재 Map 구성 비교').props.onClick(); await settle(); view = h.render(); view.radios[1].props.onChange(); view = h.render();
  const changed = programClone(h.data); changed.spaces['local-user'].text.flows[0].title += ' 개인 수정'; assert.ok(validateProgramData(changed)); h.replace(changed);
  view = h.render(); assert.equal(view.button('선택한 구성 적용').props.disabled, true); assert.equal(view.radios[1].props.checked, true);
  const before = JSON.stringify(h.data); view.button('선택한 구성 적용').props.onClick(); await settle(); assert.equal(JSON.stringify(h.data), before); assert.equal(h.writes, 0);
});

test('opening comparisons repeatedly and keeping every connection preserves the original stored state', async t => {
  const h = harness(), originalData = JSON.stringify(h.data), index = sourceBackedMyFlowMaps.findIndex(map => map.id === mapId), original = sourceBackedMyFlowMaps[index];
  t.after(() => { sourceBackedMyFlowMaps[index] = original; }); sourceBackedMyFlowMaps[index] = { ...original, flowSlugs: original.flowSlugs.slice(1) };
  for (let count = 0; count < 3; count++) {
    let view = h.render(); view.button('현재 Map 구성 비교').props.onClick(); await settle(); view = h.render();
    assert.equal(h.port.hasPendingInput?.(), true); assert.equal(view.button('현재 Map 구성 비교').props.disabled, true);
    view.button('현재 Map 구성 비교').props.onClick(); await settle(); view = h.render();
    assert.equal(h.writes, 0); assert.equal(JSON.stringify(h.data), originalData);
    assert.equal(view.button('선택한 구성 적용').props.disabled, true);
    view.radios[0].props.onChange(); view = h.render(); view.button('선택한 구성 적용').props.onClick(); await settle();
    assert.equal(h.writes, 0); assert.equal(JSON.stringify(h.data), originalData);
  }
});

test('a plan opened after the membership render blocks comparison through the live guard', async () => {
  let planPending = false; const h = harness(() => !planPending), before = JSON.stringify(h.data), view = h.render();
  planPending = true; view.button('현재 Map 구성 비교').props.onClick(); await settle();
  assert.equal(h.writes, 0); assert.equal(JSON.stringify(h.data), before); assert.equal(h.port.hasPendingInput?.(), false);
  assert.equal(h.render().radios.length, 0);
});

test('a changed source after preview cannot apply an earlier membership choice', async t => {
  const h = harness(), before = JSON.stringify(h.data), index = sourceBackedMyFlowMaps.findIndex(map => map.id === mapId), original = sourceBackedMyFlowMaps[index];
  t.after(() => { sourceBackedMyFlowMaps[index] = original; }); sourceBackedMyFlowMaps[index] = { ...original, flowSlugs: original.flowSlugs.slice(1) };
  let view = h.render(); view.button('현재 Map 구성 비교').props.onClick(); await settle(); view = h.render(); view.radios[1].props.onChange(); view = h.render();
  sourceBackedMyFlowMaps[index] = original;
  view.button('선택한 구성 적용').props.onClick(); await settle(); view = h.render();
  assert.equal(h.writes, 0); assert.equal(JSON.stringify(h.data), before); assert.equal(view.radios[1].props.checked, true);
  assert.ok(renderToStaticMarkup(view.tree).includes('다시 비교'));
});
