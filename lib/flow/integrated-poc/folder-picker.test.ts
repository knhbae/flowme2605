import assert from 'node:assert/strict';
import test from 'node:test';
import { createFolderPickerDismissal, createFolderPickerHold, createFolderPickerIndex, folderPickerKey, folderPickerMatchKey, folderPickerNavigation, folderPickerSignature,
  folderPickerTarget, planFolderPickerLink, readFolderPickerChoices, readFolderPickerCommand, readFolderPickerCompositionLine, readFolderPickerLine } from './folder-picker';
import { readProgramFolderSlot } from './folder-link-slot';
import { createProgramTextDraft } from './program-text-draft';
import { createProgramDocumentInput } from './program-document-input';
import { mergeProgramTextWorkspace } from './text-merge';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
const cycleFactory = require('./ime-enter-cycle.cjs');

function fixture(linked = true) {
  let state: TextWorkspaceState = { version: 11, folders: [{ id: 'root', title: '합성', parentId: null }],
    documents: ['a', 'b'].map(id => ({ id, title: id, folder: '합성', folderId: 'root', lines: [] })),
    flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] };
  state = M.editTextResult(state, 'b', '- /OLD\n  - [ ] 다른 문서\n- /회사\n  - /회의', { folderText: true }).state;
  state = M.editTextResult(state, 'a', `첫 줄\n${linked ? '- /OLD' : '- 메모'}\n  - [ ] 보존할 일\n끝`, { folderText: true }).state;
  assert.equal(M.validate(state), true); return state;
}
const key = (key: string, extra = {}) => ({ key, cancelable: true, ...extra });

