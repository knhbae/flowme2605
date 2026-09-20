import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareProgramDocumentAction, flushProgramEditorCollection, withProgramEditorLock } from './document-action';

test('clean document opens without any save or mutation', async () => {
  let saves = 0;
  assert.equal(await prepareProgramDocumentAction({ dirty: () => false, stillSelected: () => true, save: async () => { saves++; return true; } }), 'ready');
  assert.equal(saves, 0);
});
test('dirty editor is flushed before an action can use committed text', async () => {
  let dirty = true, saves = 0;
  assert.equal(await prepareProgramDocumentAction({ dirty: () => dirty, stillSelected: () => true, save: async () => { saves++; dirty = false; return true; } }), 'ready');
  assert.equal(saves, 1);
});
test('failed, missing, or throwing editor save prevents opening against stale text', async () => {
  for (const save of [undefined, async () => false, async () => { throw Error('quota'); }]) {
    assert.equal(await prepareProgramDocumentAction({ dirty: () => true, stillSelected: () => true, save }), 'save-failed');
  }
});
test('newer unsaved input prevents opening even after the first save returns', async () => {
  assert.equal(await prepareProgramDocumentAction({ dirty: () => true, stillSelected: () => true, save: async () => true }), 'save-failed');
});
test('leaving the document during save cancels the deferred action', async () => {
  let selected = true, dirty = true;
  assert.equal(await prepareProgramDocumentAction({ dirty: () => dirty, stillSelected: () => selected, save: async () => { selected = false; dirty = false; return true; } }), 'cancelled');
});
test('already abandoned document never starts a save', async () => {
  let saves = 0;
  assert.equal(await prepareProgramDocumentAction({ dirty: () => true, stillSelected: () => false, save: async () => { saves++; return true; } }), 'cancelled');
  assert.equal(saves, 0);
});
test('global transitions flush both the visible editor and a hidden dirty editor', async () => {
  const dirty = [true, true]; const saved: number[] = [];
  assert.equal(await flushProgramEditorCollection(() => dirty.map((_, index) => ({ dirty: () => dirty[index], save: async () => { saved.push(index); dirty[index] = false; return true; } }))), true);
  assert.deepEqual(saved, [0, 1]);
});
test('global transition stays blocked by a failed hidden draft', async () => {
  assert.equal(await flushProgramEditorCollection(() => [{ dirty: () => false }, { dirty: () => true, save: async () => false }]), false);
});
test('typing into an earlier editor during a later save keeps the global transition blocked', async () => {
  let firstDirty = false, secondDirty = true;
  assert.equal(await flushProgramEditorCollection(() => [{ dirty: () => firstDirty }, { dirty: () => secondDirty, save: async () => { firstDirty = true; secondDirty = false; return true; } }]), false);
});

test('input remains locked from before flush through a delayed transaction, then unlocks', async () => {
  let locked = false, dirty = true;
  let finish!: () => void;
  const delayed = new Promise<void>(resolve => { finish = resolve; });
  const editors = { lockInput: () => { locked = true; return () => { locked = false; }; }, flushAll: async () => { assert(locked); dirty = false; return true; } };
  const task = withProgramEditorLock(editors, async () => { assert(await editors.flushAll()); await delayed; assert(locked); assert(!dirty); return 'committed'; });
  assert(locked, 'The lock must be active synchronously, not in a later render');
  await Promise.resolve(); assert(locked);
  finish(); assert.equal(await task, 'committed'); assert.equal(locked, false);
});
test('failed or throwing actions always release input without pretending they saved', async () => {
  let locked = false;
  const editors = { lockInput: () => { locked = true; return () => { locked = false; }; }, flushAll: async () => false };
  assert.equal(await withProgramEditorLock(editors, () => editors.flushAll()), false); assert(!locked);
  await assert.rejects(withProgramEditorLock(editors, async () => { throw Error('quota'); }), /quota/); assert(!locked);
});
