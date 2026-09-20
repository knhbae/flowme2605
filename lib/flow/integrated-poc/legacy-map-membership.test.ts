import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { buildPersonalWorkspacePocReadModel } from '../personal-workspace-poc-read-model';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord,
  sourceBackedMyFlowBundles, sourceBackedMyFlowMaps } from '../source-backed-my-flow';
import { readProgramLegacyMapMembershipBase, readProgramLegacyCurrentMapMembership, inspectProgramLegacyMapMembershipRevision,
  compareProgramLegacyMapMembership, programLegacyMapMembershipRevisionId, validateProgramLegacyMapMembershipSelection,
  type ProgramLegacyMapMembershipRevision, type ProgramLegacyMapMembershipSelection } from './legacy-map-membership';

const now = '2026-09-14T12:00:00.000Z';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

/** Actual OPIc IDs, followed by a simulated later catalog in this test worker.
 * No production source files, browser state or storage are modified. */
function fixture(t: TestContext) {
  const mapId = 'curated-opic-mock-course';
  const index = sourceBackedMyFlowMaps.findIndex(map => map.id === mapId);
  assert.ok(index >= 0);
  const originalMap = sourceBackedMyFlowMaps[index], mapBytes = JSON.stringify(originalMap);
  const entries: Record<string, string> = {
    [`flow:map:saved:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: now, anchor: '2026-09-30' })),
    [`flow:map:persistence:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: now, anchor: '2026-09-30' })),
  };
  const read = buildPersonalWorkspacePocReadModel({ length: 2, key: i => Object.keys(entries)[i] ?? null, getItem: key => entries[key] ?? null }, sourceBackedMyFlowBundles);
  assert.ok(read.ok);
  const originals = clone(read.model.flows), groupRef = originals[0].presentation!.mapGroup!.groupRef;
  assert.equal(originals.length, 2);
  const removed = originals[0];
  const bundleIndex = sourceBackedMyFlowBundles.findIndex(bundle => bundle.flow.id === removed.flowId);
  const originalBundle = sourceBackedMyFlowBundles[bundleIndex], bundleBytes = JSON.stringify(originalBundle);
  t.after(() => {
    sourceBackedMyFlowMaps[index] = originalMap; sourceBackedMyFlowBundles[bundleIndex] = originalBundle;
    assert.equal(JSON.stringify(originalMap), mapBytes); assert.equal(JSON.stringify(originalBundle), bundleBytes);
  });
  const base = readProgramLegacyMapMembershipBase(originals, groupRef); assert.ok(base.ok, JSON.stringify({ base, flows: originals.map(flow => ({ ref: flow.ref, savedCopyId: flow.savedCopyId, group: flow.presentation?.mapGroup, anchor: flow.anchorDate })) }));
  const current = () => { const result = readProgramLegacyCurrentMapMembership(originals, groupRef, now); assert.ok(result.ok, JSON.stringify(result)); return result; };
  const removeChild = () => { sourceBackedMyFlowMaps[index] = { ...clone(originalMap), flowSlugs: originalMap.flowSlugs.filter(slug => slug !== removed.sourceSlug) }; };
  const selection = (revision: ProgramLegacyMapMembershipRevision): ProgramLegacyMapMembershipSelection => {
    const revisionId = programLegacyMapMembershipRevisionId(revision);
    return { version: 1, baseSourceToken: base.sourceToken, revisions: { [revisionId]: revision }, acceptedAbsences: { [removed.ref]: revisionId } };
  };
  return { originals, groupRef, originalMap, originalBundle, index, bundleIndex, removed, base, current, removeChild, selection,
    restore: () => { sourceBackedMyFlowMaps[index] = originalMap; } };
}

test('whole Map factory evidence preserves original tuples and optional absence is a no-write read', t => {
  const f = fixture(t), before = JSON.stringify(f.originals), read = f.current();
  assert.equal(read.flows.length, 2);
  assert.equal(read.revision.catalogMap.version, f.originalMap.version);
  assert.equal(read.revisionId, programLegacyMapMembershipRevisionId(read.revision));
  assert.ok(validateProgramLegacyMapMembershipSelection(undefined, f.originals, f.groupRef));
  const compared = compareProgramLegacyMapMembership(f.originals, read.revision);
  assert.ok(compared.ok); assert.deepEqual(compared.changes, []); assert.deepEqual(compared.retainedChildren, []);
  assert.deepEqual(compared.originalChildren, f.base.flows); assert.deepEqual(compared.effectiveChildren, f.base.flows);
  assert.equal(compared.expectedSelection, 'null'); assert.equal(JSON.stringify(f.originals), before);
  // Returned evidence and projections are detached from original/factory owners.
  read.revision.catalogMap.title = 'only this returned object'; read.flows[0].items[0].title = 'only this projection';
  assert.equal(sourceBackedMyFlowMaps[f.index], f.originalMap); assert.equal(JSON.stringify(f.originals), before);
});

