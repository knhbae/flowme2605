import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { detached } from './alpha-persistence/json';
import { captureProgramFolderOperation as capture, undoProgramFolderOperation as undo, combineProgramFolderScopes, programFolderUses, planProgramFreshFolderIndent, type FolderIndentPlan } from './folder-operation';

const nativePlans = createRequire(import.meta.url)('./text-input-plan.cjs') as { planIndent: (...args: unknown[]) => FolderIndentPlan | null };
function document(state: TextWorkspaceState, title = '글') { const next = M.addDocument(state, { title }); return { next, id: next.documents.at(-1)!.id }; }
function initial(raw: string, hold?: number[]) {
  const { next, id } = document(createEmptyTextWorkspace());
  const result = M.editTextResult(next, id, raw, { folderText: true, ...(hold ? { folderHold: hold } : {}) });
  assert.equal(result.reason, null); return { state: result.state, id };
}
const bound = (state: TextWorkspaceState, docId: string, index = 0) => {
  const lineId = M.getDocument(state, docId)!.lines[index].id;
  const binding = state.bindings.find(row => row.kind === 'scope' && row.docId === docId && row.lineId === lineId);
  assert(binding?.kind === 'scope'); return { lineId, folderId: binding.scopeId };
};
function back(current: TextWorkspaceState, before: TextWorkspaceState, after: TextWorkspaceState) {
  const operation = capture(before, after); assert(operation);
  const result = undo(current, operation); assert(result.ok, result.ok ? '' : result.reason);
  assert(M.validate(result.next)); return result.next;
}

test('W18 creation undo is forward unlink + slash removal, deletes only the unused newly created folder', () => {
  const before = initial('- /새 폴더\n  - [ ] 할 일', [0]);
  const after = M.editTextResult(before.state, before.id, M.raw(M.getDocument(before.state, before.id)), { folderText: true, folderDeclare: [0] }).state;
  const made = bound(after, before.id), result = back(after, before.state, after);
  assert.equal(M.raw(M.getDocument(result, before.id)), '- 새 폴더\n  - [ ] 할 일');
  assert(!result.folders.some(folder => folder.id === made.folderId));
  assert.deepEqual(result.progressRecords, before.state.progressRecords);
  assert.deepEqual(M.tasks(result).map(row => row.id), M.tasks(before.state).map(row => row.id));
  assert(!result.bindings.some(row => row.lineId === made.lineId));
  assert.equal(M.editTextResult(result, before.id, M.raw(M.getDocument(result, before.id)) + '\n메모', { folderText: true }).state.folders.length, result.folders.length, 'a later edit does not recreate it');
});

test('W18 undo keeps a new folder another document began using, and preserves that document and current input', () => {
  const before = initial('- /새 폴더\n끝', [0]);
  const after = M.editTextResult(before.state, before.id, M.raw(M.getDocument(before.state, before.id)), { folderText: true, folderDeclare: [0] }).state;
  const made = bound(after, before.id), other = document(after, '다른 글');
  let current = M.editText(other.next, other.id, '- /새 폴더', { folderText: true, folderDeclare: [0] });
  current = M.editText(current, before.id, M.raw(M.getDocument(current, before.id)).replace('끝', '그 사이 쓴 끝 메모'), { folderText: true });
  const result = back(current, before.state, after);
  assert(result.folders.some(folder => folder.id === made.folderId));
  assert.deepEqual(M.getDocument(result, other.id), M.getDocument(current, other.id));
  assert(M.raw(M.getDocument(result, before.id)).endsWith('그 사이 쓴 끝 메모'));
});

