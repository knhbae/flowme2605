import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles } from '../source-backed-my-flow';
import { buildPersonalWorkspacePocReadModel } from '../personal-workspace-poc-read-model';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { createProgramData, validateProgramData } from './program-data';
import { hydrateProgramLegacy } from './legacy-projection';
import { readProgramLegacyMapPlan } from './program-legacy-map-plan';
import { readProgramLegacyPlan } from './program-legacy-plan';
import { programClone } from './contract';
import { textWorkspaceModel as M } from './text-workspace';

const actorId = 'local-user', now = '2026-09-14T00:00:00.000Z';
function fixture(mapIds = ['curated-opic-mock-course']) {
  const keys: Record<string, string> = {};
  for (const mapId of mapIds) {
    keys[`flow:map:saved:${mapId}`] = JSON.stringify(buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: now, anchor: '2026-09-30' }));
    keys[`flow:map:persistence:${mapId}`] = JSON.stringify(buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: now, anchor: '2026-09-30' }));
  }
  const source = buildPersonalWorkspacePocReadModel({ length: Object.keys(keys).length, key: i => Object.keys(keys)[i] ?? null, getItem: key => keys[key] ?? null }, sourceBackedMyFlowBundles);
  assert.ok(source.ok);
  const hydrated = hydrateProgramLegacy(createProgramData(), source.model, createPersonalWorkspacePocState(now), { actorId, preserveUnsupported: true });
  assert.ok(hydrated.ok);
  return { data: hydrated.data, originals: source.model.flows };
}

test('Map selected first and non-first original children retain independently read sorted results', () => {
  const f = fixture(), refs = f.originals.map(flow => flow.ref);
  assert.equal(refs.length, 2);
  for (const selected of refs) {
    const before = JSON.stringify(f.data), read = readProgramLegacyMapPlan(f.data, actorId, selected, now);
    assert.ok(read.ok, JSON.stringify(read));
    assert.deepEqual(read.childFlowRefs, [...refs].sort((a, b) => a.localeCompare(b)));
    for (const child of read.children) assert.deepEqual(child, readProgramLegacyPlan(f.data, actorId, child.flow.ref, now));
    assert.equal(read.children.filter(child => child.flow.ref === selected).length, 1);
    assert.equal(JSON.stringify(f.data), before);
  }
});

test('Map reused selected child keeps private rebase, dates and numeric records separate from sibling source', () => {
  const f = fixture(), changed = f.originals.find(flow => flow.items.length === 14)!;
  const sibling = f.originals.find(flow => flow.ref !== changed.ref)!, item = changed.items[0];
  const space = f.data.spaces[actorId], binding = space.savedBindings.find(row => row.flowRef === changed.ref)!;
  const lineId = binding.itemLines[item.ref], originalRaw = space.legacySnapshot!.raw;
  const originalRead = readProgramLegacyPlan(f.data, actorId, changed.ref, now); assert.ok(originalRead.ok);
  const originalRow = originalRead.rows.find(row => row.itemRef === item.ref)!;
  space.text = M.updateTask(space.text, lineId, { title: '개인 제목', note: '개인 기록 보존', date: '2026-10-05' });
  space.text = M.recordProgress(space.text, lineId, '2026-10-05', 35);
  space.text = M.recordProgress(space.text, lineId, '2026-10-06', 100);
  assert.ok(validateProgramData(f.data));
  const before = programClone(f.data), history = M.progressHistory(space.text, lineId);
  for (const selected of [changed.ref, sibling.ref]) {
    const read = readProgramLegacyMapPlan(f.data, actorId, selected, now); assert.ok(read.ok, JSON.stringify(read));
    const a = read.children.find(child => child.flow.ref === changed.ref)!, b = read.children.find(child => child.flow.ref === sibling.ref)!;
    assert.deepEqual(a, readProgramLegacyPlan(f.data, actorId, changed.ref, now));
    assert.deepEqual(b, readProgramLegacyPlan(f.data, actorId, sibling.ref, now));
    assert.equal(a.view.rebased, true); assert.equal(b.view.rebased, false);
    assert.equal(a.view.payload.state.revision, b.view.payload.state.revision + 1);
    assert.equal(a.rows.find(row => row.itemRef === item.ref)!.executionDate, '2026-10-05');
    assert.equal(a.rows.find(row => row.itemRef === item.ref)!.sourceDate, originalRow.sourceDate);
    assert.equal(a.rows.find(row => row.itemRef === item.ref)!.planDate, originalRow.planDate);
    assert.equal(a.token, originalRead.token, 'private changes cannot change source ownership/token');
    assert.equal(a.view.payload.state.personalPlanOverlays![changed.ref].items[item.ref].memo, '개인 기록 보존');
    assert.equal(b.view.payload.state.personalPlanOverlays?.[changed.ref], undefined);
    assert.equal(a.view.payload.state.completions[item.ref].status, 'completed');
    assert.equal(b.view.payload.state.completions[item.ref], undefined);
    assert.deepEqual(a.view.payload.model, b.view.payload.model);
  }
  assert.deepEqual(M.progressHistory(space.text, lineId), history);
  assert.equal(space.legacySnapshot!.raw, originalRaw); assert.deepEqual(f.data, before);
});

