import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const file = new URL('../../docs/content-audit/2026-10-01-flowme-folder-content-entry-prototype-ko.html', import.meta.url);
const html = readFileSync(file, 'utf8');
const source = /<script id="demo-model">([\s\S]*?)<\/script>/.exec(html)?.[1];
assert(source, 'Model must remain included in the standalone file.');
const M = vm.runInNewContext(`${source}\nFlowFolderDemo`, {});
const normalize = value => JSON.parse(JSON.stringify(value));
test('standalone file is offline, Korean, responsive, with explicit simulation boundaries', () => {
  assert.match(html, /lang="ko"/); assert.match(html, /name="viewport"/);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=|\bfetch\(|localStorage\.clear\(/);
  assert.match(html, /합성 자료/); assert.match(html, /앱의 parser/);
  assert.doesNotMatch(html, /保存|一般入力/);
});
test('plain input offers but never automatically binds or creates', () => {
  const state = M.initial(), next = M.transition(state, { type: 'text', raw: '- 새 폴더' });
  assert.equal(next.binding, null); assert.equal(next.folders.length, 4);
  assert.equal(M.proposal(next).title, '새 폴더'); assert.equal(M.proposal(next).folders.length, 0);
  assert.equal(state.raw, '- 업무'); assert.equal(M.transition(next, { type: 'cancel' }), next);
});
test('exact names use folder IDs and full paths for homonyms', () => {
  const state = M.transition(M.initial(), { type: 'text', raw: '- 정리' });
  assert.deepEqual(normalize(M.proposal(state).folders.map(row => row.path)), ['업무 / 정리', '생활 / 정리']);
  const next = M.transition(state, { type: 'connect', folderId: 'f-review-life' });
  assert.equal(next.binding.folderId, 'f-review-life'); assert.equal(next.binding.lineId, 'demo-line-1');
  assert.equal(next.raw, state.raw); assert.equal(M.transition(state, { type: 'connect', folderId: 'missing' }), state);
});
test('unknown title creates only on confirmation, identity and raw survive', () => {
  const state = M.transition(M.initial(), { type: 'text', raw: '- 새 폴더' });
  const next = M.transition(state, { type: 'connect', create: true });
  assert.equal(next.folders.length, 5); assert.equal(next.binding.lineId, 'demo-line-1');
  assert.equal(next.raw, '- 새 폴더'); assert.equal(M.proposal(next), null);
  assert.equal(M.transition(M.initial(), { type: 'connect', create: true }).folders.length, 4);
});
test('tasks, multiline, nested and overlong input do not masquerade as folder proposals', () => {
  for (const raw of ['- [ ] 할 일', '- a\n  - b', '  - 중첩', '- '+ '가'.repeat(101), '-  ']) {
    assert.equal(M.proposal(M.transition(M.initial(), { type: 'text', raw })), null);
  }
});
test('public read is unchanged, import is private and collision-free, duplicate is no-op', () => {
  const baseline = JSON.stringify(M.PUBLIC); const state = M.initial();
  const first = M.transition(state, { type: 'import', flowId: 'sample-walk' });
  const second = M.transition(first, { type: 'import', flowId: 'sample-study' });
  assert.equal(second.copies.length, 2); assert.equal(new Set(second.copies.flatMap(copy => copy.items.map(row => row.id))).size, 4);
  const toggled = M.transition(second, { type: 'toggle', copyId: second.copies[0].id, itemId: second.copies[0].items[0].id });
  assert.equal(toggled.copies[0].items[0].done, true); assert.equal(JSON.stringify(M.PUBLIC), baseline);
  assert.equal(M.transition(first, { type: 'import', flowId: 'sample-walk' }), first);
});
test('private draft never becomes a public flow or a personal execution copy', () => {
  const next = M.transition(M.initial(), { type: 'draft', title: '제작', raw: '- [ ] 새 내용' });
  assert.equal(next.drafts.length, 1); assert.equal(next.copies.length, 0); assert.equal(M.PUBLIC.length, 2);
});
test('only one allowed key is written, last success reloads, corrupt payload locks', () => {
  const store = new Map([['flow:saved-plans', 'unchanged']]), writes = [];
  const storage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => { writes.push(key); store.set(key, value); } };
  const state = M.transition(M.initial(), { type: 'text', raw: '- 새 폴더' });
  M.write(storage, state); assert.deepEqual(writes, [M.KEY]); assert.equal(store.get('flow:saved-plans'), 'unchanged');
  assert.deepEqual(normalize(M.read(storage).state), normalize(state));
  store.set(M.KEY, '{invalid'); assert.match(M.read(storage).error, /읽을 수 없습니다/);
});
test('storage error preserves the input candidate and does not mark persisted state', () => {
  const state = M.transition(M.initial(), { type: 'text', raw: '- 유지' });
  assert.throws(() => M.write({ setItem: () => { throw Error('quota'); } }, state), /quota/);
  assert.equal(state.raw, '- 유지'); assert.equal(M.valid({ version: 99 }), false);
});