test('W18 a paste only undoes its folder declarations, retaining pasted tasks, text and IDs', () => {
  const before = initial('머리');
  const after = M.editText(before.state, before.id, '머리\n- /하나\n  - [ ] 첫 할 일\n- /둘\n  - [ ] 둘째 할 일', { folderText: true });
  const result = back(after, before.state, after);
  assert.equal(M.raw(M.getDocument(result, before.id)), '머리\n- 하나\n  - [ ] 첫 할 일\n- 둘\n  - [ ] 둘째 할 일');
  assert.deepEqual(M.getDocument(result, before.id)!.lines.map(line => line.id), M.getDocument(after, before.id)!.lines.map(line => line.id));
  assert.deepEqual(M.tasks(result).map(row => row.id), M.tasks(after).map(row => row.id));
});

test('W18 nested paste removes the unused created set leaf-to-parent, and never an existing parent', () => {
  for (const existing of [false, true]) {
    const before = initial(existing ? '- /상위' : '머리');
    const after = M.editText(before.state, before.id, (existing ? '' : '머리\n') + '- /상위\n  - /하위\n    - [ ] 붙여넣은 일', { folderText: true });
    const operation = capture(before.state, after)!; const result = undo(after, operation); assert(result.ok);
    assert.deepEqual(result.next.folders, before.state.folders);
    assert.equal(M.raw(M.getDocument(result.next, before.id)), (existing ? '- /상위' : '머리\n- 상위') + '\n  - 하위\n    - [ ] 붙여넣은 일');
    assert.deepEqual(M.tasks(result.next).map(task => task.id), M.tasks(after).map(task => task.id));
  }
});

test('W18 nested paste preserves a referenced created parent and the parent of a referenced child', () => {
  for (const reference of ['parent-storage', 'child-storage', 'foreign-child'] as const) {
    const before = initial('머리'), after = M.editText(before.state, before.id, '머리\n- /상위\n  - /하위', { folderText: true });
    const parent = after.folders.find(folder => folder.title === '상위')!, child = after.folders.find(folder => folder.title === '하위')!;
    const added = document(after, '다른 곳'), current = detached(added.next);
    if (reference === 'foreign-child') current.folders.push({ id: 'external-existing-folder', title: '외부 하위', parentId: parent.id });
    else { const storage = M.getDocument(current, added.id)!; storage.folderId = reference === 'parent-storage' ? parent.id : child.id; storage.folder = reference === 'parent-storage' ? parent.title : child.title; }
    assert(M.validate(current)); const savedOther = detached(M.getDocument(current, added.id));
    const result = undo(current, capture(before.state, after)!); assert(result.ok);
    assert(result.next.folders.some(folder => folder.id === parent.id));
    assert.equal(result.next.folders.some(folder => folder.id === child.id), reference === 'child-storage');
    assert.deepEqual(M.getDocument(result.next, added.id), savedOther);
    if (reference === 'foreign-child') assert(result.next.folders.some(folder => folder.id === 'external-existing-folder' && folder.parentId === parent.id));
  }
});

test('W18 unlink restores just its folder line, indentation, bindings and association with one selective inverse', () => {
  const before = initial('- /회의\n  - [30%] 할 일\n끝 메모'); const head = bound(before.state, before.id);
  const after = M.unlink(before.state, before.id, head.lineId);
  const result = back(after, before.state, after);
  assert.deepEqual(result, before.state);
});

test('W18 B4 dissolved group undo preserves a new unrelated tail', () => {
  const before = initial('- /회의\n  - [30%] 할 일'); const head = bound(before.state, before.id);
  const after = M.unlink(before.state, before.id, head.lineId);
  const current = M.editText(after, before.id, M.raw(M.getDocument(after, before.id)) + '\n별개 새 메모', { folderText: true });
  const result = back(current, before.state, after);
  assert.equal(M.raw(M.getDocument(result, before.id)), '- /회의\n  - [30%] 할 일\n별개 새 메모');
});

test('W18 linking an existing folder only unlinks this occurrence and keeps the original folder', () => {
  const base = initial('- /원본\n- /원본', [1]);
  const after = M.editTextResult(base.state, base.id, M.raw(M.getDocument(base.state, base.id)), { folderText: true, folderLink: [1] }).state;
  const operation = capture(base.state, after)!; assert.equal(operation.kind, 'link');
  const result = undo(after, operation); assert(result.ok);
  assert.equal(M.getDocument(result.next, base.id)!.lines[1].text, '- 원본'); assert.deepEqual(result.next.folders, base.state.folders);
});

