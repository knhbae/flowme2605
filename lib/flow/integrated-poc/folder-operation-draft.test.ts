import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { createProgramTextDraft } from './program-text-draft';
import { createProgramDocumentInput } from './program-document-input';
import { createEmptyTextWorkspace, textWorkspaceModel as M, textEditorRows, type TextWorkspaceState } from './text-workspace';
import { detached } from './alpha-persistence/json';
import type { FolderIndentPlan } from './folder-operation';

const native = createRequire(import.meta.url)('./text-input-plan.cjs') as { planIndent: (...args: unknown[]) => Omit<FolderIndentPlan, 'selectionBefore'> | null };
function setup(raw = '- /운동\n  - /식단', held = [1]) {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '합성 글' }); const docId = state.documents.at(-1)!.id;
  state = M.editTextResult(state, docId, raw, { folderText: true, folderHold: held }).state;
  const owner = createProgramDocumentInput(state, docId), commits: TextWorkspaceState[] = [];
  const draft = createProgramTextDraft(owner.initial, docId, async next => { commits.push(next); return true; }, () => {}, () => true, owner, true);
  return { state, docId, draft, commits };
}
function create(automatic = false) {
  const fixture = setup(); const { draft, docId } = fixture;
  assert(draft.declareFolderLine(1)); const head = M.getDocument(draft.getState().working, docId)!.lines[1];
  if (automatic) { draft.noteFolderEnter(head.id); assert(draft.updateRaw(draft.getState().raw + '\n    ', '', { inputType: 'insertText' })); }
  const operation = draft.folderOperation()!; assert(operation);
  const plan = (outdent = true) => {
    const state = draft.getState(), caret = state.raw.indexOf('식단') + 2;
    const selectionBefore = { start: caret, end: caret, direction: 'none' };
    const nativePlan = native.planIndent(state.raw, selectionBefore, M.rowMeta(state.working, docId), outdent, [], null, 0);
    assert(nativePlan); return { ...nativePlan, selectionBefore };
  };
  return { ...fixture, operation, plan, head };
}

test('W17 projects only dormant unbound syntax, preserving RAW, bindings and stable IDs through other editing', () => {
  const { draft, docId } = setup('- /보류 폴더\n메모', [0]);
  const before = detached(draft.getState().working), head = M.getDocument(before, docId)!.lines[0];
  assert.equal(textEditorRows(before, docId)[0].folderPending, true);
  assert(draft.updateRaw(draft.getState().raw + ' 계속', '', { inputType: 'insertText' }));
  assert.equal(draft.getState().working.folders.length, before.folders.length);
  assert.deepEqual(M.getDocument(draft.getState().working, docId)!.lines[0], head);
  assert.deepEqual(draft.getState().working.bindings, before.bindings);
  assert.equal(textEditorRows(draft.getState().working, docId)[0].folderPending, true);
  assert(draft.declareFolderLine(0));
  assert.equal(textEditorRows(draft.getState().working, docId)[0].folderPending, undefined);
});

test('W17 excludes fenced, incomplete, malformed, linked and task syntax from pending paint', () => {
  const { draft, docId } = setup('- /\n- /a/b\n- [ ] 할 일\n```\n- /코드\n```\n- /연결', [0, 1, 4]);
  assert(textEditorRows(draft.getState().working, docId).every(row => row.folderPending !== true));
});

test('W18 notice undo creates one new saved change, not history restoration, after an exact ACK', async () => {
  const { draft, docId, operation, commits } = create();
  assert(await draft.save()); assert.equal(commits.length, 1);
  assert(draft.undoFolderOperation(operation.id).ok); assert(await draft.save()); assert.equal(commits.length, 2);
  assert.equal(M.getDocument(commits[1], docId)!.lines[1].text, '  - 식단');
  assert.notDeepEqual(commits[1], commits[0]); assert.equal(draft.folderOperation(), null);
  assert(!draft.undoFolderOperation(operation.id).ok); assert.equal(commits.length, 2);
});