test('Map output mutation cannot become a cache and same-input corruption is freshly refused', () => {
  const f = fixture(), selected = f.originals[1].ref;
  const read = readProgramLegacyMapPlan(f.data, actorId, selected, now); assert.ok(read.ok);
  const pristine = structuredClone(read), inputBytes = JSON.stringify(f.data);
  read.children[0].rows[0].title = 'mutated output';
  read.children[0].view.payload.state.revision += 10;
  read.childFlowRefs.length = 0;
  read.expectedSpace.savedBindings.length = 0;
  assert.equal(JSON.stringify(f.data), inputBytes);
  assert.deepEqual(readProgramLegacyMapPlan(f.data, actorId, selected, now), pristine);
  const snapshot = f.data.spaces[actorId].legacySnapshot!, validRaw = snapshot.raw;
  const malformed = JSON.parse(validRaw); malformed.model.flows[0].items[0].flowId = 'foreign-flow';
  snapshot.raw = JSON.stringify(malformed);
  assert.equal(readProgramLegacyMapPlan(f.data, actorId, selected, now).ok, false);
  snapshot.raw = validRaw;
  assert.deepEqual(readProgramLegacyMapPlan(f.data, actorId, selected, now), pristine);
});

test('Map selected missing/foreign actor and a valid different Map cannot reuse another selected group', () => {
  const f = fixture(['curated-opic-mock-course', 'curated-allblanc-workout-park']);
  const before = JSON.stringify(f.data);
  assert.equal(readProgramLegacyMapPlan(f.data, actorId, 'saved-flow:missing:missing', now).ok, false);
  assert.equal(readProgramLegacyMapPlan(f.data, 'creator-minji', f.originals[0].ref, now).ok, false);
  assert.equal(readProgramLegacyMapPlan(f.data, actorId, f.originals[0].ref, 'invalid-time').ok, false);
  for (const selected of [f.originals[0], f.originals.find(flow => flow.presentation?.mapGroup?.groupRef !== f.originals[0].presentation?.mapGroup?.groupRef)!]) {
    const read = readProgramLegacyMapPlan(f.data, actorId, selected.ref, now); assert.ok(read.ok, JSON.stringify(read));
    assert.equal(read.group.groupRef, selected.presentation!.mapGroup!.groupRef);
    assert.deepEqual(read.childFlowRefs, f.originals.filter(flow => flow.presentation?.mapGroup?.groupRef === read.group.groupRef).map(flow => flow.ref).sort((a, b) => a.localeCompare(b)));
  }
  assert.equal(JSON.stringify(f.data), before);
});