test('simulated child absence and identical reappearance require explicit membership choices while keeping personal source', t => {
  const f = fixture(t), original = f.current(), before = JSON.stringify(f.originals);
  f.removeChild();
  const later = f.current(), staged = compareProgramLegacyMapMembership(f.originals, later.revision);
  assert.ok(staged.ok); assert.equal(staged.offeredChildren.length, 1); assert.equal(staged.effectiveChildren.length, 2);
  assert.deepEqual(staged.changes, [{ id: `child:${f.removed.ref}`, flowRef: f.removed.ref, kind: 'removed' }]);
  const selected = f.selection(later.revision), selectedBytes = JSON.stringify(selected);
  assert.ok(validateProgramLegacyMapMembershipSelection(selected, f.originals, f.groupRef));
  const accepted = compareProgramLegacyMapMembership(f.originals, later.revision, selected);
  assert.ok(accepted.ok); assert.deepEqual(accepted.changes, []); assert.equal(accepted.effectiveChildren.length, 1);
  assert.deepEqual(accepted.retainedChildren, [f.removed]);
  assert.equal(accepted.retainedChildren[0].presentation!.mapGroup!.childCount, 2, 'old affiliation stays evidence, not a rewritten group');
  f.restore();
  const returned = f.current(); assert.deepEqual(returned.revision, original.revision);
  const returnReview = compareProgramLegacyMapMembership(f.originals, returned.revision, selected);
  assert.ok(returnReview.ok); assert.deepEqual(returnReview.changes, [{ id: `child:${f.removed.ref}`, flowRef: f.removed.ref, kind: 'restored' }]);
  assert.deepEqual(returnReview.retainedChildren, [f.removed], 'reading reappearance is not acceptance');
  const restoredSelection = { ...selected, acceptedAbsences: {} };
  const restored = compareProgramLegacyMapMembership(f.originals, returned.revision, restoredSelection);
  assert.ok(restored.ok); assert.deepEqual(restored.changes, []); assert.equal(restored.effectiveChildren.length, 2);
  assert.equal(JSON.stringify(selected), selectedBytes); assert.equal(JSON.stringify(f.originals), before);
  assert.ok(inspectProgramLegacyMapMembershipRevision(later.revision, f.originals).ok, 'old package validation does not depend on current factory state');
});

test('package validation rejects duplicate and mismatched group, child, Step, and source item tuples', t => {
  const f = fixture(t), read = f.current();
  const corruptions: Array<(revision: ProgramLegacyMapMembershipRevision) => void> = [
    x => { x.ownerId = 'foreign'; },
    x => { x.groupRef = 'flow-group:foreign'; },
    x => { x.catalogMap.flowSlugs.push(x.catalogMap.flowSlugs[0]); },
    x => { x.snapshot.flowSlugs.pop(); },
    x => { x.persistence.childFlows.push(clone(x.persistence.childFlows[0])); },
    x => { x.bundles.push(clone(x.bundles[0])); },
    x => { x.persistence.childFlows[0].flowId = 'foreign'; },
    x => { x.persistence.childFlows[0].steps[0].stepId = 'foreign'; },
    x => { x.persistence.childFlows[0].stepIds[0] = 'foreign'; },
    x => { x.snapshot.stepCountsByFlow[x.bundles[0].flow.slug]++; },
    x => { x.bundles[0].items[0].flow_id = 'foreign'; },
    x => { x.bundles[0].items[0].id = 'foreign'; },
    x => { x.bundles[0].items[0].title = 'source Item disagrees with persisted Step'; },
    x => { x.persistence.childFlows[0].steps[0].title = 'persisted Step disagrees with source Item'; },
    x => { x.bundles[0].items.push(clone(x.bundles[0].items[0])); },
    x => { x.bundles[0].itemDetails = [{ item_id: 'foreign', why: 'not this source' }]; },
    x => { x.bundles[0].sections[0].flow_id = 'foreign'; },
    x => { x.snapshot.version = 'custom-revision'; },
    x => { (x as unknown as Record<string, unknown>).revisionId = 'custom-revision'; },
    x => { x.snapshot.personalCopy = { source: 'personal_edit', includedStepIdsByFlow: {}, excludedStepIdsByFlow: {} }; },
  ];
  for (const corrupt of corruptions) {
    const bad = clone(read.revision); corrupt(bad);
    assert.equal(inspectProgramLegacyMapMembershipRevision(bad, f.originals).ok, false, corrupt.toString());
  }
  const malformedOriginals = clone(f.originals).map((flow, index) => index ? flow
    : { ...flow, items: flow.items.map((item, n) => n ? item : { ...item, flowId: 'foreign' }) });
  assert.equal(readProgramLegacyMapMembershipBase(malformedOriginals, f.groupRef).ok, false);
  const incompleteOriginals = [f.originals[0]];
  assert.equal(readProgramLegacyMapMembershipBase(incompleteOriginals, f.groupRef).ok, false);
  assert.equal(readProgramLegacyMapMembershipBase([...f.originals, f.originals[0]], f.groupRef).ok, false);
});

