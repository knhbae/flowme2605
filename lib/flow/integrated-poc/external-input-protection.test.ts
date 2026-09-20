import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone } from './contract';
import { createProgramData } from './program-data';
import { textWorkspaceModel as M } from './text-workspace';
import { programInputBlocksSnapshot, type ProgramEditorFlush } from './document-action';

function fixture() {
  const data = createProgramData(), space = data.spaces[data.activeActorId];
  space.text = M.addDocument(space.text, { title: '작성 중' });
  const id = space.text.documents.at(-1)!.id;
  const editor: ProgramEditorFlush = { flushAll: async () => false, lockInput: () => () => undefined, hasPendingInput: () => true, pendingDocumentIds: () => [id] };
  return { data, id, editor };
}
test('cross-tab actor switch never replaces an unsaved or composing editor', () => {
  const { data, editor } = fixture(), next = programClone(data);
  next.activeActorId = next.actors.find(actor => actor.id !== data.activeActorId)!.id;
  assert.equal(programInputBlocksSnapshot(data, next, [editor]), true);
  assert.equal(programInputBlocksSnapshot(data, next, [{ ...editor, hasPendingInput: () => false }]), false);
});
test('cross-tab deletion or archive of any hidden pending document blocks presentation', () => {
  const { data, id, editor } = fixture();
  for (const archive of [false, true]) {
    const next = programClone(data), space = next.spaces[data.activeActorId];
    if (archive) space.archivedDocumentIds.push(id); else space.text.documents = [];
    assert.equal(programInputBlocksSnapshot(data, next, [null, editor]), true);
  }
});
test('unrelated saved edits may be displayed while the same draft stays mounted', () => {
  const { data, editor } = fixture(), next = programClone(data);
  next.spaces[data.activeActorId].text = M.addDocument(next.spaces[data.activeActorId].text, { title: '다른 문서' });
  const before = JSON.stringify([data, next]);
  assert.equal(programInputBlocksSnapshot(data, next, [editor]), false);
  assert.equal(JSON.stringify([data, next]), before);
});

test('non-document draft ownership guards external replacements but accepts its own save echo', () => {
  const { data } = fixture(), next = programClone(data);
  const editor: ProgramEditorFlush = { flushAll: async () => false, lockInput: () => () => undefined,
    hasPendingInput: () => true, blocksExternalSnapshot: () => true };
  assert.equal(programInputBlocksSnapshot(data, next, [editor], false), false);
  assert.equal(programInputBlocksSnapshot(data, next, [editor], true), true);
  assert.equal(programInputBlocksSnapshot(data, next, [{ ...editor, hasPendingInput: () => false }], true), false);
});
