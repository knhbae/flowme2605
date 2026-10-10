import test from 'node:test';
import assert from 'node:assert/strict';
import { createAlphaHeldMovingFixture, createAlphaSyntheticFixtures } from '../alpha-persistence/synthetic-fixtures';
import { captureAlphaAccount } from '../alpha-persistence/program-adapter';
import { createProgramPrivateSpace } from '../program-data';
import { isAccountForOwner } from '../alpha-auth/account-access';
import { preservesAlphaPrivateExecutionHolds, preservesAlphaPrivateSources } from './private-boundary';
import { textWorkspaceModel as M } from '../text-workspace';
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
function heldAccount() {
  const f = createAlphaHeldMovingFixture(), a = captureAlphaAccount(f.envelope, f.actorId, owner).account;
  a.source.actorId = owner; a.legacyReceipts = a.legacyReceipts.map(row => ({ ...row, actorId: owner }));
  assert(isAccountForOwner(a, owner)); return a;
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
test('M3 execution hold is separate from the immutable source gate and rejects retained canonical text', () => {
  const before = heldAccount(), next = structuredClone(before), binding = next.space.savedBindings[0];
  const line = M.getDocument(next.space.text, binding.documentId)!.lines.find(row => row.id === Object.values(binding.itemLines)[0]); assert(line);
  line.text += ' changed';
  assert(isAccountForOwner(next, owner)); assert.equal(preservesAlphaPrivateSources(before, next), true);
  assert.equal(preservesAlphaPrivateExecutionHolds(before, next), false);
  assert.equal(preservesAlphaPrivateExecutionHolds(before, structuredClone(before)), true);
});
test('M3 execution hold protects retained Flows without making whole-copy removal mandatory retention', () => {
  const before = heldAccount(), next = structuredClone(before), empty = createProgramPrivateSpace();
  next.space.text = empty.text; next.space.savedBindings = []; next.space.position = empty.position;
  assert(isAccountForOwner(next, owner)); assert.equal(preservesAlphaPrivateSources(before, next), true);
  assert.equal(preservesAlphaPrivateExecutionHolds(before, next), true);
  const detached = structuredClone(before); detached.space.savedBindings = [];
  assert.equal(preservesAlphaPrivateSources(before, detached), false);
});
test('M3 execution hold adds no raw legacy-state policy or shared creator/social source restriction', () => {
  const before = heldAccount(), next = structuredClone(before);
  patchSnapshot(next, raw => { raw.state.completions[raw.model.flows[0].items[0].ref] = { status: 'completed', completedAt: '2026-09-21T01:00:00.000Z' }; });
  assert(isAccountForOwner(next, owner)); assert.equal(preservesAlphaPrivateSources(before, next), true);
  assert.equal(preservesAlphaPrivateExecutionHolds(before, next), true);
});
test('M3 text restore and Redo allow unrelated private text but reject retained held canonical changes', () => {
  const before = heldAccount();
  before.space.text = M.addDocument(before.space.text, { title: 'Unrelated private revision' });
  const documentId = before.space.text.documents.at(-1)!.id;
  before.space.text = M.editText(before.space.text, documentId, 'Earlier private text');
  const edited = structuredClone(before); edited.space.text = M.editText(edited.space.text, documentId, 'Later private text');
  const restored = structuredClone(edited); restored.space.text = M.editText(restored.space.text, documentId, 'Earlier private text');
  const redone = structuredClone(restored); redone.space.text = M.editText(redone.space.text, documentId, 'Later private text');
  for (const [current, next] of [[edited, restored], [restored, redone]]) {
    assert(isAccountForOwner(next, owner)); assert.equal(preservesAlphaPrivateSources(current, next), true);
    assert.equal(preservesAlphaPrivateExecutionHolds(current, next), true);
    const changedHeld = structuredClone(next), binding = changedHeld.space.savedBindings[0];
    const line = M.getDocument(changedHeld.space.text, binding.documentId)!.lines.find(row => row.id === Object.values(binding.itemLines)[0]); assert(line);
    line.text += ' Historical held canonical change';
    assert(isAccountForOwner(changedHeld, owner)); assert.equal(preservesAlphaPrivateSources(current, changedHeld), true);
    assert.equal(preservesAlphaPrivateExecutionHolds(current, changedHeld), false);
  }
});