test('W18 an old name newly taken elsewhere refuses the rename inverse atomically', () => {
  const before = initial('- /회의'); const folder = bound(before.state, before.id).folderId;
  const after = M.renameScope(before.state, folder, '주간회의'), added = document(after, '새 이름 사용');
  const current = M.editText(added.next, added.id, '- /회의', { folderText: true });
  const snapshot = detached(current); assert(!undo(current, capture(before.state, after)!).ok); assert.deepEqual(current, snapshot);
});

test('W18 rename every occurrence restores three documents and refuses a new related occurrence', () => {
  let { state, id } = initial('- /회의\n  - [ ] 할 일'); const folder = bound(state, id).folderId;
  for (let n = 0; n < 2; n++) { const added = document(state, `다른 글${n}`); state = M.editText(added.next, added.id, '- /회의', { folderText: true, folderDeclare: [0] }); }
  const after = M.renameScope(state, folder, '주간회의');
  assert.deepEqual(back(after, state, after), state);
  const extra = document(after, '새 참조'); const current = M.editText(extra.next, extra.id, '- /주간회의', { folderText: true, folderDeclare: [0] });
  const operation = capture(state, after)!; const rejected = undo(current, operation);
  assert(!rejected.ok); assert.equal(M.raw(M.getDocument(current, extra.id)), '- /주간회의');
});

test('W18 joined line returns to its original folder, retains existing target and progress', () => {
  let { state, id } = initial('- /회의\n  - [30%] 할 일\n- /주간회의'); const head = bound(state, id), target = bound(state, id, 2);
  const typedRaw = M.raw(M.getDocument(state, id)).replace('- /회의', '- /주간회의');
  const typed = M.editTextResult(state, id, typedRaw, { folderText: true, folderHold: [0] }).state;
  const after = M.editTextResult(typed, id, typedRaw, { folderText: true, folderMove: [0] }).state;
  assert.equal(bound(after, id).folderId, target.folderId);
  const result = back(after, typed, after);
  assert.equal(bound(result, id).folderId, head.folderId);
  assert.equal(M.getDocument(result, id)!.lines[0].text, '- /회의');
  assert(result.folders.some(folder => folder.id === target.folderId));
  assert.deepEqual(result.progressRecords, state.progressRecords);
});

test('W18 association-only grouping preserves intervening RAW and progress and refuses edited picked lines', () => {
  const source = initial('- /하나\n  - [30%] 첫 할 일\n  - [ ] 둘째 할 일\n- /둘\n끝');
  const state = source.state, tasks = M.tasks(state), target = bound(state, source.id, 3).folderId;
  const a = detached(state); a.taskScopes[tasks[0].id] = target; a.itemScopes[tasks[0].id] = target;
  const b = detached(a); b.taskScopes[tasks[1].id] = target; b.itemScopes[tasks[1].id] = target;
  const first = capture(state, a)!, second = capture(a, b)!; assert.equal(first.kind, 'scopes');
  const grouped = combineProgramFolderScopes(first, second), current = detached(b);
  current.documents[0].lines.at(-1)!.text = '그 사이 쓴 끝 메모'; current.progressRecords.push({ taskId: tasks[0].id, date: '2026-11-01', percent: 30 });
  const result = undo(current, grouped); assert(result.ok);
  assert.equal(result.next.taskScopes[tasks[0].id], state.taskScopes[tasks[0].id]);
  assert.equal(result.next.taskScopes[tasks[1].id], state.taskScopes[tasks[1].id]);
  assert.equal(result.next.documents[0].lines.at(-1)!.text, '그 사이 쓴 끝 메모');
  assert.deepEqual(result.next.progressRecords, current.progressRecords);
  const edited = detached(b); edited.documents[0].lines.find(line => line.id === tasks[0].id)!.text += ' 새 입력';
  const snapshot = detached(edited); assert(!undo(edited, grouped).ok); assert.deepEqual(edited, snapshot);
});

