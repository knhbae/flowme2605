import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { createEmptyTextWorkspace, textEditorRows, textWorkspaceModel as M, type TextWorkspaceModel, type TextWorkspaceState } from './text-workspace';

// typelag (다) (총괄 11/11): the model's per-query binding index gives what the scans gave. The reference is the same
// vendor source with bindingIndex returning null (every lookup scans as before), loaded on its own.
const source = readFileSync(new URL('./vendor/text-model.cjs', import.meta.url), 'utf8');
const marker = 'function bindingIndex(state) {';
assert.equal(source.split(marker).length, 2);
const scanning = (() => {
  const module = { exports: {} as TextWorkspaceModel };
  vm.runInNewContext(source.replace(marker, marker + ' return null;'), { module, exports: module.exports, globalThis: { crypto: globalThis.crypto }, Map, Set, WeakMap, Object, Array, JSON, Number, String, Date, Math, Error, RegExp, Uint16Array, Uint32Array });
  return module.exports;
})();
function ids(state: TextWorkspaceState) { return [...state.documents, ...state.flows].map(doc => doc.id); }
function look(model: TextWorkspaceModel, state: TextWorkspaceState) {
  return JSON.stringify({ valid: model.validate(state), tasks: model.tasks(state), scopes: model.scopes(state), rows: ids(state).map(id => model.rowMeta(state, id)),
    context: ids(state).map(id => model.contextAt(state, id, 1)) });
}
function random(seed: number) { return () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }; }
const BLOCKS = [['[2026-11-11]'], ['[2026-11-12]'], ['- [ ] 할 일', '  - 메모: 메모'], ['- [x] 끝난 일'], ['- [50%] 반쯤', '  - 날짜: 2026-11-13'],
  ['- [ ] 큰 일', '  - [ ] 하위 체크'], ['- /가', '  - [ ] 가 안 일'], ['- /나', '  - [ ] 나 안 일', '  - /다'], ['- /가'], ['일반 글'], [''], ['- 목록']];

test('binding index on = off: validate, tasks, scopes, rowMeta, context and edits on random workspaces with folders and references', () => {
  let compared = 0, withBindings = 0, links = 0, referencesValid = 0;
  for (let run = 0; run < 6; run++) {
    const next = random(run + 31);
    let state = createEmptyTextWorkspace();
    for (const title of ['하나', '둘', '셋']) state = M.addDocument(state, { title });
    for (let step = 0; step < 50; step++) {
      const id = ids(state)[Math.floor(next() * ids(state).length)], lines: string[] = [];
      for (let i = 0, n = 1 + Math.floor(next() * 7); i < n; i++) lines.push(...BLOCKS[Math.floor(next() * BLOCKS.length)].map(line => line.includes('/') || line.startsWith('[') || !line ? line : `${line} ${step}-${i}`));
      const edit = M.editTextResult(state, id, lines.join('\n'), { folderText: true });
      if (edit.reason !== null) continue;
      state = edit.state;
      // Now and then a task of one document linked into another (a task reference binding).
      if (next() < 0.3) {
        const task = M.tasks(state)[Math.floor(next() * Math.max(1, M.tasks(state).length))], target = ids(state)[Math.floor(next() * ids(state).length)];
        if (task && task.docId !== target) { const linked = M.linkTask(state, target, M.getDocument(state, target)!.lines.length, task.id); if (linked !== state) links++; state = linked; }
      }
      if (state.bindings.length) withBindings++;
      if (state.bindings.some(binding => binding.kind === 'task') && M.validate(state)) referencesValid++;
      assert.equal(look(M, state), look(scanning, state), `run ${run} step ${step}`);
      for (const doc of ids(state)) assert.deepEqual(textEditorRows(state, doc).length, scanning.rowMeta(state, doc).length);
      // An edit on top: the same judgement (its new line ids are random, so the text and the reason are compared).
      const other = ids(state)[Math.floor(next() * ids(state).length)], raw = M.raw(M.getDocument(state, other)) + '\n- [ ] 더한 일 ' + step;
      const a = M.editTextResult(state, other, raw, { folderText: true }), b = scanning.editTextResult(state, other, raw, { folderText: true });
      assert.equal(a.reason, b.reason);
      if (a.reason === null) assert.deepEqual(ids(a.state).map(doc => M.raw(M.getDocument(a.state, doc))), ids(b.state).map(doc => scanning.raw(scanning.getDocument(b.state, doc))));
      compared++;
    }
  }
  assert(compared > 60 && withBindings > 40 && links > 5 && referencesValid > 10, `${compared} states compared, ${withBindings} with bindings, ${links} links`);
});

test('a binding changed in place between two queries is read again (the index lives in one query)', () => {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '폴더 글' });
  const id = state.documents[0].id, edit = M.editTextResult(state, id, '- /가\n  - [ ] 가 안 일', { folderText: true });
  assert.equal(edit.reason, null); state = edit.state;
  const clone = structuredClone(state) as TextWorkspaceState, scope = clone.bindings.find(binding => binding.kind === 'scope')!;
  assert.equal(M.rowMeta(clone, id)[0].kind, 'scope');
  scope.lineId = 'elsewhere';
  assert.equal(look(M, clone), look(scanning, clone));
  assert.deepEqual(M.rowMeta(clone, id), [], 'the changed binding no longer validates, as with the scans');
});
