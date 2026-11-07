import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROGRAM_SCHEMA } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { emptyAlphaReferences } from './alpha-social/projection';
import { readProgramFolderRegions } from './folder-document-regions';
import { createProgramRegionDraft } from '../../../components/flow/integrated-poc/ProgramFolderRegionEditor';

// Region fix 2 (11/8, QA NO_GO on a 4x slower CPU): a region write refused because the single writer was busy (a save,
// or a background refresh) went to the 복구함; keys typed while the document saved were dropped without a word (the
// regions turned read-only); input typed during a write waited for another key. Now: the commit is tried again while
// the writer is busy, the regions take keys during a save and their write waits for it, input typed meanwhile is
// written when the last write ends, and a write refused only because its view is behind is read again once.
const owner = '99999999-9999-4999-8999-999999999992';
function setup() {
  const raw = ['[2026-11-07]', '- /회사 일', '  - [ ] 오늘 회의', '- /공부 노트', '  - [ ] 단어', '', '[2026-11-06]', '- /회사 일', '  - [ ] 어제 보고', ''].join('\n');
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 }, space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const initial = materializeAccount(account, emptyAlphaReferences(owner)).data;
  const made = createProgramDocument(initial, { actorId: owner, requestId: 'fix2', expectedSpace: initial.spaces[owner], title: '글', raw: '' });
  assert.ok(made.ok);
  const typed = M.editTextResult(made.data.spaces[owner].text, made.result, raw, { folderText: true });
  assert.equal(typed.reason, null);
  return { state: typed.state, docId: made.result, folderId: typed.state.folders.find(entry => entry.title === '회사 일')!.id };
}
const tick = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

function harness(start: TextWorkspaceState, docId: string, folderId: string) {
  let workspace = start, saving = false, release: (() => void) | null = null;
  const accepted: string[] = [], persisted: number[] = [];
  const draft = createProgramRegionDraft({
    workspace: () => workspace,
    accept: next => { workspace = next; accepted.push(M.raw(M.getDocument(next, docId))); return true; },
    persist: async () => { persisted.push(Date.now()); saving = true; await new Promise<void>(resolve => { release = resolve; }); saving = false; return true; },
    readonly: () => false, notify: () => {},
    busy: () => saving, idle: async () => { while (saving) await tick(5); },
    refresh: view => readProgramFolderRegions(workspace, view.documentId, view.folderId),
  });
  return { draft, view: () => readProgramFolderRegions(workspace, docId, folderId)!, accepted, persisted, finish: () => { release?.(); release = null; }, set: (next: TextWorkspaceState) => { workspace = next; } };
}

test('input typed while the last write is still going is written when it ends (not left waiting for another key)', async () => {
  const { state, docId, folderId } = setup(), h = harness(state, docId, folderId);
  const first = h.view(), key = first.regions[0].key;
  assert.ok(h.draft.update(first, key, `${first.regions[0].raw} abc`));
  const one = h.draft.flush();
  await tick();
  assert.equal(h.persisted.length, 1);
  // Typed during that write (the region takes keys during a save now).
  assert.ok(h.draft.update(h.view(), key, `${first.regions[0].raw} abcxyz`));
  const two = h.draft.flush();
  h.finish(); await one; await tick(30); h.finish(); await two; await tick(30);
  assert.equal(h.accepted.length, 2);
  assert.ok(h.accepted[1].includes('  - [ ] 오늘 회의 abcxyz'));
  assert.equal(h.draft.getState().pending, null);
});

test('a write refused only because its view is behind (a save landed elsewhere) is read again and written once', async () => {
  const { state, docId, folderId } = setup(), h = harness(state, docId, folderId);
  const view = h.view(), key = view.regions[0].key;
  assert.ok(h.draft.update(view, key, `${view.regions[0].raw} 준비`));
  // Another line of the document changed meanwhile (not this region): the captured view is now behind.
  const elsewhere = M.editTextResult(state, docId, M.raw(M.getDocument(state, docId)).replace('  - [ ] 단어', '  - [ ] 단어 복습'));
  assert.equal(elsewhere.reason, null);
  h.set(elsewhere.state);
  const done = h.draft.flush(); await tick(); h.finish(); assert.equal(await done, true);
  assert.equal(h.accepted.length, 1);
  assert.ok(h.accepted[0].includes('  - [ ] 오늘 회의 준비') && h.accepted[0].includes('  - [ ] 단어 복습'));
});

test('…but not when that very region was changed meanwhile: then it is refused as before (nothing written over it)', async () => {
  const { state, docId, folderId } = setup(), h = harness(state, docId, folderId);
  const view = h.view(), key = view.regions[0].key;
  assert.ok(h.draft.update(view, key, `${view.regions[0].raw} 준비`));
  const there = M.editTextResult(state, docId, M.raw(M.getDocument(state, docId)).replace('  - [ ] 오늘 회의', '  - [ ] 오늘 회의 (다른 기기)'));
  h.set(there.state);
  assert.equal(await h.draft.flush(), false);
  assert.equal(h.accepted.length, 0);
  assert.ok(h.draft.getState().error);
});

test('the wiring: the regions are not read-only during a save; the commit is tried again while the writer is busy', () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
  const editor = read('components/flow/integrated-poc/ProgramTextEditor.tsx'), space = read('components/flow/integrated-poc/ProgramSpace.tsx');
  assert.match(editor, /readOnly=\{!!props\.readOnly\} locked=\{inputLocked\} saving=\{draft\.saving\}/);
  assert.match(space, /for \(let tries = 0; !result\.ok && result\.reason === 'busy' && tries < 40; tries\+\+\) \{\n\s+await new Promise\(resolve => setTimeout\(resolve, 150\)\);\n\s+result = await attempt\(\);/);
});