function createdChild(automaticBlank = false) {
  const source = initial('- /운동\n  - /식단', [1]);
  const after = M.editTextResult(source.state, source.id, M.raw(M.getDocument(source.state, source.id)), { folderText: true, folderDeclare: [1] }).state;
  const child = bound(after, source.id, 1);
  if (automaticBlank) M.getDocument(after, source.id)!.lines.push({ id: 'automatic-enter-line', text: '    ' });
  const created = { docId: source.id, ...child, ...(automaticBlank ? { automaticBlank: { id: 'automatic-enter-line', text: '    ' } } : {}) };
  const raw = M.raw(M.getDocument(after, source.id)), caret = raw.indexOf('식단') + '식단'.length;
  const selectionBefore = { start: caret, end: caret, direction: 'none' };
  const nativePlan = nativePlans.planIndent(raw, selectionBefore, M.rowMeta(after, source.id), true, [], null, 0); assert(nativePlan);
  return { source, after, child, created, plan: { ...nativePlan, selectionBefore } };
}
test('D11 B empty just-created child uses a separate proof for native outdent and undo restores parent/raw together', () => {
  const { after, created, plan, child } = createdChild();
  const proof = planProgramFreshFolderIndent(after, created, plan); assert(proof);
  assert.equal(proof.next.folders.find(folder => folder.id === child.folderId)!.parentId, null);
  assert.equal(M.getDocument(proof.next, created.docId)!.lines[1].text, '- /식단');
  assert.deepEqual(back(proof.next, after, proof.next), after);
  const generic = M.editTextResult(after, created.docId, plan.nextRaw, { folderText: true });
  assert.equal(generic.folderProblem, 'folder-indent', 'the general linked-indent model guard stays closed');
});
test('D11 B only the captured automatic blank follows relative indentation in the same native edit', () => {
  const { after, created, plan } = createdChild(true);
  const proof = planProgramFreshFolderIndent(after, created, plan); assert(proof);
  assert.equal(M.getDocument(proof.next, created.docId)!.lines[2].text, '  ');
  const operation = capture(after, proof.next, [created.automaticBlank!.id])!;
  const result = undo(proof.next, operation); assert(result.ok); assert.deepEqual(result.next, after);
  const changed = detached(after); M.getDocument(changed, created.docId)!.lines[2].text += ' ';
  assert.equal(planProgramFreshFolderIndent(changed, created, plan), null);
});
test('D11 B refuses taskScope/itemScope/storage/child-folder/other-line uses, real children and a range selection', () => {
  for (const kind of ['task', 'item', 'document', 'child', 'line', 'content', 'range'] as const) {
    const { after, created, plan } = createdChild(); const state = detached(after);
    if (kind === 'task') state.taskScopes.foreign = created.folderId;
    if (kind === 'item') state.itemScopes.foreign = created.folderId;
    if (kind === 'document') { const added = document(state, '저장 위치'); Object.assign(state, added.next); M.getDocument(state, added.id)!.folderId = created.folderId; }
    if (kind === 'child') state.folders.push({ id: 'new-child', title: '하위', parentId: created.folderId });
    if (kind === 'line') state.bindings.push({ kind: 'scope', docId: created.docId, lineId: 'other-line', scopeId: created.folderId });
    if (kind === 'content') M.getDocument(state, created.docId)!.lines.push({ id: 'new-text', text: '    실제 입력' });
    if (kind === 'range') plan.selectionBefore.end++;
    assert.equal(planProgramFreshFolderIndent(state, created, plan), null, kind);
  }
});

test('the unused-folder check includes all six ownership places and excludes only the originating occurrence', () => {
  const { after, created } = createdChild();
  assert.deepEqual(programFolderUses(after, created.folderId, created), []);
  assert.equal(programFolderUses(after, created.folderId).length, 1);
});
