const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('./model.js');

const task = (state, id) => state.tasks.find((entry) => entry.id === id);
const flow = (state, id) => state.flows.find((entry) => entry.id === id);
const apply = (state, action) => {
  const result = M.apply(state, action);
  assert.equal(result.error, undefined, result.message);
  assert.deepEqual(M.validate(result.state), []);
  return result;
};

test('four supported saved-plan origins seed once in unfiled', () => {
  const state = M.seed();
  assert.deepEqual(M.validate(state), []);
  assert.deepEqual(state.flows.map((entry) => entry.origin), [
    'source-backed-map',
    'personal-draft',
    'canonical-personal-copy',
    'legacy-saved-plan',
  ]);
  assert.equal(state.flows.every((entry) => entry.folderId === null), true);
  assert.equal(new Set(state.flows.map((entry) => entry.ref)).size, 4);
});

test('savedCopyId, Flow and Item identities are stable and collision-free', () => {
  const first = M.seed();
  const second = M.seed();
  const refs = first.tasks.filter((entry) => entry.flowId).map((entry) => entry.ref);
  assert.equal(new Set(refs).size, refs.length);
  assert.deepEqual(refs, second.tasks.filter((entry) => entry.flowId).map((entry) => entry.ref));
  assert.equal(refs.every((ref) => /^flow-item:[^:]+:[^:]+:[^:]+$/u.test(ref)), true);
});

test('Flow Items inherit the parent Flow folder and never gain direct membership', () => {
  const before = M.seed();
  const result = apply(before, { type: 'move-folder', kind: 'flow', id: 'moving', folderId: 'move' });
  assert.equal(result.changed, true);
  assert.equal(flow(result.state, 'moving').folderId, 'move');
  assert.equal(flow(result.state, 'moving').sourceFolderId, null);
  assert.equal(task(result.state, 'quote').folderId, null);
  assert.equal(M.effectiveFolder(result.state, task(result.state, 'quote')), 'move');
});

test('Flow Item date movement changes only the personal execution date', () => {
  const before = M.seed();
  const original = { ...task(before, 'contract') };
  const result = apply(before, { type: 'schedule', id: 'contract', date: M.TODAY });
  const moved = task(result.state, 'contract');
  assert.equal(moved.date, M.TODAY);
  assert.equal(moved.sourceDate, original.sourceDate);
  assert.equal(moved.ref, original.ref);
  assert.equal(moved.flowId, original.flowId);
  assert.equal(moved.folderId, null);
  assert.equal(task(before, 'contract').date, '2026-09-02');
});

test('completion is shared by folder, Flow and period projections', () => {
  let state = apply(M.seed(), { type: 'move-folder', kind: 'flow', id: 'washer', folderId: 'life' }).state;
  state = apply(state, { type: 'complete', id: 'washer-filter', done: true }).state;
  assert.equal(task(state, 'washer-filter').done, true);
  assert.equal(M.taskIds(state, 'flow:washer:care').includes('washer-filter'), true);
  assert.equal(M.taskIds(state, `date:${M.TODAY}`).includes('washer-filter'), true);
  assert.equal(M.effectiveFolder(state, task(state, 'washer-filter')), 'life');
});

test('quick task can be added, scheduled and moved, then restored from a snapshot', () => {
  const snapshot = M.seed();
  let state = apply(snapshot, { type: 'add-task', title: '전입센터에 전화', folderId: null, date: null }).state;
  const added = state.tasks.find((entry) => entry.title === '전입센터에 전화');
  state = apply(state, { type: 'schedule', id: added.id, date: M.TODAY }).state;
  state = apply(state, { type: 'move-folder', kind: 'task', id: added.id, folderId: 'admin' }).state;
  assert.equal(task(state, added.id).date, M.TODAY);
  assert.equal(task(state, added.id).folderId, 'admin');
  assert.equal(snapshot.tasks.some((entry) => entry.id === added.id), false);
});

test('same date, folder, order and completion are no-op transitions', () => {
  const state = M.seed();
  assert.equal(apply(state, { type: 'schedule', id: 'contract', date: '2026-09-02' }).changed, false);
  assert.equal(apply(state, { type: 'move-folder', kind: 'flow', id: 'moving', folderId: null }).changed, false);
  assert.equal(apply(state, { type: 'complete', id: 'contract', done: false }).changed, false);
  const ids = M.taskIds(state, `date:${M.TODAY}`);
  assert.equal(apply(state, { type: 'reorder', context: `date:${M.TODAY}`, ids }).changed, false);
});

test('manual order is scoped to the exact period context', () => {
  const state = M.seed();
  const context = `date:${M.TODAY}`;
  const ids = M.taskIds(state, context);
  const reversed = ids.slice().reverse();
  const result = apply(state, { type: 'reorder', context, ids: reversed });
  assert.deepEqual(M.taskIds(result.state, context), reversed);
  assert.deepEqual(M.taskIds(result.state, 'undated'), M.taskIds(state, 'undated'));
});

test('standalone writer is statically restricted to one PoC key', () => {
  const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  assert.match(source, /flow:poc:personal-workspace:v1:standalone-demo/u);
  assert.equal((source.match(/localStorage\.setItem\(/gu) || []).length, 1);
  assert.equal((source.match(/localStorage\.removeItem\(/gu) || []).length, 1);
  assert.equal((source.match(/localStorage\.clear\(/gu) || []).length, 0);
  assert.doesNotMatch(source, /flow:saved:|flow:canonical:|flow:my-flow:/u);
});

test('HTML is file-openable and labels the simulation and reload behavior', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '2026-09-01-flowme-personal-workspace-v4-1-standalone-demo-ko.html'), 'utf8');
  assert.match(html, /독립 시뮬레이션/u);
  assert.match(html, /새로고침 복원/u);
  assert.match(html, /\.\/2026-09-01-flowme-personal-workspace-v4-1-standalone-demo-assets\/model\.js/u);
  assert.match(html, /\.\/2026-09-01-flowme-personal-workspace-v4-1-standalone-demo-assets\/app\.js/u);
});
