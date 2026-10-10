import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { createEmptyTextWorkspace, textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import type { createProgramTextDraft as DraftFactory } from './ProgramTextEditor';

// Reuse the existing context-test lane: actual pure draft function, memory-only commit.
// No account, browser, clipboard, server or private registration data is used.
const source = readFileSync(new URL('./ProgramTextEditor.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramTextEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'createProgramTextDraft');
assert(declaration);
const compiled = ts.transpileModule(`const value = (${declaration.getText(ast).replace(/^export\s+/, '')});`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const createDraft = new Function('M', 'programSame', 'programClone', `${compiled}; return value;`)(
  M, (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b), structuredClone,
) as typeof DraftFactory;
const TODAY = '2026-10-05';
function fixture(percent?: number) {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '격리 체크 시험' });
  const docId = state.documents[0].id;
  state = M.editText(state, docId, '- [ ] 격리 할 일\n  - 메모: 보존할 메모\n- [ ] 다른 할 일');
  const taskId = M.tasks(state)[0].id;
  if (percent !== undefined) state = M.recordProgress(state, taskId, TODAY, percent);
  return { state, docId, taskId };
}

for (const [percent, marker] of [[100, ' '], [20, 'x']] as const) {
  test(`recorded ${percent}% conflicts with raw ${marker === 'x' ? 'check' : 'uncheck'} without rewriting history`, () => {
    const f = fixture(percent), before = JSON.stringify(f.state);
    const input = M.raw(f.state.documents[0]).replace(/^(- \[)[ xX](\])/, `$1${marker}$2`);
    const edit = M.editTextResult(f.state, f.docId, input, { progressDate: TODAY });
    assert.equal(edit.reason, 'progress-check-conflict');
    assert.deepEqual(edit.progressConflict, { lineId: f.taskId, targetId: f.taskId });
    assert.equal('progressConflict' in edit.state, false);
    assert.equal(edit.state, f.state); assert.equal(M.editText(f.state, f.docId, input), f.state);
    assert.equal(JSON.stringify(f.state), before);
  });
}

test('draft preserves rejected raw input, explains the supported recovery and calls no writer', async () => {
  const f = fixture(100); let writes = 0;
  const input = M.raw(f.state.documents[0]).replace('[x]', '[ ]').replace('보존할 메모', '함께 입력한 메모');
  assert.match(input, /함께 입력한 메모/);
  const draft = createDraft(f.state, f.docId, async () => { writes++; return true; }, () => {});
  assert.equal(draft.updateRaw(input, TODAY), false); assert.equal(await draft.save(), false);
  assert.equal(writes, 0); assert.equal(draft.getState().raw, input);
  assert.equal(draft.getState().working, f.state); assert.equal(draft.getState().invalid, true);
  assert.deepEqual(draft.getState().progressConflict, { lineId: f.taskId, targetId: f.taskId });
  assert.deepEqual(draft.getState().working.progressRecords, f.state.progressRecords);
  assert.match(draft.getState().error, /진행 기록과 다른 체크 표시/);
  assert.match(draft.getState().error, /체크 표시를 되돌린 뒤 ‘진행 조절’/);
  assert.match(draft.getState().error, /입력은 남아 있습니다/);
  assert.doesNotMatch(draft.getState().error, /변경을 나눠서/);
});

test('unrecorded ordinary raw checks still toggle and retain identity and memo', () => {
  const f = fixture(), ids = M.tasks(f.state).map(task => task.id);
  const checked = M.editTextResult(f.state, f.docId, M.raw(f.state.documents[0]).replace('[ ]', '[x]'));
  assert.equal(checked.reason, null); assert.equal(M.tasks(checked.state)[0].done, true);
  const unchecked = M.editTextResult(checked.state, f.docId, M.raw(checked.state.documents[0]).replace('[x]', '[ ]'));
  assert.equal(unchecked.reason, null); assert.equal(M.tasks(unchecked.state)[0].done, false);
  assert.deepEqual(M.tasks(unchecked.state).map(task => task.id), ids);
  assert.equal(M.tasks(unchecked.state)[0].note, '보존할 메모'); assert.deepEqual(unchecked.state.progressRecords, []);
});

test('normal 0% progress path remains supported without touching peer or memo', () => {
  const f = fixture(100), peer = M.tasks(f.state)[1];
  const next = M.recordProgress(f.state, f.taskId, TODAY, 0);
  assert(M.validate(next)); assert.equal(M.tasks(next)[0].done, false);
  assert.equal(M.latestProgress(next, f.taskId)?.percent, 0);
  assert.equal(M.tasks(next)[0].id, f.taskId); assert.equal(M.tasks(next)[0].note, '보존할 메모');
  assert.deepEqual(M.tasks(next)[1], peer);
});

test('restoring only the marker preserves other typed input and allows normal progress recovery', async () => {
  const f = fixture(100); let writes = 0;
  const draft = createDraft(f.state, f.docId, async () => { writes++; return true; }, () => {});
  const input = M.raw(f.state.documents[0]).replace('[x]', '[ ]').replace('보존할 메모', '새로 입력한 메모');
  assert.equal(draft.updateRaw(input, TODAY), false); assert.equal(await draft.save(), false);
  assert.equal(writes, 0);
  assert(draft.updateRaw(input.replace('[ ]', '[x]'), TODAY)); assert(await draft.save());
  assert.equal(M.tasks(draft.getState().committed)[0].note, '새로 입력한 메모');
  assert.equal(draft.getState().error, ''); assert.equal(draft.getState().progressConflict, undefined);
  assert.equal(M.tasks(draft.getState().committed)[0].id, f.taskId);
  assert(draft.apply(M.recordProgress(draft.getState().working, f.taskId, TODAY, 0), '진행 저장'));
  assert(await draft.save()); assert.equal(writes, 2);
  assert.equal(M.tasks(draft.getState().committed)[0].done, false);
  assert.equal(M.tasks(draft.getState().committed)[0].note, '새로 입력한 메모');
});

test('compatible literal edit and generic rejection keep their previous meanings', () => {
  const f = fixture(100);
  const edited = M.editTextResult(f.state, f.docId, M.raw(f.state.documents[0]).replace('격리 할 일', '제목 수정'));
  assert.equal(edited.reason, null); assert.deepEqual(edited.state.progressRecords, f.state.progressRecords);
  assert.equal(M.editTextResult(f.state, 'missing', '').reason, 'blocked');
});

test('conflict diagnostic clears on format rejection, identity ambiguity, raw rejection and discard', () => {
  const f = fixture(100), original = M.raw(f.state.documents[0]);
  const draft = createDraft(f.state, f.docId, async () => { throw Error('writer must not run'); }, () => {});
  const conflict = original.replace('[x]', '[ ]');
  for (const clear of [
    () => draft.updateRaw(original.replace('[x]', '[101%]'), TODAY),
    () => draft.rejectRaw(conflict),
    () => draft.discard(f.state),
  ]) {
    assert.equal(draft.updateRaw(conflict, TODAY), false); assert(draft.getState().progressConflict);
    clear(); assert.equal(draft.getState().progressConflict, undefined);
  }
  let ambiguous = M.addDocument(createEmptyTextWorkspace(), { title: 'Synthetic ambiguous identity' });
  const id = ambiguous.documents[0].id;
  ambiguous = M.editText(ambiguous, id, '- [ ] Parent @2026-09-24\n  - [ ] Child');
  const targetId = M.tasks(ambiguous)[0].id;
  ambiguous = M.recordProgress(ambiguous, targetId, TODAY, 100);
  const controller = createDraft(ambiguous, id, async () => { throw Error('writer must not run'); }, () => {});
  const raw = M.raw(ambiguous.documents[0]);
  assert.equal(controller.updateRaw(raw.replace('[x]', '[ ]'), TODAY), false); assert(controller.getState().progressConflict);
  const input = raw.replace(' @2026-09-24', '').replace('  - [ ] Child', '- [ ] Child');
  assert.equal(M.editTextResult(ambiguous, id, input, { progressDate: TODAY }).reason, 'identity-ambiguous');
  assert.equal(controller.updateRaw(input, TODAY), false); assert.equal(controller.getState().progressConflict, undefined);
});

test('a workspace protection rejection does not expose progress conflict metadata', () => {
  const f = fixture(100), draft = createDraft(f.state, f.docId, async () => { throw Error('writer must not run'); }, () => {}, () => false);
  assert.equal(draft.updateRaw(M.raw(f.state.documents[0]).replace('[x]', '[ ]'), TODAY), false);
  assert.equal(draft.getState().progressConflict, undefined);
});
