import test from 'node:test';
import assert from 'node:assert/strict';
import { createAlphaSyntheticFixtures } from '../alpha-persistence/synthetic-fixtures';
import { captureAlphaAccount } from '../alpha-persistence/program-adapter';
import { createProgramPrivateSpace } from '../program-data';
import { isAccountForOwner } from '../alpha-auth/account-access';
import { preservesAlphaPrivateSources } from './private-boundary';
import type { AlphaAccount } from '../alpha-persistence/contract';
const owner = '11111111-1111-4111-8111-111111111111';
const fixture = createAlphaSyntheticFixtures().find(row => row.name === 'four-saved-origins-and-quick-item')!;
function account() {
  const a = captureAlphaAccount(fixture.envelope, fixture.actorId, owner).account;
  a.source.actorId = owner; a.legacyReceipts = a.legacyReceipts.map(row => ({...row,actorId:owner})); return a;
}
function patchSnapshot(a: AlphaAccount, patch: (raw: any) => void) {
  const raw = JSON.parse(a.space.legacySnapshot!.raw); patch(raw); a.space.legacySnapshot!.raw = JSON.stringify(raw);
}
test('M3 rejects a valid full-domain source-description mutation which shape validation alone accepts', () => {
  const before = account(), next = structuredClone(before);
  patchSnapshot(next, raw => { raw.model.flows[0].items[0].description = 'forged source'; });
  assert.equal(isAccountForOwner(next,owner),true); assert.equal(preservesAlphaPrivateSources(before,next),false);
});
test('M3 source content and source schedule changes are both blocked', () => {
  const before = account();
  for (const field of ['title','sourceDate','description']) {
    const next = structuredClone(before); patchSnapshot(next, raw => { raw.model.flows[0].items[0][field] = field === 'sourceDate' ? '2026-10-01' : 'changed'; });
    assert.equal(preservesAlphaPrivateSources(before,next),false);
  }
});
test('M3 allows valid raw-state-only personal completion and rejects source install/removal', () => {
  const before = account(), next = structuredClone(before);
  patchSnapshot(next, raw => { raw.state.completions[raw.model.flows[0].items[0].ref] = {status:'completed',completedAt:'2026-09-21T01:00:00.000Z'}; });
  assert.equal(isAccountForOwner(next,owner),true); assert.equal(preservesAlphaPrivateSources(before,next),true);
  const empty = structuredClone(before); empty.space = createProgramPrivateSpace();
  assert.equal(preservesAlphaPrivateSources(empty,before),false); assert.equal(preservesAlphaPrivateSources(before,empty),false);
});
test('M3 rejects saved-copy binding removal with its document still present and foreign source owner', () => {
  const before = account(), removed = structuredClone(before); removed.space.savedBindings.shift();
  assert.equal(preservesAlphaPrivateSources(before,removed),false);
  const changed = structuredClone(before); changed.source.actorId='22222222-2222-4222-8222-222222222222';
  assert.equal(preservesAlphaPrivateSources(before,changed),false);
});
test('M3 malformed nested source payload and corrupt raw fail closed', () => {
  const before=account(), next=structuredClone(before); next.space.legacySnapshot!.raw='{';
  assert.equal(preservesAlphaPrivateSources(before,next),false);
});
