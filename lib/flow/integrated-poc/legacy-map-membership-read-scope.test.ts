import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { buildPersonalWorkspacePocReadModel } from '../personal-workspace-poc-read-model';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles, sourceBackedMyFlowMaps } from '../source-backed-my-flow';
import { readProgramLegacyMapMembershipBase, readProgramLegacyCurrentMapMembership, compareProgramLegacyMapMembership,
  validateProgramLegacyMapMembershipSelection, withProgramLegacyMapMembershipEvidence } from './legacy-map-membership';
import { programLegacyMapMembershipReviewChanges, programLegacyMapMembershipSelection, programMapMembershipCanonical,
  resolveProgramLegacyMapMembershipReview, validateProgramLegacyMapMembershipStore, type ProgramLegacyMapMembershipStore } from './legacy-map-membership-state';

const now = '2026-09-14T14:00:00.000Z', clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function fixture(t: TestContext) {
  const mapId = 'curated-opic-mock-course', index = sourceBackedMyFlowMaps.findIndex(map => map.id === mapId), originalMap = sourceBackedMyFlowMaps[index];
  assert.ok(originalMap); const originalBytes = JSON.stringify(originalMap);
  t.after(() => { sourceBackedMyFlowMaps[index] = originalMap; assert.equal(JSON.stringify(originalMap), originalBytes); });
  const entries: Record<string, string> = {
    [`flow:map:saved:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: now, anchor: '2026-09-30' })),
    [`flow:map:persistence:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: now, anchor: '2026-09-30' })),
  };
  const read = buildPersonalWorkspacePocReadModel({ length: 2, key: i => Object.keys(entries)[i] ?? null, getItem: key => entries[key] ?? null }, sourceBackedMyFlowBundles);
  assert.ok(read.ok); const originals = clone(read.model.flows), removed = originals[0], groupRef = removed.presentation!.mapGroup!.groupRef;
  const base = readProgramLegacyMapMembershipBase(originals, groupRef); assert.ok(base.ok);
  const restored = readProgramLegacyCurrentMapMembership(originals, groupRef, now); assert.ok(restored.ok);
  // Test-worker-only simulated later declaration; never a published new source.
  sourceBackedMyFlowMaps[index] = { ...clone(originalMap), flowSlugs: originalMap.flowSlugs.filter(slug => slug !== removed.sourceSlug) };
  const absent = readProgramLegacyCurrentMapMembership(originals, groupRef, now); assert.ok(absent.ok);
  sourceBackedMyFlowMaps[index] = originalMap;
  const absentSelection = { acceptedAbsences: { [removed.ref]: absent.revisionId } }, empty = { acceptedAbsences: {} };
  const store: ProgramLegacyMapMembershipStore = { version: 1, groups: { [groupRef]: {
    ownerId: base.ownerId, baseSourceToken: base.sourceToken,
    revisions: { [absent.revisionId]: absent.revision, [restored.revisionId]: restored.revision }, effective: empty,
    reviews: [
      { id: 'removed', incomingRevisionId: absent.revisionId, expectedSelection: programMapMembershipCanonical(empty), choices: { [`child:${removed.ref}`]: 'incoming' }, status: 'applied', createdAt: now },
      { id: 'restored', incomingRevisionId: restored.revisionId, expectedSelection: programMapMembershipCanonical(absentSelection), choices: { [`child:${removed.ref}`]: 'incoming' }, status: 'applied', createdAt: now },
    ], undo: { reviewId: 'restored', selection: absentSelection },
  } } };
  assert.equal(validateProgramLegacyMapMembershipStore(store, originals), true);
  return { originals, removed, groupRef, base, restored, absent, store, owner: store.groups[groupRef], absentSelection };
}

test('one fresh read scope preserves historical removal/restoration comparisons and Undo receipts', t => {
  const f = fixture(t), before = JSON.stringify(f.store), originalBytes = JSON.stringify(f.originals);
  const checked = withProgramLegacyMapMembershipEvidence(f.originals, f.groupRef, f.owner.revisions, evidence => {
    assert.equal(evidence.ownerId, f.owner.ownerId); assert.equal(evidence.baseSourceToken, f.owner.baseSourceToken);
    for (const review of f.owner.reviews) {
      const prior = JSON.parse(review.expectedSelection), compared = evidence.compare(review.incomingRevisionId, prior.acceptedAbsences);
      assert.deepEqual(compared, programLegacyMapMembershipReviewChanges(f.owner, f.originals, review));
      assert.equal(evidence.validateAbsences(prior.acceptedAbsences), true);
    }
    assert.equal(evidence.validateAbsences(f.owner.effective.acceptedAbsences), true);
    assert.equal(evidence.validateAbsences(f.owner.undo!.selection.acceptedAbsences), true);
    return true;
  });
  assert.deepEqual(checked, { ok: true, value: true });
  assert.deepEqual(resolveProgramLegacyMapMembershipReview(f.owner, f.originals, f.owner.reviews[0]), f.absentSelection);
  assert.deepEqual(resolveProgramLegacyMapMembershipReview(f.owner, f.originals, f.owner.reviews[1]), { acceptedAbsences: {} });
  assert.equal(validateProgramLegacyMapMembershipStore(undefined, f.originals), true, 'old optional owner remains valid without migration');
  assert.equal(validateProgramLegacyMapMembershipSelection(undefined, f.originals, f.groupRef), true);
  assert.equal(JSON.stringify(f.store), before); assert.equal(JSON.stringify(f.originals), originalBytes);
});