test('missing material, missing Map and empty Map cannot masquerade as accepted child deletion', t => {
  const f = fixture(t);
  sourceBackedMyFlowBundles[f.bundleIndex] = { ...clone(f.originalBundle), flow: { ...clone(f.originalBundle.flow), slug: 'missing-material' } };
  assert.equal(readProgramLegacyCurrentMapMembership(f.originals, f.groupRef, now).ok, false, 'declared child with missing bundle is not removed');
  sourceBackedMyFlowBundles[f.bundleIndex] = f.originalBundle;
  sourceBackedMyFlowMaps[f.index] = { ...clone(f.originalMap), id: 'unavailable-map' };
  assert.equal(readProgramLegacyCurrentMapMembership(f.originals, f.groupRef, now).ok, false);
  sourceBackedMyFlowMaps[f.index] = { ...clone(f.originalMap), flowSlugs: [] };
  const empty = readProgramLegacyCurrentMapMembership(f.originals, f.groupRef, now);
  assert.equal(empty.ok, false); if (!empty.ok) assert.equal(empty.reason, 'empty-map-not-supported');
  f.restore();
  assert.equal(readProgramLegacyCurrentMapMembership(f.originals, f.groupRef, 'not-a-time').ok, false);
});

test('optional selection verifies exact evidence receipts and rejects fabricated or empty-membership policies', t => {
  const f = fixture(t); f.removeChild(); const later = f.current(), selected = f.selection(later.revision);
  for (const corrupt of [
    (x: ProgramLegacyMapMembershipSelection) => { x.baseSourceToken = 'foreign'; },
    (x: ProgramLegacyMapMembershipSelection) => { x.revisions.custom = x.revisions[later.revisionId]; },
    (x: ProgramLegacyMapMembershipSelection) => { x.acceptedAbsences[f.removed.ref] = 'custom'; },
    (x: ProgramLegacyMapMembershipSelection) => { x.acceptedAbsences = { foreign: later.revisionId }; },
    (x: ProgramLegacyMapMembershipSelection) => { x.acceptedAbsences = { [later.flows[0].ref]: later.revisionId }; },
    (x: ProgramLegacyMapMembershipSelection) => { x.acceptedAbsences = Object.fromEntries(f.originals.map(flow => [flow.ref, later.revisionId])); },
  ]) { const bad = clone(selected); corrupt(bad); assert.equal(validateProgramLegacyMapMembershipSelection(bad, f.originals, f.groupRef), false, corrupt.toString()); }
  assert.equal(validateProgramLegacyMapMembershipSelection(selected, f.originals, 'foreign'), false);
});

test('safe evidence reads do not evaluate accessors or call browser storage and network', t => {
  const f = fixture(t), current = f.current(); let accesses = 0;
  const accessor = { ...current.revision };
  Object.defineProperty(accessor, 'bundles', { enumerable: true, get() { accesses++; throw Error('must not evaluate'); } });
  assert.equal(inspectProgramLegacyMapMembershipRevision(accessor, f.originals).ok, false); assert.equal(accesses, 0);
  const cyclic: Record<string, unknown> = { ...current.revision }; cyclic.self = cyclic;
  assert.equal(inspectProgramLegacyMapMembershipRevision(cyclic, f.originals).ok, false);
  const dangerous = JSON.parse(JSON.stringify(current.revision));
  Object.defineProperty(dangerous.catalogMap, '__proto__', { value: {}, enumerable: true });
  assert.equal(inspectProgramLegacyMapMembershipRevision(dangerous, f.originals).ok, false);
  const names = ['localStorage', 'sessionStorage', 'fetch'] as const;
  const descriptors = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  try {
    for (const name of names) Object.defineProperty(globalThis, name, { configurable: true, get() { accesses++; throw Error('external access'); } });
    assert.ok(readProgramLegacyCurrentMapMembership(f.originals, f.groupRef, now).ok);
    assert.ok(compareProgramLegacyMapMembership(f.originals, current.revision).ok); assert.equal(accesses, 0);
  } finally { for (const name of names) { const descriptor = descriptors.get(name); if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); } }
});