test('W18 an inverse during an owned background save preserves the earlier submission and saves the newer inverse once', async () => {
  const base = setup(), owner = createProgramDocumentInput(base.state, base.docId);
  const pending: { next: TextWorkspaceState; finish: (value: boolean) => void }[] = [];
  const draft = createProgramTextDraft(owner.initial, base.docId, next => new Promise(resolve => pending.push({ next, finish: resolve })), () => {}, () => true, owner, true);
  assert(draft.declareFolderLine(1)); const operation = draft.folderOperation()!, saving = draft.save();
  assert.equal(pending.length, 1); const submitted = detached(pending[0].next);
  assert(draft.undoFolderOperation(operation.id).ok); assert.deepEqual(pending[0].next, submitted);
  pending[0].finish(true); await new Promise<void>(resolve => setImmediate(resolve)); assert.equal(pending.length, 2);
  assert.equal(M.getDocument(pending[1].next, base.docId)!.lines[1].text, '  - 식단');
  pending[1].finish(true); assert(await saving); assert.equal(draft.getState().dirty, false); assert.equal(pending.length, 2);
});

test('W18 association notices group within their live record and keep intervening typing, but closing ends the group', () => {
  const { draft, docId } = setup('- /운동\n  - [ ] 하나\n  - [ ] 둘\n- /독서\n끝', []);
  const original = draft.getState().working, tasks = M.tasks(original), target = original.folders.find(folder => folder.title === '독서')!.id;
  const first = detached(original); first.taskScopes[tasks[0].id] = target; first.itemScopes[tasks[0].id] = target;
  assert(draft.apply(first, '첫 분류')); const firstOperation = draft.folderOperation()!;
  assert(draft.updateRaw(draft.getState().raw + ' 메모', '', { inputType: 'insertText' }));
  const second = detached(draft.getState().working); second.taskScopes[tasks[1].id] = target; second.itemScopes[tasks[1].id] = target;
  assert(draft.apply(second, '둘째 분류')); const grouped = draft.folderOperation()!;
  assert.equal(grouped.id, firstOperation.id); assert.equal(grouped.notice, '할 일 2개를 ‘독서’로 옮겼습니다');
  assert(draft.undoFolderOperation(grouped.id).ok); assert(draft.getState().raw.endsWith('끝 메모'));
  assert.equal(draft.getState().working.taskScopes[tasks[0].id], original.taskScopes[tasks[0].id]);
  assert.equal(draft.getState().working.taskScopes[tasks[1].id], original.taskScopes[tasks[1].id]);
  assert.equal(M.getDocument(draft.getState().working, docId)!.lines.length, M.getDocument(original, docId)!.lines.length);
  assert(draft.apply(first, '새 분류')); const prior = draft.folderOperation()!; draft.endFolderNotice(prior.id);
  const closedNext = detached(draft.getState().working); closedNext.taskScopes[tasks[1].id] = target; closedNext.itemScopes[tasks[1].id] = target;
  assert(draft.apply(closedNext, '닫힌 뒤 분류')); assert.notEqual(draft.folderOperation()!.id, prior.id);
  assert.equal(draft.folderOperation()!.notice, '할 일 1개를 ‘독서’로 옮겼습니다');
});

test('D11 native plan moves head and captured automatic blank once; its forward undo restores both', async () => {
  const { draft, operation, plan, docId, commits } = create(true);
  const before = draft.getState().working, proof = draft.planFreshFolderIndent(plan(), operation.id); assert(proof);
  assert.equal(proof.plan.nextRaw, '- /운동\n- /식단\n  ');
  assert(draft.applyFreshFolderIndent(proof, proof.plan.nextRaw)); assert(await draft.save()); assert.equal(commits.length, 1);
  assert.equal(draft.getState().working.folders.find(folder => folder.title === '식단')!.parentId, null);
  assert.equal(M.getDocument(draft.getState().working, docId)!.lines[2].text, '  ');
  assert(draft.undoFolderOperation(draft.folderOperation()!.id).ok); assert(await draft.save()); assert.equal(commits.length, 2);
  assert.deepEqual(draft.getState().working, before);
});

test('D11 an ordinary manually typed blank without the captured Enter is not an automatic empty child', () => {
  const { draft, operation, plan } = create();
  assert(draft.updateRaw(draft.getState().raw + '\n    ', '', { inputType: 'insertText' }));
  assert.equal(draft.planFreshFolderIndent(plan(), operation.id), null);
});

for (const input of [' ', '\n    ', '\n', 'x']) test(`D11 following input ${JSON.stringify(input)} consumes the creation exception`, () => {
  const { draft, operation, plan } = create(true);
  assert(draft.updateRaw(draft.getState().raw + input, '', { inputType: 'insertText' }));
  assert.equal(draft.planFreshFolderIndent(plan(), operation.id), null);
});