test('captured scope methods expire and returned comparisons cannot mutate the private proof index', t => {
  const f = fixture(t); let expiredValidate: ((value: unknown) => boolean) | undefined;
  let expiredCompare: (() => { ok: boolean }) | undefined;
  const checked = withProgramLegacyMapMembershipEvidence(f.originals, f.groupRef, f.owner.revisions, evidence => {
    expiredValidate = evidence.validateAbsences;
    expiredCompare = () => evidence.compare(f.absent.revisionId, {});
    const first = evidence.compare(f.absent.revisionId, {}); assert.ok(first.ok);
    first.originalChildren[0].items[0].title = 'only returned output'; first.offeredChildren.length = 0;
    const next = evidence.compare(f.absent.revisionId, {}); assert.ok(next.ok);
    assert.notEqual(next.originalChildren[0].items[0].title, 'only returned output'); assert.equal(next.offeredChildren.length, 1);
    assert.equal(evidence.compare('invented-revision', {}).ok, false);
    return true;
  });
  assert.ok(checked.ok); assert.equal(expiredValidate!({}), false); assert.equal(expiredCompare!().ok, false);
  assert.equal(validateProgramLegacyMapMembershipStore(f.store, f.originals), true);
});

test('same mutable package and original tuples are fully checked again on every public entry', t => {
  const f = fixture(t), revision = f.owner.revisions[f.restored.revisionId];
  const item = revision.bundles[0].items[0], itemId = item.id;
  item.id = 'forged-same-object-item';
  assert.equal(validateProgramLegacyMapMembershipStore(f.store, f.originals), false);
  assert.equal(validateProgramLegacyMapMembershipSelection(programLegacyMapMembershipSelection(f.owner), f.originals, f.groupRef), false);
  assert.equal(compareProgramLegacyMapMembership(f.originals, revision, programLegacyMapMembershipSelection(f.owner)).ok, false);
  let calls = 0;
  assert.equal(withProgramLegacyMapMembershipEvidence(f.originals, f.groupRef, f.owner.revisions, () => { calls++; return true; }).ok, false);
  assert.equal(calls, 0, 'invalid evidence cannot invoke a consumer');
  item.id = itemId; assert.equal(validateProgramLegacyMapMembershipStore(f.store, f.originals), true);
  const originalId = f.originals[0].items[0].itemId;
  assert.equal(Reflect.set(f.originals[0].items[0], 'itemId', 'forged-original-tuple'), true);
  assert.equal(validateProgramLegacyMapMembershipStore(f.store, f.originals), false);
  assert.equal(Reflect.set(f.originals[0].items[0], 'itemId', originalId), true); assert.equal(validateProgramLegacyMapMembershipStore(f.store, f.originals), true);
});

test('fresh history validation rejects mutated review, missing revision, absence and Undo links', t => {
  const f = fixture(t);
  const cases: [string, (store: ProgramLegacyMapMembershipStore) => void][] = [
    ['missing explicit review choice', store => { delete store.groups[f.groupRef].reviews[0].choices[`child:${f.removed.ref}`]; }],
    ['foreign choice', store => { store.groups[f.groupRef].reviews[1].choices['child:foreign'] = 'incoming'; }],
    ['duplicate review ID', store => { store.groups[f.groupRef].reviews[1].id = 'removed'; }],
    ['missing revision', store => { delete store.groups[f.groupRef].revisions[f.absent.revisionId]; }],
    ['foreign absence receipt', store => { store.groups[f.groupRef].effective.acceptedAbsences[f.removed.ref] = 'missing'; }],
    ['present child cannot prove absence', store => { store.groups[f.groupRef].effective.acceptedAbsences[f.removed.ref] = f.restored.revisionId; }],
    ['unmatched Undo review', store => { store.groups[f.groupRef].undo!.reviewId = 'missing'; }],
    ['wrong Undo previous selection', store => { store.groups[f.groupRef].undo!.selection = { acceptedAbsences: {} }; }],
    ['changed original token', store => { store.groups[f.groupRef].baseSourceToken += 'changed'; }],
    ['empty-all-child policy still unsupported', store => { store.groups[f.groupRef].effective.acceptedAbsences = Object.fromEntries(f.originals.map(flow => [flow.ref, f.absent.revisionId])); }],
  ];
  for (const [name, mutate] of cases) {
    const candidate = clone(f.store); assert.equal(validateProgramLegacyMapMembershipStore(candidate, f.originals), true, name);
    mutate(candidate); const bytes = JSON.stringify(candidate);
    assert.equal(validateProgramLegacyMapMembershipStore(candidate, f.originals), false, name);
    assert.equal(JSON.stringify(candidate), bytes, name + ': refusal cannot repair input');
  }
});

test('scope validates fresh descriptor-safe evidence and detaches it from later caller changes', t => {
  const f = fixture(t), revisions = clone(f.owner.revisions); let getterCalls = 0;
  const forged = { ...revisions };
  Object.defineProperty(forged, f.restored.revisionId, { enumerable: true, get: () => { getterCalls++; return f.restored.revision; } });
  assert.equal(withProgramLegacyMapMembershipEvidence(f.originals, f.groupRef, forged, () => true).ok, false); assert.equal(getterCalls, 0);
  const checked = withProgramLegacyMapMembershipEvidence(f.originals, f.groupRef, revisions, evidence => {
    revisions[f.restored.revisionId].bundles[0].items[0].id = 'changed-after-entry';
    assert.equal(evidence.compare(f.restored.revisionId, f.absentSelection.acceptedAbsences).ok, true, 'local detached proof remains its own entry snapshot');
    return true;
  });
  assert.ok(checked.ok);
  assert.equal(withProgramLegacyMapMembershipEvidence(f.originals, f.groupRef, revisions, () => true).ok, false, 'next call must reject mutated input');
});