test('syllables, compatibility/modern jamo, compound vowels and final consonants share prefix components', () => {
  assert.equal(folderPickerMatchKey('과'), folderPickerMatchKey('ㄱㅗㅏ'));
  assert.equal(folderPickerMatchKey('괜'), folderPickerMatchKey('괜'));
  assert.equal(folderPickerMatchKey('값'), folderPickerMatchKey('ㄱㅏㅂㅅ'));
  assert.equal(folderPickerMatchKey('ㆍᆢ'), '');
  const index = createFolderPickerIndex([{ id: 'x', title: '회의록', parentId: null }]);
  assert.deepEqual(readFolderPickerChoices(index, 'ㅎㅗㅣ', null).candidates.map(row => row.id), ['x']);
});
test('slash line requires an end caret, no second slash, no selection or fenced code', () => {
  assert.equal(readFolderPickerLine('  - /회의', 7)?.query, '회의');
  for (const [raw, at, end] of [['- /회의', 3, 3], ['- /a/b', 6, 6], ['- /회의', 5, 4], ['```\n- /회의', 9, 9]] as const) {
    assert.equal(readFolderPickerLine(raw, at, end), null);
  }
  assert.equal(readFolderPickerLine('- /회의?!', 7)?.query, '회의');
});
test('plain Enter default never selects a same title under another parent; explicit ↓ Enter does', () => {
  const index = createFolderPickerIndex([{ id: 'p', title: '회사', parentId: null }, { id: 'x', title: '회의', parentId: 'p' }]);
  const choices = readFolderPickerChoices(index, '회의', null);
  assert.equal(choices.enter?.kind, 'create'); assert.equal(choices.candidates[0].id, 'x');
  assert.equal(folderPickerKey(key('Enter'), -1, 1, false).kind, 'pass');
  assert.deepEqual(folderPickerKey(key('ArrowDown'), -1, 1, false), { kind: 'highlight', index: 0 });
  assert.deepEqual(folderPickerKey(key('Enter'), 0, 1, false), { kind: 'select', index: 0 });
  assert.equal(folderPickerKey(key('Tab'), 0, 1, false).kind, 'reset');
});
test('same-parent exact duplicates require ID selection; empty results remain stable only while composing', () => {
  const index = createFolderPickerIndex([{ id: '1', title: '회의', parentId: null }, { id: '2', title: '회의', parentId: null }]);
  assert.equal(readFolderPickerChoices(index, '회의', null).enter?.kind, 'ambiguous');
  assert.deepEqual(readFolderPickerChoices(index, '없는', null, { composing: true, previous: index }).candidates, index);
  assert.equal(readFolderPickerChoices(index, '없는', null, { previous: index }).candidates.length, 0);
  assert.equal(readFolderPickerChoices(index, '', null, { recentIds: ['2'] }).candidates[0].id, '2');
});
test('a remote folder-list change retains the highlighted ID, never a reused list position', () => {
  const folders = createFolderPickerIndex([{ id: 'a', title: '회의', parentId: null }, { id: 'b', title: '회계', parentId: null }]);
  assert.equal(folderPickerNavigation(folders, 0, [folders[1], folders[0]], true), 1);
  assert.equal(folderPickerNavigation(folders, 0, [folders[1]], true), -1);
  assert.equal(folderPickerNavigation(folders, 0, folders, false), -1);
});
test('composition, 229, consumed Enter and modified keys do not intercept navigation/Enter/Tab/Escape', () => {
  for (const name of ['ArrowDown', 'Enter', 'Tab', 'Escape']) {
    assert.equal(folderPickerKey(key(name), 0, 1, true).kind, 'pass');
    assert.equal(folderPickerKey(key(name, { keyCode: 229 }), 0, 1, false).kind, 'pass');
  }
  assert.equal(folderPickerKey(key('Enter'), 0, 1, false, true).kind, 'pass');
  assert.equal(folderPickerKey(key('Enter', { defaultPrevented: true }), 0, 1, false).kind, 'pass');
  assert.equal(folderPickerKey(key('Enter', { shiftKey: true }), 0, 1, false).kind, 'pass');
  assert.equal(folderPickerKey(key('ArrowDown', { shiftKey: true }), 0, 1, false).kind, 'pass');
  assert.equal(folderPickerKey(key('Tab', { shiftKey: true }), 0, 1, false).kind, 'pass');
});
test('actual IME receipt consumes queued settled Enter before picker selection, but not a new Enter', () => {
  const frame = { raw: '- /회', start: 4, end: 4, direction: 'none', epoch: 1, focused: true, editable: true };
  const cycle = cycleFactory.create(() => frame);
  cycle.start(); cycle.input({ inputType: 'insertCompositionText', data: '회' });
  const enter = { ...key('Enter'), code: 'Enter', keyCode: 229, isComposing: true, timeStamp: 100 };
  cycle.keydown(enter); cycle.end({ data: '회', timeStamp: 300 });
  const consumed = cycle.keydown({ ...enter, keyCode: 13, isComposing: false, timeStamp: 200 });
  assert.equal(consumed, true); assert.equal(folderPickerKey(key('Enter'), 0, 1, false, consumed).kind, 'pass');
  assert.equal(cycle.keydown({ ...enter, keyCode: 13, isComposing: false, timeStamp: 400 }), false);
});
test('dismiss signatures distinguish line identity and text, not focus changes', () => {
  assert.equal(folderPickerSignature('a', 'l', '- /회'), folderPickerSignature('a', 'l', '- /회'));
  assert.notEqual(folderPickerSignature('a', 'l', '- /회'), folderPickerSignature('a', 'l', '- /회의'));
  assert.notEqual(folderPickerSignature('a', 'l', '- /회'), folderPickerSignature('b', 'l', '- /회'));
  const dismissal = createFolderPickerDismissal(); dismissal.hide('a', 'l', '- /회');
  assert.equal(dismissal.hidden('a', 'l', '- /회'), true);
  assert.equal(dismissal.hidden('a', 'other', '- /회'), false);
  assert.equal(dismissal.hidden('a', 'l', '- /회'), true, 'focus/other line does not reopen');
  assert.equal(dismissal.hidden('a', 'l', '- /회의'), false);
  assert.equal(dismissal.hidden('a', 'l', '- /회'), false, 'a text change releases dismissal even after undo');
});
test('held chip runs once after native text settles; duplicate presses or changed owner cannot run', () => {
  const hold = createFolderPickerHold(), surface = {}, controller = {}, choice = { kind: 'create', title: '회' } as const;
  const intent = { controller, documentId: 'a', lineId: 'l', target: folderPickerTarget(surface, '- /회', 4, 3), choice };
  const now = { controller, documentId: 'a', lineId: 'l', composing: false, saving: false, active: true,
    surface, value: '- /회의', caret: 5, selectionEnd: 5, editable: true, connected: true, focusHere: true };
  assert.equal(hold.press(intent), true); assert.equal(hold.press(intent), false);
  assert.equal(hold.release({ ...now, composing: true }), null);
  assert.equal(hold.release(now), intent); assert.equal(hold.release(now), null);
  hold.press(intent); assert.equal(hold.release({ ...now, controller: {} }), null); assert.equal(hold.pending(), null);
  hold.press(intent); assert.equal(hold.input('insertCompositionText', true), false);
  assert.equal(hold.input('insertText', false, true), false, 'native final composition input keeps the intent');
  assert.equal(hold.input('insertText', false), true, 'new ordinary input cancels a save-held choice');
  assert.equal(hold.release(now), null);
});
test('native composition keeps a valid slash-line picker while its model RAW is intentionally unpublished', () => {
  const controller = {}, surface = {}, raw = '앞\n- /회\n뒤', caret = raw.indexOf('\n뒤');
  const owner = { controller, surface, documentId: 'a', lineId: 'line', raw, caret };
  const now = { ...owner, committedRaw: raw, raw: raw.replace('/회', '/회의'), caret: caret + 1, end: caret + 1,
    composing: true, active: true, focused: true, editable: true, connected: true };
  const line = readFolderPickerCompositionLine(owner, now);
  assert.equal(line?.query, '회의'); assert.notEqual(now.raw, now.committedRaw);
  const index = createFolderPickerIndex([{ id: 'meeting', title: '회의', parentId: null }]);
  assert.equal(readFolderPickerChoices(index, line!.query, null, { composing: true, previous: index }).candidates[0].id, 'meeting');
  const unmatched = readFolderPickerCompositionLine(owner, { ...now, raw: raw.replace('/회', '/없는'), caret: caret + 1, end: caret + 1 });
  assert(unmatched); assert.deepEqual(readFolderPickerChoices(index, unmatched.query, null, { composing: true, previous: index }).candidates, index);
});
test('composition retention refuses a changed editor, document, line, committed baseline or caret owner', () => {
  const controller = {}, surface = {}, raw = '앞\n- /회\n뒤', caret = raw.indexOf('\n뒤');
  const owner = { controller, surface, documentId: 'a', lineId: 'line', raw, caret };
  const now = { ...owner, committedRaw: raw, raw: raw.replace('/회', '/회의'), caret: caret + 1, end: caret + 1,
    composing: true, active: true, focused: true, editable: true, connected: true };
  for (const change of [{ controller: {} }, { surface: {} }, { documentId: 'b' }, { lineId: 'other' }, { committedRaw: raw + 'remote' },
    { composing: false }, { active: false }, { focused: false }, { editable: false }, { connected: false }, { caret }, { end: caret },
    { raw: now.raw.replace('앞', '다른 줄') }, { raw: now.raw.replace('뒤', '다른 줄') },
    { raw: '앞\n  - /회의\n뒤', caret: caret + 3, end: caret + 3 }]) {
    assert.equal(readFolderPickerCompositionLine(owner, { ...now, ...change }), null, JSON.stringify(change));
  }
});
test('composition events defer an existing-folder choice until the settled model command, then save once', async () => {
  const original = fixture(false), controller = createProgramTextDraft(original, 'a', async () => { saves++; return true; }, () => {});
  const raw = M.raw(M.getDocument(original, 'a')).replace('- 메모', '- /회');
  assert.equal(controller.updateRaw(raw, '', { folderHold: [1], inputType: 'insertText' }), true);
  const before = controller.getState().working, doc = M.getDocument(before, 'a')!, lineId = doc.lines[1].id;
  const caret = raw.indexOf('\n  - [ ]'), surface = { raw, caret }, owner = { controller, surface, documentId: 'a', lineId, raw, caret };
  const target = before.folders.find(folder => folder.title === '회의')!, hold = createFolderPickerHold(), events = new EventTarget();
  let composing = true, saves = 0, applied = 0;
  const frame = () => ({ controller, surface, documentId: 'a', lineId, committedRaw: controller.getState().raw,
    raw: surface.raw, caret: surface.caret, end: surface.caret, composing, active: true, focused: true, editable: true, connected: true });
  const now = () => ({ controller, surface, documentId: 'a', lineId, value: surface.raw, caret: surface.caret, selectionEnd: surface.caret,
    composing, saving: false, active: !!readFolderPickerLine(surface.raw, surface.caret), editable: true, connected: true, focusHere: true });
  events.addEventListener('input', () => { assert(readFolderPickerCompositionLine(owner, frame())); });
  events.addEventListener('compositionend', () => {
    composing = false;
    assert.equal(controller.updateRaw(surface.raw, '', { folderHold: [1], inputType: 'insertCompositionText' }), true);
    const intent = hold.release(now());
    assert(intent); assert(readFolderPickerCommand(controller.getState().working, 'a', lineId, surface.raw, surface.caret, surface.caret));
    const linked = planFolderPickerLink(controller.getState().working, 'a', lineId, target.id);
    assert.equal(linked.problem, null); assert.equal(controller.apply(linked.state, '선택', undefined, { lineId, scopeId: target.id }), true); applied++;
  });
  surface.raw = raw.replace('/회', '/회의'); surface.caret++;
  events.dispatchEvent(new Event('input'));
  assert.equal(controller.getState().raw, raw, 'native interim value has not been published');
  const intent = { controller, documentId: 'a', lineId, choice: { kind: 'folder', folder: createFolderPickerIndex(before.folders).find(folder => folder.id === target.id)! } as const,
    target: folderPickerTarget(surface, surface.raw, surface.caret, caret) };
  assert.equal(hold.press(intent), true); assert.equal(hold.press(intent), false); assert.equal(hold.release(now()), null);
  events.dispatchEvent(new Event('compositionend'));
  assert.equal(hold.release(now()), null); assert.equal(applied, 1);
  assert.equal(await controller.save(), true); assert.equal(saves, 1);
  const after = controller.getState().working;
  assert.equal(after.bindings.filter(row => row.docId === 'a' && row.lineId === lineId).length, 1);
  assert.deepEqual(M.getDocument(after, 'a')!.lines.map(line => line.id), doc.lines.map(line => line.id));
  assert.deepEqual(M.getDocument(after, 'b'), M.getDocument(before, 'b')); assert.deepEqual(after.progressRecords, before.progressRecords);
  assert.equal(controller.getState().raw, surface.raw);
});
test('explicit replacement preserves the native line ID, task IDs/progress and all other documents', () => {
  const state = fixture(), doc = M.getDocument(state, 'a')!, lineId = doc.lines[1].id;
  const target = state.folders.find(row => row.title === '회의')!;
  const result = planFolderPickerLink(state, 'a', lineId, target.id);
  assert.equal(result.problem, null); assert.equal(result.moved, true); assert.equal(M.validate(result.state), true);
  assert.deepEqual(M.getDocument(result.state, 'a')!.lines.map(line => line.id), doc.lines.map(line => line.id));
  assert.equal(M.getDocument(result.state, 'a')!.lines[1].text, '- /회의');
  assert.equal(result.state.taskScopes[doc.lines[2].id], target.id);
  assert.deepEqual(M.getDocument(result.state, 'b'), M.getDocument(state, 'b'));
  assert.deepEqual(result.state.folders, state.folders); assert.deepEqual(result.state.progressRecords, state.progressRecords);
  assert.equal(readProgramFolderSlot(state, 'a', lineId)?.inPlace, false, 'old menu default unchanged');
  assert.equal(readProgramFolderSlot(state, 'a', lineId, { replaceSlot: true })?.index, 1);
});
test('moving a folder occurrence preserves progress and a referenced task owned by another document', () => {
  for (const linked of [true, false]) {
  let state = fixture(linked);
  const ownId = M.getDocument(state, 'a')!.lines[2].id, otherId = M.getDocument(state, 'b')!.lines[1].id;
  state = M.recordProgress(state, ownId, '2026-10-31', 30);
  const inserted = M.editTextResult(state, 'a', `첫 줄\n${linked ? '- /OLD' : '- 메모'}\n  - [ ] 보존할 일\n  - \n끝`, { folderText: true });
  assert.equal(inserted.reason, null); state = M.linkTask(inserted.state, 'a', 3, otherId);
  if (!linked) {
    const draft = createProgramTextDraft(state, 'a', async () => true, () => {});
    assert.equal(draft.updateRaw(M.raw(M.getDocument(state, 'a')).replace('- 메모', '- /회'), '', { inputType: 'insertText', folderHold: [1] }), true);
    state = draft.getState().working;
  }
  assert.equal(M.validate(state), true);
  const before = state, doc = M.getDocument(before, 'a')!, reference = before.bindings.find(row => row.docId === 'a' && row.lineId === doc.lines[3].id);
  assert(reference?.kind === 'task'); assert.equal(reference.taskId, otherId);
  const target = before.folders.find(folder => folder.title === '회의')!;
  const next = planFolderPickerLink(before, 'a', doc.lines[1].id, target.id);
  assert.equal(next.problem, null); assert.equal(next.state.taskScopes[ownId], target.id);
  assert.equal(next.state.taskScopes[otherId], before.taskScopes[otherId]);
  assert.deepEqual(next.state.progressRecords, before.progressRecords);
  assert.deepEqual(next.state.bindings.find(row => row.lineId === doc.lines[3].id), reference);
  assert.deepEqual(M.getDocument(next.state, 'b'), M.getDocument(before, 'b'));
  }
});
test('an unbound model head over an existing linked subfolder never crosses its ownership boundary', () => {
  const state = fixture(), nested = M.editTextResult(state, 'a', '첫 줄\n- /OLD\n  - /하위\n    - [ ] 하위 일\n끝', { folderText: true });
  assert.equal(nested.reason, null);
  const head = M.getDocument(nested.state, 'a')!.lines[1].id;
  const unbound = { ...nested.state, bindings: nested.state.bindings.filter(row => row.lineId !== head),
    documents: nested.state.documents.map(doc => doc.id === 'a' ? { ...doc, lines: doc.lines.map(line => line.id === head ? { ...line, text: '- /회' } : line) } : doc) };
  assert.equal(M.validate(unbound), true, 'valid model boundary; no claim about a shortcut UI producer');
  const target = unbound.folders.find(row => row.title === '회의')!;
  const next = planFolderPickerLink(unbound, 'a', head, target.id);
  assert.equal(next.state, unbound); assert(next.problem);
});
test('explicit new-folder declaration keeps the line end without LF and takes its existing children along', () => {
  const state = fixture(false), draft = createProgramTextDraft(state, 'a', async () => true, () => {});
  const raw = M.raw(M.getDocument(state, 'a')).replace('- 메모', '- /새 폴더');
  assert.equal(draft.updateRaw(raw, '', { inputType: 'insertText', folderHold: [1] }), true);
  assert.equal(draft.declareFolderLine(1, false, true), true);
  const next = draft.getState().working, doc = M.getDocument(next, 'a')!, binding = next.bindings.find(row => row.lineId === doc.lines[1].id);
  assert(binding?.kind === 'scope'); assert.equal(next.taskScopes[doc.lines[2].id], binding.scopeId);
  assert.equal(draft.getState().raw, raw); assert.deepEqual(doc.lines.map(line => line.id), M.getDocument(state, 'a')!.lines.map(line => line.id));
});
test('a reopened unbound slash line declares once without a typing ref, LF or a second save', async () => {
  const state = fixture(false), typing = createProgramTextDraft(state, 'a', async () => true, () => {});
  const raw = M.raw(M.getDocument(state, 'a')).replace('- 메모', '- /재열기');
  assert.equal(typing.updateRaw(raw, '', { inputType: 'insertText', folderHold: [1] }), true);
  const storedPlain = typing.getState().working, doc = M.getDocument(storedPlain, 'a')!, lineId = doc.lines[1].id;
  const caret = doc.lines[0].text.length + 1 + doc.lines[1].text.length;
  let saves = 0;
  // A fresh mount has no typing event or heldFolderLineRef.
  const reopened = createProgramTextDraft(storedPlain, 'a', async () => { saves++; return true; }, () => {});
  assert.equal(reopened.getState().dirty, false);
  const command = readFolderPickerCommand(reopened.getState().working, 'a', lineId, raw, caret, caret);
  assert(command); assert.equal(command.index, 1);
  assert.equal(readFolderPickerCommand(storedPlain, 'a', lineId, raw, caret - 1, caret - 1), null);
  assert.equal(readFolderPickerCommand(storedPlain, 'a', doc.lines[2].id, raw, caret, caret), null);
  assert.equal(readFolderPickerCommand(storedPlain, 'a', lineId, raw + '新', caret, caret), null);
  assert.equal(reopened.declareFolderLine(command.index, false, true), true);
  assert.equal(reopened.getState().raw, raw); assert.equal(reopened.getState().raw.split('\n').length, raw.split('\n').length);
  assert.equal(reopened.getState().working.bindings.filter(row => row.docId === 'a' && row.lineId === lineId && row.kind === 'scope').length, 1);
  assert.equal(await reopened.save(), true); assert.equal(saves, 1);
  await reopened.save(); assert.equal(saves, 1);
});
test('ID selection chooses a duplicate exactly; same-folder does not move ownership', () => {
  const before = fixture(), doc = M.getDocument(before, 'a')!, old = before.bindings.find(row => row.docId === 'a' && row.kind === 'scope')!;
  assert.equal(old.kind, 'scope'); if (old.kind !== 'scope') return;
  const same = planFolderPickerLink(before, 'a', doc.lines[1].id, old.scopeId);
  assert.equal(same.problem, null); assert.equal(same.moved, false); assert.equal(same.state, before); assert.deepEqual(same.state.taskScopes, before.taskScopes);
  const target = before.folders.find(row => row.title === '회의')!;
  const state = { ...before, folders: [...before.folders, { ...target, id: 'duplicate' }] };
  const selected = planFolderPickerLink(state, 'a', doc.lines[1].id, 'duplicate');
  assert.equal(selected.problem, null); assert.equal(selected.state.bindings.some(row => row.kind === 'scope' && row.lineId === doc.lines[1].id && row.scopeId === 'duplicate'), true);
});
test('a name still held in the actual draft selects an exact ID without renaming the old folder', () => {
  const before = fixture(), controller = createProgramTextDraft(before, 'a', async () => true, () => {});
  assert.equal(controller.updateRaw('첫 줄\n- /회\n  - [ ] 보존할 일\n끝', '', { inputType: 'insertText', folderHold: [1] }), true);
  const state = controller.getState().working, lineId = M.getDocument(state, 'a')!.lines[1].id;
  const target = state.folders.find(folder => folder.title === '회의')!;
  const planned = planFolderPickerLink(state, 'a', lineId, target.id);
  assert.equal(planned.problem, null); assert.equal(planned.moved, true);
  assert.equal(controller.apply(planned.state, '선택', undefined, { lineId, scopeId: target.id }), true);
  assert.equal(M.getDocument(controller.getState().working, 'a')!.lines[1].text, '- /회의');
  assert.deepEqual(controller.getState().working.folders, before.folders);
  assert.deepEqual(M.getDocument(controller.getState().working, 'b'), M.getDocument(before, 'b'));
  assert.equal(controller.undoFolderMove(), true);
  assert.equal(M.getDocument(controller.getState().working, 'a')!.lines[1].text, '- /OLD');
});
test('missing/ancestor targets and linked subfolders refuse without changing the model', () => {
  const before = fixture(), doc = M.getDocument(before, 'a')!, target = before.folders.find(row => row.title === '회의')!;
  assert.equal(planFolderPickerLink(before, 'a', doc.lines[1].id, 'gone').state, before);
  const nested = M.editTextResult(before, 'a', '첫 줄\n- /OLD\n  - /하위\n    - [ ] 안건\n끝', { folderText: true }).state;
  assert.equal(planFolderPickerLink(nested, 'a', M.getDocument(nested, 'a')!.lines[1].id, target.id).state, nested);
  const nestedLine = M.getDocument(nested, 'a')!.lines[2];
  const oldId = nested.folders.find(row => row.title === 'OLD')!.id;
  assert.equal(planFolderPickerLink(nested, 'a', nestedLine.id, oldId).state, nested);
});
test('validated explicit picker move preserves W15 one-step undo and rejects a forged next workspace', () => {
  const before = fixture(), lineId = M.getDocument(before, 'a')!.lines[1].id, target = before.folders.find(row => row.title === '회의')!;
  const result = planFolderPickerLink(before, 'a', lineId, target.id);
  const draft = createProgramTextDraft(before, 'a', async () => true, () => {});
  assert.equal(draft.apply(result.state, '선택', undefined, { lineId, scopeId: target.id }), true);
  assert.equal(draft.canUndoFolderMove(), true); assert.equal(draft.undoFolderMove(), true);
  assert.deepEqual(draft.getState().working, before);
  const forged = { ...result.state, progressRecords: [] , documents: result.state.documents.map(doc => doc.id === 'b' ? { ...doc, title: '변조' } : doc) };
  const clean = createProgramTextDraft(before, 'a', async () => true, () => {});
  assert.equal(clean.apply(forged, '선택', undefined, { lineId, scopeId: target.id }), false);
});
test('an unchanged owned folder move keeps its one-step undo after a lost reply is confirmed by an exact cloned receipt', async () => {
  const source = fixture(), input = createProgramDocumentInput(source, 'a');
  let receipt: { before: TextWorkspaceState; next: TextWorkspaceState } | null = null;
  const clone = (value: TextWorkspaceState): TextWorkspaceState => JSON.parse(JSON.stringify(value));
  const draft = createProgramTextDraft(input.initial, 'a', async (next, _label, options) => {
    receipt = { before: clone(options!.expectedWorkspace!), next: clone(next) }; return false;
  }, () => {}, () => true, input);
  const before = draft.getState().working, doc = M.getDocument(before, 'a')!, target = before.folders.find(folder => folder.title === '회의')!;
  const planned = planFolderPickerLink(before, 'a', doc.lines[1].id, target.id);
  assert.equal(draft.apply(planned.state, '선택', undefined, { lineId: doc.lines[1].id, scopeId: target.id }), true);
  assert.equal(await draft.save(), false); assert.equal(draft.canUndoFolderMove(), true);
  const confirmed = receipt! as { before: TextWorkspaceState; next: TextWorkspaceState };
  assert.equal(draft.acceptConfirmedSave(confirmed.before, confirmed.next), true);
  assert.equal(draft.canUndoFolderMove(), true); assert.equal(draft.undoFolderMove(), true);
  assert.deepEqual(draft.getState().working, before);
});
test('later input or another document change never gains folder undo authority from a late receipt', async () => {
  for (const later of ['input', 'remote'] as const) {
    const source = fixture(), input = createProgramDocumentInput(source, 'a');
    let receipt: { before: TextWorkspaceState; next: TextWorkspaceState } | null = null;
    const clone = (value: TextWorkspaceState): TextWorkspaceState => JSON.parse(JSON.stringify(value));
    const draft = createProgramTextDraft(input.initial, 'a', async (next, _label, options) => {
      receipt = { before: clone(options!.expectedWorkspace!), next: clone(next) }; return false;
    }, () => {}, () => true, input);
    const before = draft.getState().working, doc = M.getDocument(before, 'a')!, target = before.folders.find(folder => folder.title === '회의')!;
    const planned = planFolderPickerLink(before, 'a', doc.lines[1].id, target.id);
    assert.equal(draft.apply(planned.state, '선택', undefined, { lineId: doc.lines[1].id, scopeId: target.id }), true);
    assert.equal(await draft.save(), false);
    const confirmed = receipt! as { before: TextWorkspaceState; next: TextWorkspaceState };
    if (later === 'input') {
      assert.equal(draft.updateRaw(draft.getState().raw.replace('끝', '다음 입력'), '', { inputType: 'insertText' }), true);
      assert.equal(draft.acceptConfirmedSave(confirmed.before, confirmed.next), true);
      assert(draft.getState().raw.endsWith('다음 입력'));
    } else {
      const remote = M.editTextResult(confirmed.before, 'b', M.raw(M.getDocument(confirmed.before, 'b')) + '\n원격 내용', { folderText: true }).state;
      const merged = mergeProgramTextWorkspace(confirmed.before, confirmed.next, remote);
      assert(merged); assert.equal(draft.acceptConfirmedSave(remote, merged), true);
      assert.deepEqual(M.getDocument(draft.getState().working, 'b'), M.getDocument(remote, 'b'));
    }
    const latest = draft.getState().working;
    assert.equal(draft.canUndoFolderMove(), false); assert.equal(draft.undoFolderMove(), false);
    assert.equal(draft.getState().working, latest);
  }
});