test('D11 closing the notice and an unrelated later edit both refuse a stale native proof without changing state', () => {
  for (const change of ['notice', 'input'] as const) {
    const { draft, operation, plan } = create(true), proof = draft.planFreshFolderIndent(plan(), operation.id); assert(proof);
    if (change === 'notice') draft.endFolderNotice(operation.id);
    else assert(draft.updateRaw(draft.getState().raw + '\n메모', '', { inputType: 'insertText' }));
    const before = draft.getState(); assert(!draft.applyFreshFolderIndent(proof, proof.plan.nextRaw)); assert.equal(draft.getState(), before);
  }
});

test('D11 only an unmodified, owner-issued, single-use proof can enter the forward-change port', () => {
  const { draft, operation, plan } = create(true), proof = draft.planFreshFolderIndent(plan(), operation.id); assert(proof);
  assert(!draft.applyFreshFolderIndent({ ...proof }, proof.plan.nextRaw), 'a copied object is not the owner proof');
  assert.throws(() => { proof.next.folders[0].title = '바꾸려는 값'; }, TypeError);
  assert.throws(() => { proof.plan.nextRaw = '다른 입력'; }, TypeError);
  assert(draft.applyFreshFolderIndent(proof, proof.plan.nextRaw));
  assert(!draft.applyFreshFolderIndent(proof, proof.plan.nextRaw), 'consumed proof cannot run twice');
});

test('W18 preserves unrelated later RAW/progress but atomically refuses editing a related line', () => {
  const { draft, operation, docId } = create(true);
  assert(draft.updateRaw(draft.getState().raw + '\n별개 메모', '', { inputType: 'insertText' }));
  assert(draft.undoFolderOperation(operation.id).ok); assert(draft.getState().raw.endsWith('별개 메모'));
  const next = create(); const before = next.draft.getState();
  assert(next.draft.updateRaw(before.raw.replace('식단', '다른 입력'), '', { inputType: 'insertText', folderHold: [1] }));
  const live = next.draft.getState(); assert(!next.draft.undoFolderOperation(next.operation.id).ok); assert.equal(next.draft.getState(), live);
  assert.equal(M.getDocument(draft.getState().working, docId)!.lines[1].text, '  - 식단');
});

test('D11 a clean remote synchronization invalidates creation privilege; exact same snapshot does not', async () => {
  const { draft, operation, plan, docId } = create(); await draft.save();
  assert.equal(draft.synchronize(draft.getState().committed), false); assert(draft.planFreshFolderIndent(plan(), operation.id));
  const remote = detached(draft.getState().working); M.getDocument(remote, docId)!.title = '다른 기기 제목';
  assert(draft.synchronize(remote)); assert.equal(draft.planFreshFolderIndent(plan(), operation.id), null);
});

test('W18 all-doc rename replaces the preceding temporary move and undo never recreates that temporary folder', () => {
  const { draft, state, docId } = setup('- /회의\n  - [ ] 안건', []);
  const other = M.addDocument(state, { title: '다른 글' });
  const shared = M.editText(other, other.documents.at(-1)!.id, '- /회의', { folderText: true });
  assert(draft.synchronize(shared));
  assert(draft.updateRaw(draft.getState().raw.replace('회의', '주간회의'), '', { inputType: 'insertText', folderHold: [0] }));
  const moved = draft.moveFolderLine(0); assert(moved.ok);
  const tempId = moved.toId; assert.notEqual(tempId, moved.fromId);
  const head = M.getDocument(draft.getState().working, docId)!.lines[0];
  draft.noteFolderEnter(head.id);
  assert(draft.updateRaw(draft.getState().raw.replace('\n', '\n  \n'), '', { inputType: 'insertText' }));
  const renameBase = draft.folderRenameBase(moved.fromId); assert(renameBase);
  assert.equal(M.getDocument(renameBase, docId)!.lines[1].text, '  ');
  const everywhere = M.renameScope(renameBase, moved.fromId, '주간회의');
  assert(draft.apply(everywhere, '모든 문서 이름', undefined, undefined, renameBase));
  assert(draft.undoFolderOperation(draft.folderOperation()!.id).ok);
  assert(!draft.getState().working.folders.some(folder => folder.id === tempId));
  assert.equal(M.getDocument(draft.getState().working, docId)!.lines[0].text, '- /회의');
  assert.equal(draft.getState().working.folders.find(folder => folder.id === moved.fromId)!.title, '회의');
  assert.equal(M.getDocument(draft.getState().working, docId)!.lines[1].text, '  ', 'the Enter is retained through global rename and its inverse');
});
