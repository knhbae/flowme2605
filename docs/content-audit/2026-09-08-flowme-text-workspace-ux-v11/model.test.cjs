'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const model = require('./model.js');
// v11 retains all 341 baseline cases. Approved expectation changes cover free
// reparenting/promotion, canonical planning independent of visual depth, the
// 32-level resource cap, local reference children (not direct properties),
// free document scope links without catalog reparenting, and positional IDs
// for indentation-only edits. Ambiguous rewrites and storage/history guards stay.
let count = 0;
function test(name, run) { run(); count += 1; console.log('PASS ' + name); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function single(text) {
  const doc = { id: 'doc-1', title: '메모', folder: '일상', folderId: 'folder-life',
    lines: text ? text.split('\n').map((value, i) => ({ id: 'line-' + i, text: value })) : [] };
  const state = { version: 11, documents: [doc], folders: [{ id: 'folder-life', title: '일상', parentId: null }], flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] };
  model.parseDocument(doc).tasks.forEach(task => { state.taskScopes[task.id] = 'folder-life'; });
  model.parseDocument(doc).items.forEach(task => { state.itemScopes[task.id] = 'folder-life'; });
  return state;
}
function parse(text) { return model.parseDocument(single(text).documents[0]); }
function only(state) { return model.tasks(state)[0]; }
function storage(initial = {}) {
  const data = new Map(Object.entries(initial)), calls = [];
  return { data, calls, getItem(key) { calls.push(['get', key]); return data.has(key) ? data.get(key) : null; }, setItem(key, value) { calls.push(['set', key]); data.set(key, value); } };
}
test('browser UMD and CommonJS expose the same complete API', () => {
  const browser = {}; vm.runInNewContext(fs.readFileSync(__dirname + '/model.js', 'utf8'), browser);
  assert.deepEqual(Object.keys(browser.TextWorkspaceModel).sort(), Object.keys(model).sort());
  assert.equal(model.KEY, 'flowme:ux-review:text-workspace-v11:20260908');
});

test('section dates apply until the next section including explicit undated', () => {
  const result = parse('[2026-09-07]\n- [ ] A\n- [ ] B\n[2026-09-08]\n- [ ] C\n[미정]\n- [ ] D');
  assert.deepEqual(result.tasks.map(t => t.date), ['2026-09-07', '2026-09-07', '2026-09-08', null]);
});

test('individual dates override a group without affecting following tasks', () => {
  const result = parse('[2026-09-07]\n- [ ] A\n  - 날짜: 2026-09-09\n- [ ] B');
  assert.equal(result.tasks[0].date, '2026-09-09'); assert.equal(result.tasks[0].groupDate, '2026-09-07'); assert.equal(result.tasks[1].date, '2026-09-07');
});

test('individual undated overrides a dated group', () => {
  const task = parse('[2026-09-07]\n- [ ] A\n  - 날짜: 미정').tasks[0]; assert.equal(task.date, null); assert.equal(task.groupDate, '2026-09-07');
});

test('ordinary prose and headings never assign a date or create a task', () => {
  const result = parse('내일 2026-09-07 일을 한다\n## 2026-09-08\n- 그냥 메모\n- [ ] 직접 적은 할 일');
  assert.equal(result.tasks.length, 1); assert.equal(result.tasks[0].date, null);
  assert.deepEqual(result.rows.map(r => r.kind), ['note', 'heading', 'note', 'task']);
});

test('invalid date sections stop previous date inheritance', () => {
  const result = parse('[2026-09-07]\n- [ ] A\n[2026-02-30]\n- [ ] B\n[2026-99-01]\n- [ ] C');
  assert.deepEqual(result.tasks.map(t => t.date), ['2026-09-07', null, null]); assert.equal(result.issues.filter(i => i.code === 'invalid-date').length, 2);
});

test('invalid individual date fails closed instead of falling back to the group', () => {
  const result = parse('[2026-09-07]\n- [ ] A\n  - 날짜: 2026-13-01');
  assert.equal(result.tasks[0].date, null); assert(result.issues.some(i => i.code === 'invalid-date-property'));
});

test('valid leap dates work and impossible leap dates stop inheritance', () => {
  assert.equal(parse('[2028-02-29]\n- [ ] A').tasks[0].date, '2028-02-29');
  assert.equal(parse('[2026-02-29]\n- [ ] A').tasks[0].date, null);
});

test('backtick code fences ignore tasks dates and properties while preserving the outside section', () => {
  const result = parse('[2026-09-07]\n```text\n[2026-09-09]\n- [ ] 코드\n  - 날짜: 미정\n```\n- [ ] 실제');
  assert.equal(result.tasks.length, 1); assert.equal(result.tasks[0].date, '2026-09-07'); assert.equal(result.rows.filter(r => r.kind === 'fence').length, 5);
});

test('tilde and long fences require their matching close and report unclosed input', () => {
  const result = parse('~~~~\n- [ ] A\n~~~\n- [ ] B\n~~~~\n- [ ] C'); assert.equal(result.tasks.length, 1);
  const unclosed = parse('```\n- [ ] A'); assert.equal(unclosed.tasks.length, 0); assert.equal(unclosed.issues[0].code, 'unclosed-fence');
});

test('properties include memo and time; repeated notes preserve order', () => {
  const task = parse('- [ ] A\n  - 메모: 첫 메모\n  - 시간: 09:30\n  - 메모: 둘째 메모').tasks[0];
  assert.equal(task.note, '첫 메모\n둘째 메모'); assert.equal(task.time, '09:30');
});

test('explicit completion changes exactly one original line and keeps every ID', () => {
  const state = single('[2026-09-07]\n- [ ] A\n  - 메모: 그대로\n- [ ] B'); const before = clone(state);
  const next = model.updateTask(state, 'line-1', { done: true });
  assert.equal(next.documents[0].lines[1].text, '- [x] A'); assert.deepEqual(state, before);
  assert.deepEqual(next.documents[0].lines.filter((line, i) => line.text !== state.documents[0].lines[i].text).map(l => l.id), ['line-1']);
  assert.deepEqual(next.documents[0].lines.map(l => l.id), state.documents[0].lines.map(l => l.id)); assert(only(next).done);
});

test('direct checkbox source edits update derived completion and preserve task identity', () => {
  const state = single('- [ ] A\n  - 메모: 유지'); const next = model.editText(state, 'doc-1', '- [x] A\n  - 메모: 유지');
  assert(only(next).done); assert.equal(only(next).id, only(state).id); assert.equal(only(next).note, '유지');
});

test('task title update preserves its checkbox and surrounding source formatting', () => {
  const state = single('- [X] 원래 제목  \n  - 메모: 유지'); const next = model.updateTask(state, 'line-0', { title: '새 제목' });
  assert.equal(next.documents[0].lines[0].text, '- [X] 새 제목  '); assert(only(next).done); assert.equal(only(next).note, '유지');
});

test('period date edit inserts a per-task override without moving the source task', () => {
  const state = single('[2026-09-07]\n- [ ] A\n  - 메모: 유지\n- [ ] B'); const next = model.updateTask(state, 'line-1', { date: '2026-09-09' });
  assert.equal(next.documents[0].lines[1].id, 'line-1'); assert.equal(next.documents[0].lines[2].text, '  - 날짜: 2026-09-09');
  assert.equal(model.tasks(next)[0].date, '2026-09-09'); assert.equal(model.tasks(next)[1].date, '2026-09-07'); assert.equal(only(next).note, '유지');
  assert.deepEqual(next.documents[0].lines.filter(l => l.id.startsWith('line-') && state.documents[0].lines.some(old => old.id === l.id)), state.documents[0].lines);
});

test('repeated date edit updates the same property rather than adding duplicates', () => {
  const state = single('- [ ] A\n  - 날짜: 2026-09-07\n  - 메모: 유지'); const next = model.updateTask(state, 'line-0', { date: '2026-09-08' });
  assert.equal(next.documents[0].lines.length, 3); assert.equal(next.documents[0].lines[1].id, 'line-1'); assert.equal(only(next).date, '2026-09-08');
});

test('clearing the task date writes an explicit undated override', () => {
  const state = single('[2026-09-07]\n- [ ] A'); const next = model.updateTask(state, 'line-1', { date: null });
  assert.equal(only(next).date, null); assert.equal(only(next).groupDate, '2026-09-07'); assert(model.raw(next.documents[0]).includes('  - 날짜: 미정'));
});

test('duplicate titles have separate stable IDs and edits target one task', () => {
  const state = single('- [ ] 같은 제목\n- [ ] 같은 제목'); const next = model.updateTask(state, 'line-1', { done: true, date: '2026-09-08' });
  assert.deepEqual(model.tasks(next).map(t => [t.id, t.done, t.date]), [['line-0', false, null], ['line-1', true, '2026-09-08']]);
});

test('direct source completion of either duplicate title preserves both task identities', () => {
  const state = single('- [ ] 같은 제목\n- [ ] 같은 제목');
  for (const text of ['- [x] 같은 제목\n- [ ] 같은 제목', '- [ ] 같은 제목\n- [x] 같은 제목']) {
    const next = model.editText(state, 'doc-1', text); assert.deepEqual(model.tasks(next).map(t => t.id), ['line-0', 'line-1']);
  }
});

test('text insertion preserves exact matching task IDs and original order', () => {
  const state = single('- [ ] A\n- [ ] B'); const next = model.editText(state, 'doc-1', '머리말\n- [ ] A\n중간 메모\n- [ ] B');
  assert.deepEqual(model.tasks(next).map(t => t.id), ['line-0', 'line-1']); assert.deepEqual(model.tasks(next).map(t => t.sourceIndex), [1, 3]);
});

test('a direct single-line rename reuses its task ID', () => {
  const state = single('메모\n- [ ] A\n끝'); const next = model.editText(state, 'doc-1', '메모\n- [ ] 바꾼 제목\n끝');
  assert.equal(only(next).id, 'line-1'); assert.equal(only(next).title, '바꾼 제목');
});

test('clear same-kind task and property replacements reuse distinct IDs', () => {
  const state = single('앞\n- [ ] A\n  - 메모: 이전\n뒤'); const next = model.editText(state, 'doc-1', '앞\n- [ ] B\n  - 메모: 이후\n뒤');
  assert.equal(only(next).id, 'line-1'); assert.equal(next.documents[0].lines[2].id, 'line-2');
});

test('ambiguous multiple-task replacements are rejected without losing source or ownership', () => {
  const state = single('- [ ] A\n- [ ] B'); const next = model.editText(state, 'doc-1', '- [ ] C\n- [ ] D');
  assert.equal(next, state);
});

test('turning prose into a task receives a new ID instead of reusing its note identity', () => {
  const state = single('원래 문장'); const next = model.editText(state, 'doc-1', '- [ ] 원래 문장'); assert.notEqual(only(next).id, 'line-0');
});

test('empty editing persists; exact no-op editing returns the original state', () => {
  const state = single('- [ ] A'); assert.equal(model.editText(state, 'doc-1', model.raw(state.documents[0])), state);
  const next = model.editText(state, 'doc-1', ''); assert.equal(next.documents[0].lines.length, 0); assert.equal(model.tasks(next).length, 0);
});

test('Windows newlines normalize while blank line placement survives', () => {
  const next = model.editText(single(''), 'doc-1', '첫 줄\r\n\r\n- [ ] A\r\n'); assert.equal(model.raw(next.documents[0]), '첫 줄\n\n- [ ] A\n');
});

test('large edits fail closed at the documented line and raw limits', () => {
  const state = single('- [ ] A'); assert.equal(model.editText(state, 'doc-1', '가'.repeat(100001)), state);
  assert.equal(model.editText(state, 'doc-1', Array(1201).fill('줄').join('\n')), state);
});

test('addTask creates a missing common-date section without storing derived copies', () => {
  const state = single('[2026-09-07]\n- [ ] A'); const next = model.addTask(state, { docId: 'doc-1', title: 'B', date: '2026-09-09' });
  assert.equal(model.tasks(next).length, 2); assert.equal(model.tasks(next)[1].date, '2026-09-09');
  assert.equal(model.raw(next.documents[0]), '[2026-09-07]\n- [ ] A\n\n[2026-09-09]\n- [ ] B'); assert(!('tasks' in next));
});

test('addTask continues the matching common-date section before the next section', () => {
  const state = single('[2026-09-07]\n- [ ] A\n\n[2026-09-08]\n- [ ] B');
  const next = model.addTask(state, { docId: 'doc-1', title: 'C', date: '2026-09-07' });
  assert.equal(model.raw(next.documents[0]), '[2026-09-07]\n- [ ] A\n- [ ] C\n\n[2026-09-08]\n- [ ] B');
  assert.deepEqual(model.tasks(next).map(t => [t.title, t.date]), [['A', '2026-09-07'], ['C', '2026-09-07'], ['B', '2026-09-08']]);
  assert(!model.raw(next.documents[0]).includes('  - 날짜:'));
});

test('repeated additions share one date marker and stable document order', () => {
  let state = single(''); state = model.addTask(state, { docId: 'doc-1', title: 'A', date: '2026-09-07' });
  state = model.addTask(state, { docId: 'doc-1', title: 'B', date: '2026-09-07' });
  assert.equal(model.raw(state.documents[0]), '[2026-09-07]\n- [ ] A\n- [ ] B');
});

test('addTask ignores apparent date sections inside code and invalid date sections', () => {
  const state = single('```\n[2026-09-07]\n```\n[2026-02-30]\n- [ ] 원문');
  const next = model.addTask(state, { docId: 'doc-1', title: 'A', date: '2026-09-07' });
  assert.equal(model.raw(next.documents[0]), '```\n[2026-09-07]\n```\n[2026-02-30]\n- [ ] 원문\n\n[2026-09-07]\n- [ ] A');
});

test('addTask with an undated selection does not inherit the last dated group', () => {
  const next = model.addTask(single('[2026-09-07]'), { docId: 'doc-1', title: 'B', date: null }); assert.equal(only(next).date, null);
});

test('addTask refuses insertion inside an unclosed code fence', () => {
  const state = single('```\n샘플'); assert.equal(model.addTask(state, { docId: 'doc-1', title: 'B', date: null }), state);
});

test('removeTask deletes only its source and attached properties', () => {
  const state = single('[2026-09-07]\n- [ ] A\n  - 메모: A 메모\n  - 시간: 10:00\n일반 기록\n- [ ] B'); const next = model.removeTask(state, 'line-1');
  assert.equal(model.raw(next.documents[0]), '[2026-09-07]\n일반 기록\n- [ ] B'); assert.equal(only(next).id, 'line-5');
});

test('addDocument creates an independent empty source document', () => {
  const state = model.createState(); const next = model.addDocument(state, { title: '새 여행', folder: '여행' });
  assert.equal(next.documents.length, 3); assert.equal(next.documents[2].title, '새 여행'); assert.equal(next.documents[2].folder, '여행');
  assert.equal(next.documents[2].lines.length, 0); assert.equal(state.documents.length, 2); assert(model.validate(next));
});

test('missing targets and invalid mutation inputs are safe no-ops', () => {
  const state = single('- [ ] A');
  assert.equal(model.editText(state, 'missing', '다른 글'), state); assert.equal(model.updateTask(state, 'missing', { done: true }), state);
  assert.equal(model.removeTask(state, 'missing'), state); assert.equal(model.addTask(state, { docId: 'missing', title: 'A' }), state);
  for (const patch of [{ date: 'tomorrow' }, { title: '' }, { title: 'A\n- [ ] B' }, { done: 'yes' }, { unknown: true }, {}]) assert.equal(model.updateTask(state, 'line-0', patch), state);
});

test('period filters use effective dates inclusively and preserve document order', () => {
  const state = single('[2026-09-07]\n- [ ] A\n- [ ] B\n  - 날짜: 2026-09-08\n[2026-09-09]\n- [ ] C\n[미정]\n- [ ] D');
  assert.deepEqual(model.tasks(state, { from: '2026-09-07', to: '2026-09-08' }).map(t => t.title), ['A', 'B']);
  assert.deepEqual(model.tasks(state, { undatedOnly: true }).map(t => t.title), ['D']); assert.equal(model.tasks(state, { from: 'bad' }).length, 0);
  assert.equal(model.tasks(state, { from: '2026-09-09', to: '2026-09-07' }).length, 0);
});

test('note and time helpers insert attributes without changing ordinary notes or source tasks', () => {
  const state = single('일반 메모 보존\n- [ ] A\n- [ ] B');
  const next = model.updateTask(state, 'line-1', { note: '첫 줄\n둘째 줄', time: '10:30' });
  assert.equal(only(next).note, '첫 줄\n둘째 줄'); assert.equal(only(next).time, '10:30');
  assert.equal(next.documents[0].lines[0].text, '일반 메모 보존'); assert.equal(next.documents[0].lines[1].id, 'line-1');
  assert.equal(model.tasks(next)[1].note, ''); assert.equal(model.tasks(next)[1].id, 'line-2');
});

test('note and time updates retain existing attribute IDs and other properties', () => {
  const state = single('- [ ] A\n  - 메모: 이전\n  - 날짜: 2026-09-07\n  - 시간: 09:00');
  const next = model.updateTask(state, 'line-0', { note: '이후', time: '11:00' });
  assert.equal(only(next).note, '이후'); assert.equal(only(next).time, '11:00'); assert.equal(only(next).date, '2026-09-07');
  assert.deepEqual(next.documents[0].lines.map(l => l.id), state.documents[0].lines.map(l => l.id));
});

test('empty note and time remove only those attributes', () => {
  const state = single('- [ ] A\n  - 메모: A\n  - 날짜: 2026-09-07\n  - 시간: 09:00\n  - 메모: B\n일반 메모');
  const next = model.updateTask(state, 'line-0', { note: '', time: '' });
  assert.equal(model.raw(next.documents[0]), '- [ ] A\n  - 날짜: 2026-09-07\n일반 메모'); assert.equal(only(next).note, ''); assert.equal(only(next).time, null);
});

test('combined title completion date memo and time edit derives one coherent task', () => {
  const state = single('[2026-09-07]\n- [ ] A');
  const next = model.updateTask(state, 'line-1', { title: 'B', done: true, date: null, note: '확인', time: '08:00' });
  const task = only(next); assert.deepEqual([task.id, task.title, task.done, task.date, task.note, task.time], ['line-1', 'B', true, null, '확인', '08:00']);
});

test('invalid time helper values fail closed', () => {
  const state = single('- [ ] A'); for (const time of ['25:00', '9:30', null, 900]) assert.equal(model.updateTask(state, 'line-0', { time }), state);
});

test('Undo snapshots roundtrip exact source IDs placement and derived task values', () => {
  const before = model.createState(), snapshot = JSON.stringify(before), id = model.tasks(before)[0].id;
  const changed = model.updateTask(before, id, { title: '수정', done: true, date: '2026-09-10' }); assert.notDeepEqual(changed, before);
  const restored = JSON.parse(snapshot); assert(model.validate(restored)); assert.deepEqual(restored, before); assert.deepEqual(model.tasks(restored), model.tasks(before));
});

test('storage empty-key defaults are seeded without writes and valid state roundtrips', () => {
  const store = storage(), first = model.read(store); assert(first.ok); assert.deepEqual(first.state, model.createState()); assert.equal(first.serialized, null);
  assert.equal(store.calls.filter(c => c[0] === 'set').length, 0); const written = model.write(store, first.state, null); assert(written.ok);
  assert.deepEqual(model.read(store).state, first.state);
});

test('storage corruption unknown versions and unknown fields fail closed', () => {
  for (const value of ['{bad', 'null', JSON.stringify({ version: 2, documents: [] }), JSON.stringify({ version: 3, documents: [], tasks: [] })]) {
    const store = storage({ [model.KEY]: value }), loaded = model.read(store); assert.equal(loaded.ok, false); assert.equal(loaded.state, null);
    assert.equal(store.data.get(model.KEY), value); assert.equal(store.calls.filter(c => c[0] === 'set').length, 0);
  }
});

test('strict schema rejects duplicate IDs invalid types and embedded newlines', () => {
  for (const mutate of [s => { s.documents[0].lines[1].id = s.documents[0].id; }, s => { s.documents[1].id = s.documents[0].id; },
    s => { s.documents[0].lines[0].text = 'A\nB'; }, s => { s.documents[0].title = 7; }, s => { s.documents[0].lines[0].extra = true; }]) {
    const state = model.createState(); mutate(state); assert(!model.validate(state));
  }
});

test('storage conflicts preserve the newer serialized state', () => {
  const store = storage({ [model.KEY]: 'newer' }); assert.equal(model.write(store, model.createState(), null).reason, 'conflict');
  assert.equal(store.data.get(model.KEY), 'newer'); assert.equal(store.calls.filter(c => c[0] === 'set').length, 0);
});

test('read errors quota failures and lost writes report failure', () => {
  assert.equal(model.read({ getItem() { throw new Error('blocked'); } }).reason, 'storage-unavailable');
  assert.equal(model.write({ getItem() { return null; }, setItem() { throw new Error('quota'); } }, model.createState(), null).reason, 'storage-unavailable');
  assert.equal(model.write({ getItem() { return null; }, setItem() {} }, model.createState(), null).reason, 'readback-failed');
  assert.equal(model.write(storage(), { version: 2 }, null).reason, 'invalid-state');
});

test('all storage access stays on the v8 review key and preserves operating sentinels', () => {
  const store = storage({ 'flow:operating': 'PRIVATE_SENTINEL', other: 'UNCHANGED' }); const first = model.read(store);
  model.write(store, first.state, first.serialized); model.read(store);
  assert(store.calls.every(c => c[1] === model.KEY)); assert.equal(store.data.get('flow:operating'), 'PRIVATE_SENTINEL'); assert.equal(store.data.get('other'), 'UNCHANGED');
});

function appendLine(state, docId, line = '') {
  const doc = model.getDocument(state, docId);
  return model.editText(state, docId, model.raw(doc) + '\n' + line);
}
function linkedFixture(options = {}) {
  let state = model.createState();
  // Legacy checkbox regressions deliberately exercise untracked Tasks. v8 tracked
  // completion/record coherence is verified separately below, using the real seed.
  state.progressRecords = [];
  const source = model.scopeTasks(state, 'flow-move-d30')[0];
  state = appendLine(state, 'd-life');
  const doc = model.getDocument(state, 'd-life');
  state = model.linkTask(state, 'd-life', doc.lines.length - 1, source.id, options);
  assert(model.validate(state));
  return { state, taskId: source.id, lineId: state.bindings.find(b => b.kind === 'task' && b.docId === 'd-life').lineId };
}

test('old at-date syntax is ordinary text and never starts a date section', () => {
  const result = parse('@2026-09-07\n- [ ] A\n[2026-09-08]\n@미정\n- [ ] B');
  assert.deepEqual(result.tasks.map(t => t.date), [null, '2026-09-08']); assert.equal(result.rows[0].kind, 'note');
});

test('linkTask keeps original dates by default and never duplicates the global task', () => {
  const before = model.createState(); const fixture = linkedFixture();
  assert.equal(model.tasks(fixture.state).length, model.tasks(before).length);
  const row = model.rowMeta(fixture.state, 'd-life').find(r => r.id === fixture.lineId);
  assert(row.isReference); assert.equal(row.taskId, fixture.taskId); assert.equal(row.date, '2026-09-08'); assert.equal(row.dateMode, 'keep');
});

test('explicit apply-date linking changes one original date and keeps the source in place', () => {
  const fixture = linkedFixture({ dateMode: 'apply', date: '2026-09-07' });
  const task = model.tasks(fixture.state).find(t => t.id === fixture.taskId);
  assert.equal(task.date, '2026-09-07'); assert.equal(task.groupDate, '2026-09-08'); assert.equal(task.sourceIndex, 2);
  assert(model.raw(model.getDocument(fixture.state, task.docId)).includes('  - 날짜: 2026-09-07'));
});

test('raw reference title and completion edits update their canonical source', () => {
  const { state, taskId, lineId } = linkedFixture(), doc = model.getDocument(state, 'd-life');
  const text = doc.lines.map(l => l.id === lineId ? '- [x] 원문에서 고친 제목' : l.text).join('\n');
  const next = model.editText(state, doc.id, text); assert.notEqual(next, state);
  const task = model.tasks(next).find(t => t.id === taskId); assert.equal(task.title, '원문에서 고친 제목'); assert(task.done); assert.equal(task.note, '같은 조건으로 견적 받기');
});

test('raw canonical title edits refresh references without changing reference identity', () => {
  const { state, taskId, lineId } = linkedFixture(), task = model.tasks(state).find(t => t.id === taskId), doc = model.getDocument(state, task.docId);
  const text = doc.lines.map(l => l.id === taskId ? '- [ ] 바꾼 원본' : l.text).join('\n');
  const next = model.editText(state, doc.id, text); assert.notEqual(next, state);
  assert.equal(model.getDocument(next, 'd-life').lines.find(l => l.id === lineId).text, '- [ ] 바꾼 원본');
});

test('unlink removes a reference line while preserving original source and task values', () => {
  const { state, taskId, lineId } = linkedFixture(), original = model.tasks(state).find(t => t.id === taskId);
  const next = model.unlink(state, 'd-life', lineId); assert(!model.getDocument(next, 'd-life').lines.some(l => l.id === lineId));
  assert.deepEqual(model.tasks(next).find(t => t.id === taskId), original);
});

test('raw reference deletion unlinks without deleting the original task', () => {
  const { state, taskId, lineId } = linkedFixture(), doc = model.getDocument(state, 'd-life');
  const next = model.editText(state, doc.id, doc.lines.filter(l => l.id !== lineId).map(l => l.text).join('\n'));
  assert.notEqual(next, state); assert(model.tasks(next).some(t => t.id === taskId)); assert(!next.bindings.some(b => b.lineId === lineId));
});

test('canonical task deletion is refused while another document references it', () => {
  const { state, taskId } = linkedFixture(), task = model.tasks(state).find(t => t.id === taskId), doc = model.getDocument(state, task.docId);
  assert.equal(model.removeTask(state, taskId), state);
  assert.equal(model.editText(state, doc.id, doc.lines.filter(l => l.id !== taskId).map(l => l.text).join('\n')), state);
});

test('reference direct properties remain blocked until their ownership semantics are defined', () => {
  const { state, lineId } = linkedFixture(), doc = model.getDocument(state, 'd-life');
  const text = doc.lines.map(l => l.text + (l.id === lineId ? '\n  - 날짜: 2026-09-10' : '')).join('\n');
  assert.equal(model.editText(state,doc.id,text),state);
});

test('restoring a task date removes only individual overrides and keeps notes and subchecks', () => {
  const state = single('[2026-09-07]\n- [ ] A\n  - [x] 하위\n  - 날짜: 2026-09-09\n  - 메모: 보존');
  const next = model.restoreTaskDate(state, 'line-1');
  assert.equal(only(next).date, '2026-09-07'); assert.equal(only(next).note, '보존'); assert.equal(only(next).subchecks.length, 1);
  assert.equal(next.documents[0].lines[1].id, 'line-1');
});

test('Flow rename preserves fixture provenance and allows lookup by its existing ID', () => {
  const state = model.createState(), next = model.renameScope(state, 'flow-move-d30', '나의 이사 순서');
  assert.equal(model.getDocument(next, 'flow-move-d30').title, '나의 이사 순서');
  assert.equal(model.getDocument(next, 'flow-move-d30').sourceVersion, state.flows[0].sourceVersion);
  assert.equal(model.scopeTasks(next, 'flow-move-d30').length, 2);
});

test('blank document title and a new unfiled folder are supported', () => {
  const next = model.addDocument(model.createState(), { title: '', folder: '미분류' });
  assert.equal(next.documents[2].title, '새 문서'); assert.equal(next.documents[2].folder, '미분류'); assert(model.validate(next));
});

test('sidecars reject dangling targets duplicate bindings and reference chains', () => {
  const fixture = linkedFixture();
  for (const mutate of [s => { s.bindings.find(b => b.kind === 'task').taskId = 'missing'; },
    s => { s.bindings.push(clone(s.bindings[0])); }, s => { s.taskScopes.extra = 'folder-life'; },
    s => { s.bindings.find(b => b.kind === 'task').taskId = fixture.lineId; },
    s => { s.folders[0].parentId = s.folders[0].id; }]) {
    const state = clone(fixture.state); mutate(state); assert(!model.validate(state));
  }
});

test('scope and task pickers refuse code fences or substantive source replacement', () => {
  let state = model.createState(); state = appendLine(state, 'd-life', '일반 메모 보존\n~~~\n-\n~~~');
  const doc = model.getDocument(state, 'd-life'), task = model.tasks(state)[0];
  const note = doc.lines.findIndex(l => l.text === '일반 메모 보존'), fenced = doc.lines.findIndex(l => l.text === '-');
  assert.equal(model.attachScope(state, doc.id, note, 'folder-box'), state); assert.equal(model.linkTask(state, doc.id, fenced, task.id), state);
});

test('linked source and sidecars survive exact Undo and storage roundtrip', () => {
  const fixture = linkedFixture(), snapshot = JSON.stringify(fixture.state);
  const changed = model.updateTask(fixture.state, fixture.taskId, { done: true, date: null }); assert.notDeepEqual(changed, fixture.state);
  const restored = JSON.parse(snapshot); assert(model.validate(restored)); assert.deepEqual(model.tasks(restored), model.tasks(fixture.state));
  const store = storage(); assert(model.write(store, restored, null).ok); assert.deepEqual(model.read(store).state, restored);
});


test('unequal ambiguous bulk rewrites are refused without collapsing task identities', () => {
  const state = single('- [ ] A\n- [ ] B'); assert.equal(model.editText(state, 'doc-1', '- [ ] C'), state);
});

test('splitting one task into a task and ordinary note preserves its unique task identity', () => {
  const state = single('- [ ] 긴 할 일'); const next = model.editText(state, 'doc-1', '- [ ] 긴\n할 일');
  assert.notEqual(next, state); assert.equal(only(next).id, 'line-0'); assert.equal(only(next).title, '긴');
});

test('conflicting raw edits to two references reject the whole edit', () => {
  let { state, taskId } = linkedFixture(); state = appendLine(state, 'd-life', '사이 메모\n');
  const index = model.getDocument(state, 'd-life').lines.length - 1; state = model.linkTask(state, 'd-life', index, taskId);
  const refs = state.bindings.filter(b => b.kind === 'task' && b.docId === 'd-life'), doc = model.getDocument(state, 'd-life');
  const text = doc.lines.map(l => l.id === refs[0].lineId ? '- [ ] A' : l.id === refs[1].lineId ? '- [ ] B' : l.text).join('\n');
  assert.equal(model.editText(state, doc.id, text), state);
});

test('addTask rejects unknown explicit scopes without writing source', () => {
  const state = model.createState();
  for (const scopeId of ['missing', '', null, undefined]) assert.equal(model.addTask(state, { docId: 'd-life', title: 'A', date: null, scopeId }), state);
});

test('subcheck completion changes only the chosen child line and preserves parent completion and every ID', () => {
  const state = single('- [ ] 부모\n  - [ ] 첫째  \n  - [x] 둘째\n  - 메모: 그대로'); const before = clone(state);
  const next = model.updateSubcheck(state, 'doc-1', 'line-1', true);
  assert.notEqual(next, state); assert.deepEqual(state, before); assert.equal(only(next).done, false);
  assert.deepEqual(only(next).subchecks.map(child => [child.id, child.done]), [['line-1', true], ['line-2', true]]);
  assert.equal(next.documents[0].lines[1].text, '  - [x] 첫째  ');
  assert.deepEqual(next.documents[0].lines.filter((line, index) => line.text !== state.documents[0].lines[index].text).map(line => line.id), ['line-1']);
  assert.deepEqual(next.documents[0].lines.map(line => line.id), state.documents[0].lines.map(line => line.id));
  assert.equal(model.updateSubcheck(next, 'doc-1', 'line-1', true), next);
});

test('reopening a child does not reopen its completed parent or other children', () => {
  const state = single('- [x] 부모\n  - [X] 첫째\n  - [x] 둘째');
  const next = model.updateSubcheck(state, 'doc-1', 'line-1', false);
  assert(only(next).done); assert.deepEqual(only(next).subchecks.map(child => child.done), [false, true]);
  const row = model.rowMeta(next, 'doc-1').find(entry => entry.id === 'line-1');
  assert.equal(row.subcheckId, 'line-1'); assert.equal(row.taskId, 'line-0'); assert.equal(row.done, false);
});

test('subcheck edits to canonical source preserve all parent reference lines', () => {
  let { state, taskId, lineId } = linkedFixture(); const task = model.tasks(state).find(entry => entry.id === taskId);
  const doc = model.getDocument(state, task.docId);
  state = model.editText(state, doc.id, doc.lines.map(line => line.text + (line.id === taskId ? '\n  - [ ] 견적 항목 확인' : '')).join('\n'));
  const child = model.tasks(state).find(entry => entry.id === taskId).subchecks[0];
  const referenceBefore = model.getDocument(state, 'd-life').lines.find(line => line.id === lineId);
  const next = model.updateSubcheck(state, doc.id, child.id, true);
  assert.notEqual(next, state); assert.equal(model.tasks(next).find(entry => entry.id === taskId).done, false);
  assert.deepEqual(model.getDocument(next, 'd-life').lines.find(line => line.id === lineId), referenceBefore);
  assert.equal(model.tasks(next).filter(entry => entry.id === taskId).length, 1);
});

test('reference-local subchecks remain local and cannot toggle their original parent', () => {
  const { state, taskId, lineId } = linkedFixture(), doc = model.getDocument(state, 'd-life');
  const text = doc.lines.map(line => line.text + (line.id === lineId ? '\n  - [ ] 로컬 하위 체크' : '')).join('\n');
  const next=model.editText(state,doc.id,text); assert.notEqual(next,state); assert.deepEqual(next.flows,state.flows);
  assert.equal(model.updateSubcheck(state, doc.id, lineId, true), state);
  assert.equal(model.updateSubcheck(state, doc.id, taskId, true), state);
  assert.equal(model.tasks(state).find(task => task.id === taskId).done, false);
});

test('subcheck API refuses orphan rows protected code invalid targets and nonboolean values', () => {
  const state = single('  - [ ] 주인 없음\n~~~\n  - [ ] 코드\n~~~\n- [ ] 부모\n  - [ ] 실제');
  for (const lineId of ['line-0', 'line-2', 'line-4', 'missing']) assert.equal(model.updateSubcheck(state, 'doc-1', lineId, true), state);
  assert.equal(model.updateSubcheck(state, 'missing', 'line-5', true), state);
  assert.equal(model.updateSubcheck(state, 'doc-1', 'line-5', 'true'), state);
});
function outline(text, selected = {}) {
  const state = model.createState();
  const doc = { id: 'outline', title: '계층 검사', folder: '미분류', folderId: 'folder-unfiled',
    lines: text.split('\n').map((text, i) => ({ id: 'o-' + i, text })) };
  state.documents = [doc];
  state.bindings = Object.entries(selected).map(([i, scopeId]) => ({ kind: 'scope', docId: doc.id, lineId: 'o-' + i, scopeId }));
  state.taskScopes = {}; state.itemScopes = {};
  for (const source of state.documents.concat(state.flows)) {
    const parsed = model.parseDocument(source, state);
    for (const task of parsed.tasks) state.taskScopes[task.id] = parsed.rows[task.sourceIndex].ancestorScopeId || (source.private ? source.id : source.folderId);
    for (const item of parsed.items) state.itemScopes[item.id] = parsed.rows[item.sourceIndex].ancestorScopeId || (source.private ? source.id : source.folderId);
  }
  assert(model.validate(state), JSON.stringify(model.parseDocument(doc, state).issues));
  return state;
}
function outlineTasks(state) { return model.tasks(state).filter(task => task.docId === 'outline'); }
function metadata(state, id) { return model.rowMeta(state, 'outline').find(row => row.id === id); }

test('v8 seed shows a root task nested folders subcheck and two imported private Flow references in twelve lines', () => {
  const state = model.createState(), doc = state.documents[0], rows = model.rowMeta(state, doc.id);
  assert.equal(state.version, 11); assert.equal(doc.folderId, 'folder-unfiled'); assert.equal(doc.lines.length, 12);
  assert.equal(model.tasks(state).length, 7); assert.equal(rows.filter(row => row.isReference).length, 2);
  assert.deepEqual(rows.slice(1, 10).map(row => row.depth), [0, 0, 1, 1, 2, 3, 1, 2, 2]);
  assert.equal(rows[6].kind, 'subcheck'); assert.equal(rows[6].taskId, 'd-move-line-6');
  assert.equal(model.scopeTasks(state, 'folder-move').length, 4);
  assert.equal(model.scopeTasks(state, 'folder-box').length, 1);
  assert.equal(model.scopeTasks(state, 'flow-move-d30').length, 2);
  assert.equal(state.flows[0].private, true); assert.equal(state.flows[0].sourceVersion, 'fixture v1 · 개인 복사본');
});

test('confirmed scope membership uses strict ancestors instead of preceding sibling labels', () => {
  const state = outline('[2026-09-07]\n- 이사 준비\n  - [ ] 소속됨\n- [ ] 독립', { 1: 'folder-move' });
  assert.deepEqual(outlineTasks(state).map(t => t.scopeId), ['folder-move', 'folder-unfiled']);
  assert.equal(metadata(state, 'o-2').ancestorScopeId, 'folder-move');
  assert.equal(metadata(state, 'o-3').ancestorScopeId, null);
});

test('blank lines preserve scope stacks while dedent and date sections terminate scope ancestors', () => {
  const state = outline('[2026-09-07]\n- 이사 준비\n\n  - [ ] A\n- [ ] B\n[2026-09-08]\n- [ ] C', { 1: 'folder-move' });
  assert.deepEqual(outlineTasks(state).map(t => [t.scopeId, t.date]), [['folder-move', '2026-09-07'], ['folder-unfiled', '2026-09-07'], ['folder-unfiled', '2026-09-08']]);
  assert.equal(model.insertionContext(state, 'outline', 3, 1).scopeId, 'folder-move');
  assert.equal(model.insertionContext(state, 'outline', 4, 0).scopeId, null);
  assert.equal(model.insertionContext(state, 'outline', 6, 0).scopeId, null);
});

test('row metadata exposes exact ancestor guides parents and exclusive subtree boundaries', () => {
  const state = model.createState(), rows = model.rowMeta(state, 'd-move');
  assert.equal(rows[2].subtreeEndIndex, 10); assert.equal(rows[1].subtreeEndIndex, 2);
  assert.deepEqual(rows[5].guideLevels, [0, 1]); assert.equal(rows[5].parentLineId, 'd-move-line-5');
  assert.equal(rows[5].ancestorScopeId, 'folder-box');
  assert.equal(rows[6].parentLineId, 'd-move-line-6'); assert.equal(rows[6].scopeMismatch, false);
});

test('insertionContext observes the requested future depth rather than the row currently occupying the index', () => {
  const state = model.createState();
  assert.equal(model.insertionContext(state, 'd-move', 4, 1).scopeId, 'folder-move');
  assert.equal(model.insertionContext(state, 'd-move', 4, 2).parentLineId, 'd-move-line-4');
  assert.equal(model.insertionContext(state, 'd-move', 4, 0).scopeId, null);
  assert.equal(model.insertionContext(state, 'd-move', 4, 4).valid, false);
  assert.equal(model.insertionContext(state, 'missing', 0, 0).valid, false);
});

test('ordinary bullets and headings remain ordinary parents while explicit checkboxes become Tasks', () => {
  const state = outline('- 이사 준비\n  - [ ] 해석하지 않음\n## 제목\n  - [ ] 이것도 메모');
  assert.equal(outlineTasks(state).length, 2); assert.equal(state.bindings.length, 0);
  assert.equal(metadata(state, 'o-1').kind, 'task'); assert.equal(metadata(state, 'o-1').ancestorScopeId, null);
  assert.equal(model.parseDocument(state.documents[0]).tasks.length, 2);
});

test('checkbox below a task is a subcheck while a sibling checkbox below folder is a canonical task', () => {
  const state = outline('- 이사 준비\n  - [ ] A\n    - [ ] A 하위\n  - [ ] B', { 0: 'folder-move' });
  assert.deepEqual(outlineTasks(state).map(t => t.title), ['A', 'B']);
  assert.deepEqual(outlineTasks(state)[0].subchecks.map(t => t.id), ['o-2']);
  assert.equal(metadata(state, 'o-2').kind, 'subcheck');
});

test('nested task properties live exactly one level below their owning Task', () => {
  const state = outline('[2026-09-07]\n- 이사 준비\n  - 박스 준비\n    - [ ] A\n      - 메모: 유지\n      - [ ] 하위', { 1: 'folder-move', 2: 'folder-box' });
  const next = model.updateTask(state, 'o-3', { date: '2026-09-09', time: '09:30', note: '새 메모' });
  assert.notEqual(next, state); assert.equal(outlineTasks(next)[0].date, '2026-09-09');
  const properties = model.rowMeta(next, 'outline').filter(row => row.kind === 'property');
  assert(properties.every(row => row.depth === 3 && row.taskId === 'o-3'));
  assert.equal(outlineTasks(next)[0].subchecks[0].id, 'o-5');
});

test('odd spaces tabs indentation jumps and nested date sections fail closed', () => {
  const state = single('- [ ] A');
  for (const text of [' - [ ] A', '\t- [ ] A', '    - [ ] A', '- [ ] A\n  [2026-09-07]']) assert.equal(model.editText(state, 'doc-1', text), state, text);
});

test('depth five structure and direct properties are supported', () => {
  let state = outline('- 이사 준비\n  - 박스 준비\n    -\n', { 0: 'folder-move', 1: 'folder-box' });
  state = model.createFolderAt(state, 'outline', 2, '세부 박스');
  const folder = state.folders.find(f => f.title === '세부 박스');
  assert(folder);
  const flow = Object.assign({}, clone(state.flows[0]), { id: 'flow-deep', folderId: folder.id, folder: folder.title,
    lines: [{ id: 'deep-source', text: '- [ ] 깊은 원본' }] });
  state = Object.assign({}, state, { flows: state.flows.concat([flow]), taskScopes: Object.assign({}, state.taskScopes, { 'deep-source': flow.id }), itemScopes: Object.assign({}, state.itemScopes, { 'deep-source': flow.id }) });
  state = model.editText(state, 'outline', model.raw(state.documents[0]).trimEnd() + '\n      -');
  state = model.attachScope(state, 'outline', 3, flow.id);
  state = model.editText(state, 'outline', model.raw(state.documents[0]) + '\n        - [ ] 깊은 할 일');
  const task = outlineTasks(state)[0]; assert(task); assert.equal(task.depth, 4);
  const changed = model.updateTask(state, task.id, { date: '2026-09-09', note: '깊은 속성', time: '10:00' });
  assert.notEqual(changed, state); assert(model.validate(changed));
  assert(model.rowMeta(changed, 'outline').filter(row => row.kind === 'property').every(row => row.depth === 5));
  assert.notEqual(model.editText(state, 'outline', model.raw(state.documents[0]) + '\n          - [ ] 더 깊음'), state);
});

test('attachScope keeps indentation and allows existing folders with a different catalog parent', () => {
  const state = outline('- 이사 준비\n  -', { 0: 'folder-move' });
  const next = model.attachScope(state, 'outline', 1, 'folder-box');
  assert.notEqual(next, state); assert.equal(next.documents[0].lines[1].text, '  - 박스 준비');
  assert.deepEqual(next.folders, state.folders);
  assert.notEqual(model.attachScope(state, 'outline', 1, 'folder-life'), state);
});

test('scope under Flow or Task and a foreign Flow under a child folder are local placements', () => {
  const underFlow = outline('- 이사 D-30\n  -', { 0: 'flow-move-d30' });
  assert.notEqual(model.attachScope(underFlow, 'outline', 1, 'folder-box'), underFlow);
  const underTask = outline('- [ ] A\n  -');
  assert.notEqual(model.attachScope(underTask, 'outline', 1, 'folder-box'), underTask);
  const underBox = outline('- 박스 준비\n  -', { 0: 'folder-box' });
  assert.notEqual(model.attachScope(underBox, 'outline', 1, 'flow-move-d30'), underBox);
});

test('createFolderAt explicitly creates a catalog child and binding atomically', () => {
  const state = outline('- 이사 준비\n  -', { 0: 'folder-move' }), snapshot = clone(state);
  const next = model.createFolderAt(state, 'outline', 1, '서류');
  assert.notEqual(next, state); assert.deepEqual(state, snapshot);
  const child = next.folders.find(folder => folder.title === '서류');
  assert.equal(child.parentId, 'folder-move');
  assert.equal(next.bindings.find(binding => binding.lineId === 'o-1').scopeId, child.id);
  assert.equal(next.documents[0].lines[1].text, '  - 서류');
});

test('new folders reject duplicate sibling names blank names and catalog depth beyond three levels', () => {
  const state = outline('- 이사 준비\n  -', { 0: 'folder-move' });
  assert.equal(model.createFolderAt(state, 'outline', 1, '박스 준비'), state);
  assert.equal(model.createFolderAt(state, 'outline', 1, ' '), state);
  let deep = outline('- 박스 준비\n  -', { 0: 'folder-box' });
  deep = model.createFolderAt(deep, 'outline', 1, '세부');
  deep = model.editText(deep, 'outline', model.raw(deep.documents[0]) + '\n    -');
  assert.equal(model.createFolderAt(deep, 'outline', 2, '너무 깊음'), deep);
});

test('same-name folders in different parents are allowed and addDocument resolves exact folder IDs', () => {
  let state = outline('- 이사 준비\n  -', { 0: 'folder-move' });
  state = model.createFolderAt(state, 'outline', 1, '일상');
  const sameName = state.folders.find(folder => folder.title === '일상' && folder.parentId === 'folder-move');
  assert(sameName);
  assert.equal(model.addDocument(state, { title: '애매함', folder: '일상' }), state);
  const next = model.addDocument(state, { title: '', folderId: sameName.id });
  assert.equal(next.documents[1].folderId, sameName.id); assert.equal(next.documents[1].title, '새 문서');
  assert.equal(model.addDocument(state, { title: '', folderId: 'missing' }), state);
});

test('importFlowTasks inserts missing references one level below its scope without copying canonical tasks', () => {
  const state = outline('[2026-09-07]\n- 이사 준비\n  - 이사 D-30', { 1: 'folder-move', 2: 'flow-move-d30' });
  const originals = model.tasks(state), flow = clone(state.flows[0]);
  const next = model.importFlowTasks(state, 'outline', 'o-2');
  assert.notEqual(next, state); assert.equal(model.tasks(next).length, originals.length);
  assert.deepEqual(model.tasks(next), originals); assert.deepEqual(next.flows[0], flow);
  assert.deepEqual(model.rowMeta(next, 'outline').filter(row => row.isReference).map(row => [row.depth, row.date, row.dateMode]),
    [[2, '2026-09-08', 'keep'], [2, null, 'keep']]);
  assert.equal(next.bindings.filter(binding => binding.kind === 'task').length, 2);
});

test('Flow import is idempotent and only fills missing original task references', () => {
  let state = model.createState();
  assert.equal(model.importFlowTasks(state, 'd-move', 'd-move-line-8'), state);
  state = model.unlink(state, 'd-move', 'd-move-line-9');
  const before = clone(state.flows);
  const next = model.importFlowTasks(state, 'd-move', 'd-move-line-8');
  assert.equal(next.bindings.filter(binding => binding.kind === 'task').length, 2);
  assert.deepEqual(next.flows, before);
  assert.equal(model.importFlowTasks(next, 'd-move', 'd-move-line-8'), next);
  assert.equal(model.importFlowTasks(next, 'd-move', 'd-move-line-3'), next);
});

test('untracked reference title and done edits synchronize the source and every reference while preserving indentation', () => {
  const state = model.createState(), doc = state.documents[0];
  state.progressRecords = [];
  const next = model.editText(state, doc.id, model.raw(doc).replace('    - [ ] 이사업체 견적 비교', '    - [x] 견적 확인 완료'));
  assert.notEqual(next, state);
  assert.equal(model.tasks(next).find(task => task.id === 'flow-move-d30-line-3').done, true);
  assert.equal(next.documents[0].lines.find(line => line.id === 'd-move-line-9').text, '    - [x] 견적 확인 완료');
  assert.equal(next.flows[0].lines[2].text, '- [x] 견적 확인 완료');
  assert.equal(model.tasks(next).length, 7);
});

test('references allow local child checks but reject direct properties without editing their original', () => {
  const state=model.createState(),raw=model.raw(state.documents[0]);
  for(const line of ['      - 날짜: 2026-09-10','      - 메모: 로컬','      - [ ] 로컬']) {
    const next=model.editText(state,'d-move',raw.replace('    - [ ] 이사업체 견적 비교','    - [ ] 이사업체 견적 비교\n'+line));
    if(line.includes('[ ]')) { assert.notEqual(next,state); assert(model.raw(next.documents[0]).includes(line)); }
    else assert.equal(next,state);
    assert.deepEqual(next.flows,state.flows);
  }
});

test('unlink unwraps a nested scope and outdents every descendant while pinning task IDs owners and dates', () => {
  const state = model.createState(), beforeTask = model.tasks(state).find(task => task.id === 'd-move-line-6');
  const next = model.unlink(state, 'd-move', 'd-move-line-5');
  assert.notEqual(next, state); assert(model.validate(next));
  assert.equal(next.documents[0].lines.find(line => line.id === 'd-move-line-6').text, '  - [ ] 박스 수량 세기');
  assert.equal(next.documents[0].lines.find(line => line.id === 'd-move-line-7').text, '    - [ ] 큰 박스 확인');
  const task = model.tasks(next).find(task => task.id === beforeTask.id);
  assert.deepEqual([task.scopeId, task.date, task.title], [beforeTask.scopeId, beforeTask.date, beforeTask.title]);
  assert.equal(model.rowMeta(next, 'd-move').find(row => row.id === task.id).scopeMismatch, true);
});

test('unlinking root scope preserves canonical values references catalog and private Flow source', () => {
  const state = model.createState(), next = model.unlink(state, 'd-move', 'd-move-line-3');
  assert.notEqual(next, state); assert.deepEqual(next.folders, state.folders); assert.deepEqual(next.flows, state.flows);
  assert.deepEqual(next.taskScopes, state.taskScopes);
  assert.equal(next.documents[0].lines.find(line => line.id === 'd-move-line-8').text, '- 이사 D-30');
  assert.equal(next.documents[0].lines.find(line => line.id === 'd-move-line-9').text, '  - [ ] 이사업체 견적 비교');
});

test('unlink unwraps a link without reparenting the catalog', () => {
  let state = outline('- 이사 준비\n  - 박스 준비\n    -', { 0: 'folder-move', 1: 'folder-box' });
  state = model.createFolderAt(state, 'outline', 2, '세부');
  const next=model.unlink(state,'outline','o-1'); assert.notEqual(next,state); assert.deepEqual(next.folders,state.folders);
});

test('raw scope header deletion retains canonical IDs and owners', () => {
  const state = model.createState(), text = model.raw(state.documents[0]).replace('  - 박스 준비\n', '');
  const next=model.editText(state,'d-move',text); assert.notEqual(next,state); assert.equal(next.taskScopes['d-move-line-6'],state.taskScopes['d-move-line-6']);
});

test('canonical planning survives nesting and children promote with the same stable ID', () => {
  const state=single('- [ ] A\n- [ ] B'), next=model.editText(state,'doc-1','- [ ] A\n  - [ ] B');
  assert.notEqual(next,state); assert.equal(model.tasks(next).length,2); assert.equal(model.rowMeta(next,'doc-1')[1].isCanonical,true);
  const child=single('- [ ] A\n  - [ ] B'), promoted=model.editText(child,'doc-1','- [ ] A\n- [ ] B');
  assert.notEqual(promoted,child); assert.equal(model.tasks(promoted).length,2); assert.equal(promoted.documents[0].lines[1].id,'line-1');
});

test('duplicate-title indentation-only transformations retain every positional task ID', () => {
  const state = single('- [ ] A\n- [ ] 같은 제목\n- [ ] 같은 제목');
  const next=model.editText(state,'doc-1','- [ ] A\n  - [ ] 같은 제목\n  - [ ] 같은 제목');
  assert.notEqual(next,state);assert.deepEqual(next.documents[0].lines.map(l=>l.id),state.documents[0].lines.map(l=>l.id));assert.equal(model.tasks(next).length,3);
});

test('outdenting an existing task retains its captured owner and exposes its scope mismatch', () => {
  const state = outline('- 이사 준비\n  - [ ] A', { 0: 'folder-move' });
  const next = model.editText(state, 'outline', '- 이사 준비\n- [ ] A');
  assert.notEqual(next, state); assert.equal(outlineTasks(next)[0].id, 'o-1');
  assert.equal(outlineTasks(next)[0].scopeId, 'folder-move'); assert.equal(metadata(next, 'o-1').scopeMismatch, true);
});

test('moving an existing task across unchanged date sections inserts an exception and preserves its effective date', () => {
  const state = single('[2026-09-07]\n- [ ] A\n[2026-09-08]\n- [ ] B');
  const next = model.editText(state, 'doc-1', '[2026-09-07]\n[2026-09-08]\n- [ ] B\n- [ ] A');
  assert.notEqual(next, state);
  const task = model.tasks(next).find(task => task.id === 'line-1');
  assert.equal(task.date, '2026-09-07'); assert.equal(task.groupDate, '2026-09-08');
  assert(model.raw(next.documents[0]).includes('- [ ] A\n  - 날짜: 2026-09-07'));
});

test('editing a date header directly remains an explicit date edit rather than a structural move', () => {
  const state = single('[2026-09-07]\n- [ ] A');
  const next = model.editText(state, 'doc-1', '[2026-09-08]\n- [ ] A');
  assert.equal(only(next).date, '2026-09-08'); assert.equal(next.documents[0].lines.length, 2);
});

test('period addTask explicitly picks document ownership without accidentally inheriting a preceding Flow', () => {
  const state = model.createState(), next = model.addTask(state, { docId: 'd-move', title: '문서 새 할 일', date: '2026-09-07', scopeId: 'folder-unfiled' });
  const task = model.tasks(next).find(task => task.title === '문서 새 할 일');
  assert(task); assert.equal(task.scopeId, 'folder-unfiled'); assert.equal(task.depth, 0);
  const row = model.rowMeta(next, 'd-move').find(row => row.id === task.id);
  assert.equal(row.ancestorScopeId, null); assert.equal(row.scopeMismatch, false);
});

test('explicit nondefault addTask inserts under a confirmed matching scope and inherits the common date', () => {
  const state = model.createState(), next = model.addTask(state, { docId: 'd-move', title: '박스 추가', date: '2026-09-07', scopeId: 'folder-box' });
  const task = model.tasks(next).find(task => task.title === '박스 추가');
  assert.equal(task.scopeId, 'folder-box'); assert.equal(task.depth, 2); assert.equal(task.date, '2026-09-07');
  assert.equal(model.rowMeta(next, 'd-move').find(row => row.id === task.id).ancestorScopeId, 'folder-box');
  assert(!next.documents[0].lines.some(line => line.text.includes('- 날짜:')));
});

test('scope rename keeps nested indentation IDs and catalog parent while updating display labels', () => {
  const state = model.createState(), next = model.renameScope(state, 'folder-box', '포장 상자');
  assert.equal(next.documents[0].lines[4].text, '  - 포장 상자');
  assert.deepEqual(next.taskScopes, state.taskScopes); assert.deepEqual(next.bindings, state.bindings);
  assert.equal(next.folders.find(folder => folder.id === 'folder-box').parentId, 'folder-move');
});

test('v8 read ignores an older v5 key entirely with no migration or writes', () => {
  const store = storage({ 'flowme:ux-review:text-workspace-v5:20260907': 'older data', 'flow:operating': 'sentinel' });
  assert.equal(model.read(store).state.version, 11); assert.equal(store.calls.length, 1); assert.equal(store.calls[0][1], model.KEY);
  assert.equal(store.data.get('flowme:ux-review:text-workspace-v5:20260907'), 'older data');
});

test('catalog depth cycles missing parents and self-scope placement reject serialized state', () => {
  const base = model.createState();
  for (const mutate of [
    s => { s.folders.push({ id: 'f3', title: 'third', parentId: 'folder-box' }, { id: 'f4', title: 'fourth', parentId: 'f3' }); },
    s => { s.folders[0].parentId = 'missing'; },
    s => { s.bindings.find(binding => binding.scopeId === 'folder-box').scopeId = 'folder-move'; },
    s => { s.version = 4; }
  ]) {
    const state = clone(base); mutate(state); assert.equal(model.validate(state), false);
    const store = storage({ [model.KEY]: JSON.stringify(state) }); assert.equal(model.read(store).ok, false);
    assert.equal(model.write(storage(), state, null).reason, 'invalid-state');
  }
});

test('Undo snapshots restore hierarchy reference IDs and fixed ownership exactly after unlink and import', () => {
  const state = model.createState(); state.progressRecords = [];
  const snapshot = JSON.stringify(state);
  let next = model.unlink(state, 'd-move', 'd-move-line-8');
  assert.notEqual(next, state);
  next = model.updateTask(next, 'flow-move-d30-line-3', { done: true, date: null });
  const restored = JSON.parse(snapshot);
  assert(model.validate(restored)); assert.deepEqual(restored, state);
  assert.deepEqual(model.rowMeta(restored, 'd-move'), model.rowMeta(state, 'd-move'));
});

test('property updates never edit matching examples inside a fenced code block', () => {
  const state = single('- [ ] A\n  ~~~\n  - 날짜: 2030-01-01\n  - 메모: 코드 내용\n  ~~~\n  - 메모: 실제 메모');
  const next = model.updateTask(state, 'line-0', { date: '2026-09-07', note: '실제 수정' });
  assert.notEqual(next, state);
  assert(next.documents[0].lines.some(line => line.id === 'line-2' && line.text === '  - 날짜: 2030-01-01'));
  assert(next.documents[0].lines.some(line => line.id === 'line-3' && line.text === '  - 메모: 코드 내용'));
  assert.equal(only(next).date, '2026-09-07'); assert.equal(only(next).note, '실제 수정');
});

test('scope unwrap preserves protected code bytes including unindented contents', () => {
  const state = outline('- 이사 준비\n  ~~~\nconst original = 1;\n  - 날짜: 2030-01-01\n  ~~~\n  - [ ] A', { 0: 'folder-move' });
  const next = model.unlink(state, 'outline', 'o-0');
  assert.notEqual(next, state); assert.equal(next.documents[0].lines.find(line => line.id === 'o-2').text, 'const original = 1;');
  assert.equal(next.documents[0].lines.find(line => line.id === 'o-3').text, '  - 날짜: 2030-01-01');
  assert.equal(outlineTasks(next)[0].title, 'A'); assert.equal(outlineTasks(next)[0].scopeId, 'folder-move');
});

test('removing a task with fenced descendants removes the complete owned subtree but leaves the next task', () => {
  const state = single('- [ ] A\n  ~~~\nunindented code\n  ~~~\n- [ ] B');
  const next = model.removeTask(state, 'line-0');
  assert.notEqual(next, state); assert.equal(model.raw(next.documents[0]), '- [ ] B'); assert.equal(only(next).id, 'line-4');
});

test('ambiguous multiple new checkboxes remain blocked while unique structural replacements retain IDs', () => {
  const state = single('- [ ] A\n- [ ] B');
  assert.equal(model.editText(state, 'doc-1', '- [ ] A\n  - [ ] 새로운 B\n  - [ ] 새로운 C'), state);
  const next=model.editText(state,'doc-1','- [ ] A\n- 일반 bullet\n  - [ ] 새로운 B'); assert.notEqual(next,state); assert.equal(next.documents[0].lines[2].id,'line-1');
});

test('adding or removing date boundaries is structural and preserves existing task dates', () => {
  const state = single('[2026-09-07]\n- [ ] A\n- [ ] B');
  const next = model.editText(state, 'doc-1', '[2026-09-07]\n- [ ] A\n[2026-09-08]\n- [ ] B');
  assert.notEqual(next, state); assert.equal(model.tasks(next)[1].date, '2026-09-07');
  assert.equal(model.tasks(next)[1].groupDate, '2026-09-08');
  const removed = model.editText(state, 'doc-1', '- [ ] A\n- [ ] B');
  assert.notEqual(removed, state); assert.deepEqual(model.tasks(removed).map(task => task.date), ['2026-09-07', '2026-09-07']);
});

test('new nested tasks capture their ancestor once and are not confused with imported references', () => {
  const state = model.createState(), text = model.raw(state.documents[0]).replace('  - 이사 D-30', '  - 이사 D-30\n    - [ ] 새 개인 실행');
  const next = model.editText(state, 'd-move', text), task = model.tasks(next).find(task => task.title === '새 개인 실행');
  assert(task); assert.equal(task.scopeId, 'flow-move-d30'); assert.equal(task.docId, 'd-move');
  assert.equal(task.date, '2026-09-07'); assert.equal(model.tasks(next).length, 8);
  assert.equal(next.bindings.filter(binding => binding.kind === 'task').length, 2);
  assert.deepEqual(next.flows, state.flows);
});

function stableTaskValues(state) {
  return model.tasks(state).map(t => ({
    id:t.id,docId:t.docId,title:t.title,done:t.done,date:t.date,note:t.note,time:t.time,scopeId:t.scopeId,
    subchecks:t.subchecks.slice().sort((a,b)=>a.id.localeCompare(b.id))
  })).sort((a,b)=>a.id.localeCompare(b.id));
}
function assertMovedSafely(before, after, docId) {
  assert.notEqual(after,before); assert(model.validate(after));
  const values=s=>s.documents.concat(s.flows).flatMap(d=>model.parseDocument(d,s).items).map(t=>({id:t.id,title:t.title,done:t.done,date:t.date,note:t.note,time:t.time})).sort((a,b)=>a.id.localeCompare(b.id));
  assert.deepEqual(values(after),values(before));
  for(const id of Object.keys(before.taskScopes)) assert.equal(after.taskScopes[id],before.taskScopes[id]);
  assert.deepEqual(after.itemScopes,before.itemScopes); assert.deepEqual(after.progressRecords,before.progressRecords); assert.deepEqual(after.bindings,before.bindings);
  assert.deepEqual(after.folders,before.folders);
  const oldDoc=model.getDocument(before,docId),newDoc=model.getDocument(after,docId);
  for(const line of oldDoc.lines) assert.equal(newDoc.lines.find(next=>next.id===line.id).text.trimStart(),line.text.trimStart());
  for(const source of before.documents.concat(before.flows)) if(source.id!==docId) assert.deepEqual(model.getDocument(after,source.id),source);
}
test('move selection identifies task descendants but excludes its next sibling and trailing blank separator',()=>{
  const state=single('- [ ] A\n  - [ ] 자식\n    하위 메모\n  - 메모: 속성\n\n- [ ] B');
  const selected=model.selectionForMove(state,'doc-1','line-0');
  assert.deepEqual(selected,{lineId:'line-0',startIndex:0,endIndex:4,depth:0,label:'A',descendantCount:3,
    lineIds:['line-0','line-1','line-2','line-3'],kind:'task'});
});
test('scope selection includes nested folders Tasks and references exactly once',()=>{
  const state=model.createState(),selected=model.selectionForMove(state,'d-move','d-move-line-3');
  assert.equal(selected.kind,'scope');assert.equal(selected.label,'이사 준비');
  assert.equal(selected.startIndex,2);assert.equal(selected.endIndex,10);assert.equal(selected.descendantCount,7);
  assert.deepEqual(selected.lineIds,state.documents[0].lines.slice(2,10).map(line=>line.id));
});
test('reference selection uses its local line ID rather than its source Task ID',()=>{
  const state=model.createState(),selected=model.selectionForMove(state,'d-move','d-move-line-9');
  assert.equal(selected.kind,'reference');assert.equal(selected.lineId,'d-move-line-9');assert.equal(selected.descendantCount,0);
  assert.equal(model.selectionForMove(state,'d-move','flow-move-d30-line-3'),null);
});
test('subcheck selection includes its own nested notes and child checks only',()=>{
  const state=single('- [ ] 부모\n  - [ ] 첫째\n    - [ ] 손자\n    메모\n  - [ ] 둘째');
  const selected=model.selectionForMove(state,'doc-1','line-1');
  assert.equal(selected.kind,'subcheck');assert.equal(selected.depth,1);assert.equal(selected.endIndex,4);assert.equal(selected.descendantCount,2);
});
test('ordinary notes properties dates blanks and incomplete checkboxes are not movable roots',()=>{
  const state=single('[2026-09-07]\n- [ ] A\n  - 메모: 보존\n\n일반 문장\n- [ ] ');
  for(const id of ['line-0','line-2','line-3','line-4','line-5','missing']) assert.equal(model.selectionForMove(state,'doc-1',id),null);
  assert.equal(model.selectionForMove(state,'missing','line-1'),null);
  assert.equal(model.selectionForMove(null,'doc-1','line-1'),null);
});
test('selection retains internal blanks but does not count them as descendants',()=>{
  const state=single('- [ ] A\n  첫 메모\n\n  둘째 메모\n\n- [ ] B');
  const selected=model.selectionForMove(state,'doc-1','line-0');
  assert.equal(selected.endIndex,4);assert.equal(selected.lineIds.length,4);assert.equal(selected.descendantCount,2);
});
test('moveTargets publish original indexes with unique boundary-depth keys', () => {
  const state=single('- [ ] A\n- [ ] B\n- [ ] C'), list=model.moveTargets(state,'doc-1','line-0');
  assert(list.some(t=>t.beforeLineId==='line-2'&&t.index===2&&t.depth===0)); assert(list.some(t=>t.beforeLineId===null&&t.index===3));
  assert(list.some(t=>t.beforeLineId==='line-2'&&t.depth===1&&t.parentLineId==='line-1')); assert.equal(new Set(list.map(t=>t.targetKey)).size,list.length);
});
test('self descendant immediate-following and missing destinations are safe no-ops',()=>{
  const state=single('- [ ] A\n  - [ ] 자식\n  - 메모: 속성\n- [ ] B');
  for(const target of ['line-0','line-1','line-2','line-3','missing',undefined,4]) assert.equal(model.moveSubtree(state,'doc-1','line-0',target),state);
  assert.equal(model.moveSubtree(state,'doc-1','line-3',null),state);
});
test('simple task movement is immutable and preserves every original line and task value',()=>{
  const state=single('- [ ] A\n  - 메모: 보존\n- [x] B'),snapshot=clone(state);
  const next=model.moveSubtree(state,'doc-1','line-0',null);
  assertMovedSafely(state,next,'doc-1');assert.deepEqual(state,snapshot);
  assert.equal(model.raw(next.documents[0]),'- [x] B\n- [ ] A\n  - 메모: 보존');
});
test('duplicate-title tasks move by line identity without completion swaps',()=>{
  const state=single('- [ ] 동일\n- [x] 동일\n- [ ] 끝');
  const next=model.moveSubtree(state,'doc-1','line-0',null);
  assertMovedSafely(state,next,'doc-1');
  assert.deepEqual(model.tasks(next).map(t=>[t.id,t.done]),[['line-1',true],['line-2',false],['line-0',false]]);
});
test('moving a whole folder preserves its catalog parent and all source relationships',()=>{
  const state=model.createState(),next=model.moveSubtree(state,'d-move','d-move-line-3',null);
  assertMovedSafely(state,next,'d-move');
  assert.equal(next.documents[0].lines.findIndex(line=>line.id==='d-move-line-3'),4);
  assert.deepEqual(next.flows,state.flows);
});
test('moving a reference never moves or edits the private Flow original',()=>{
  const state=model.createState(),next=model.moveSubtree(state,'d-move','d-move-line-10','d-move-line-9');
  assertMovedSafely(state,next,'d-move');
  assert.deepEqual(next.flows,state.flows);
  assert.deepEqual(next.documents[0].lines.slice(8,10).map(line=>line.id),['d-move-line-10','d-move-line-9']);
});
test('moving the private Flow source itself only reorders that explicitly selected document',()=>{
  const state=model.createState(),next=model.moveSubtree(state,'flow-move-d30','flow-move-d30-line-3',null);
  assertMovedSafely(state,next,'flow-move-d30');
  assert.deepEqual(next.documents,state.documents);
  assert.equal(next.flows[0].sourceVersion,state.flows[0].sourceVersion);assert.equal(next.flows[0].private,true);
});
test('a subcheck can reorder within its immediate parent while completion and all children remain intact',()=>{
  const state=single('- [x] 부모\n  - [x] 첫째\n    자식 메모\n  - [ ] 둘째\n- [ ] 다음');
  const next=model.moveSubtree(state,'doc-1','line-1','line-4');
  assertMovedSafely(state,next,'doc-1');
  assert.deepEqual(next.documents[0].lines.map(line=>line.id),['line-0','line-3','line-1','line-2','line-4']);
});
test('subchecks move to other Task and child parents while keeping IDs', () => {
  const state=single('- [ ] A\n  - [ ] A1\n    - [ ] A11\n  - [ ] A2\n    - [ ] A21\n- [ ] B\n  - [ ] B1');
  for(const [id,before,depth] of [['line-1','line-6',1],['line-2','line-4',2],['line-1',null,1]]) {
    const next=model.moveSubtree(state,'doc-1',id,before,depth); assert.notEqual(next,state); assert(model.validate(next)); assert.equal(next.itemScopes[id],state.itemScopes[id]);
  }
});
test('canonical Tasks retain planning below an ordinary note parent', () => {
  const state=outline('- 이사 준비\n  - [ ] A\n  - [ ] B\n- 일반 목록\n  - 일반 메모',{0:'folder-move'});
  const next=model.moveSubtree(state,'outline','o-1','o-4',1); assert.notEqual(next,state); assert.equal(next.taskScopes['o-1'],state.taskScopes['o-1']);
});
test('canonical Task placement can change while captured ownership stays pinned and visible',()=>{
  const state=outline('- 이사 준비\n  - [ ] A\n- 일상\n  - [ ] B',{0:'folder-move',2:'folder-life'});
  const next=model.moveSubtree(state,'outline','o-1','o-3');
  assertMovedSafely(state,next,'outline');
  const row=model.rowMeta(next,'outline').find(row=>row.id==='o-1');
  assert.equal(row.ancestorScopeId,'folder-life');assert.equal(row.scopeId,'folder-move');assert.equal(row.scopeMismatch,true);
});
test('nested folder links can move without reparenting the actual catalog', () => {
  const state=outline('- 이사 준비\n  - 박스 준비\n    - [ ] A\n- 일상\n  - [ ] B',{0:'folder-move',1:'folder-box',3:'folder-life'});
  const next=model.moveSubtree(state,'outline','o-1','o-4',1); assert.notEqual(next,state); assert.deepEqual(next.folders,state.folders); assert.equal(next.taskScopes['o-2'],state.taskScopes['o-2']);
});
test('same-depth nested scopes can reorder under their original catalog parent',()=>{
  const state=model.createState(),next=model.moveSubtree(state,'d-move','d-move-line-8','d-move-line-5');
  assertMovedSafely(state,next,'d-move');
  assert.equal(next.documents[0].lines[4].id,'d-move-line-8');
  assert.equal(next.documents[0].lines[7].id,'d-move-line-5');
});
test('movement across date sections adds only the required exception and keeps effective date',()=>{
  const state=single('[2026-09-07]\n- [ ] A\n[2026-09-08]\n- [ ] B');
  const next=model.moveSubtree(state,'doc-1','line-1',null);
  assertMovedSafely(state,next,'doc-1');
  const moved=model.tasks(next).find(task=>task.id==='line-1');
  assert.equal(moved.groupDate,'2026-09-08');assert.equal(moved.date,'2026-09-07');
  assert.equal(next.documents[0].lines.length,state.documents[0].lines.length+1);
  assert(model.raw(next.documents[0]).endsWith('- [ ] A\n  - 날짜: 2026-09-07'));
});
test('an undated Task stays undated when moved below a dated section',()=>{
  const state=single('[미정]\n- [ ] A\n[2026-09-07]\n- [ ] B');
  const next=model.moveSubtree(state,'doc-1','line-1',null);
  assertMovedSafely(state,next,'doc-1');
  assert(model.raw(next.documents[0]).endsWith('- [ ] A\n  - 날짜: 미정'));
});
test('existing explicit date properties retain IDs and do not duplicate during moves',()=>{
  const state=single('[2026-09-07]\n- [ ] A\n  - 날짜: 2026-09-09\n  - 메모: 보존\n[미정]\n- [ ] B');
  const next=model.moveSubtree(state,'doc-1','line-1',null);
  assertMovedSafely(state,next,'doc-1');assert.equal(next.documents[0].lines.length,state.documents[0].lines.length);
  assert.equal(next.documents[0].lines.find(line=>line.id==='line-2').text,'  - 날짜: 2026-09-09');
});
test('same-date structural movement creates no redundant properties',()=>{
  const state=single('[2026-09-07]\n- [ ] A\n- [ ] B');
  const next=model.moveSubtree(state,'doc-1','line-1',null);
  assertMovedSafely(state,next,'doc-1');assert.equal(next.documents[0].lines.length,state.documents[0].lines.length);
});
test('every canonical Task in a moved scope retains its own effective date independently',()=>{
  const state=model.createState(),next=model.moveSubtree(state,'d-move','d-move-line-3',null);
  assertMovedSafely(state,next,'d-move');
  assert.equal(model.tasks(next).find(task=>task.id==='d-move-line-4').date,'2026-09-07');
  assert.equal(model.tasks(next).find(task=>task.id==='d-move-line-6').date,'2026-09-07');
  assert.equal(next.documents[0].lines.filter(line=>line.text.includes('- 날짜:')).length,2);
  assert.deepEqual(next.flows,state.flows);
});
test('code rows are neither selectable roots nor offered insertion boundaries',()=>{
  const state=single('- [ ] A\n~~~\n- [ ] 코드\n~~~\n- [ ] B');
  for(const id of ['line-1','line-2','line-3']){
    assert.equal(model.selectionForMove(state,'doc-1',id),null);
    assert.equal(model.moveSubtree(state,'doc-1','line-0',id),state);
  }
  assert(model.moveTargets(state,'doc-1','line-0').every(target=>!['line-1','line-2','line-3'].includes(target.beforeLineId)));
});
test('a closed code block inside the selected subtree is moved byte-for-byte with its parent',()=>{
  const state=single('- [ ] A\n  ~~~js\nconst x = 1;\n  - 날짜: 2030-01-01\n  ~~~\n- [ ] B');
  const next=model.moveSubtree(state,'doc-1','line-0',null);
  assertMovedSafely(state,next,'doc-1');
  assert.equal(model.raw(next.documents[0]),'- [ ] B\n- [ ] A\n  ~~~js\nconst x = 1;\n  - 날짜: 2030-01-01\n  ~~~');
});
test('unclosed code selections and end destinations inside an unclosed fence are refused',()=>{
  const state=single('- [ ] A\n  ~~~\ncode');
  assert.equal(model.selectionForMove(state,'doc-1','line-0'),null);
  const outside=single('- [ ] A\n~~~\ncode');
  assert.equal(model.moveSubtree(outside,'doc-1','line-0',null),outside);
});
test('blank-line boundaries are omitted so movement cannot accidentally adopt following descendants',()=>{
  const state=outline('- 이사 준비\n\n  - [ ] A\n- [ ] B',{0:'folder-move'});
  assert(!model.moveTargets(state,'outline','o-3').some(target=>target.beforeLineId==='o-1'));
  assert.equal(model.moveSubtree(state,'outline','o-3','o-1'),state);
});
test('line-limit destinations needing a date exception are omitted before any mutation',()=>{
  const state=single('[2026-09-07]\n- [ ] A\n- [ ] B\n[미정]');
  state.documents[0].lines.push(...Array.from({length:1196},(_,i)=>({id:'limit-note-'+i,text:'메모'})));
  assert(model.validate(state));
  assert(!model.moveTargets(state,'doc-1','line-1').some(target=>target.beforeLineId===null));
  assert.equal(model.moveSubtree(state,'doc-1','line-1',null),state);
});
test('raw-size destinations needing a date exception are omitted without touching source',()=>{
  const state=single('[2026-09-07]\n- [ ] A\n[미정]\n메모');
  state.documents[0].lines[3].text+=' '.repeat(100000-model.raw(state.documents[0]).length);
  assert(model.validate(state));assert.equal(model.raw(state.documents[0]).length,100000);
  assert.equal(model.moveSubtree(state,'doc-1','line-1',null),state);
  assert(!model.moveTargets(state,'doc-1','line-1').some(target=>target.beforeLineId===null));
});
test('all advertised seed targets commit successfully with stable Task values',()=>{
  const state=model.createState();let advertised=0;
  for(const doc of state.documents.concat(state.flows))for(const row of model.rowMeta(state,doc.id)){
    for(const target of model.moveTargets(state,doc.id,row.id)){
      assertMovedSafely(state,model.moveSubtree(state,doc.id,row.id,target.beforeLineId,target.depth),doc.id);advertised++;
    }
  }
  assert(advertised>=15);
});
test('all advertised targets in a mixed hierarchy preserve relationships and source bytes',()=>{
  const state=outline('[2026-09-07]\n- 이사 준비\n  - [ ] A\n    - [ ] A1\n    - [ ] A2\n  - 박스 준비\n    - [ ] 상자\n- 일상\n  - [ ] B\n[미정]\n- [ ] C',{1:'folder-move',5:'folder-box',7:'folder-life'});
  let total=0;for(const row of model.rowMeta(state,'outline'))for(const target of model.moveTargets(state,'outline',row.id)){
    assertMovedSafely(state,model.moveSubtree(state,'outline',row.id,target.beforeLineId,target.depth),'outline');total++;
  }
  assert(total>10);
});
test('Undo and storage roundtrip restore exact pre-move and post-move source and sidecars',()=>{
  const state=model.createState(),undo=JSON.stringify(state);
  const next=model.moveSubtree(state,'d-move','d-move-line-3',null),redo=JSON.stringify(next);
  assertMovedSafely(state,next,'d-move');
  assert.deepEqual(JSON.parse(undo),state);assert.deepEqual(JSON.parse(redo),next);
  const store=storage({'flow:operating':'sentinel'}),written=model.write(store,next,null);
  assert(written.ok);assert.deepEqual(model.read(store).state,next);assert.equal(store.data.get('flow:operating'),'sentinel');
});
test('stale or foreign destination IDs and invalid versions fail closed',()=>{
  const state=model.createState();
  assert.equal(model.moveSubtree(state,'d-move','d-move-line-2','d-life-line-1'),state);
  const invalid=clone(state);invalid.version=5;
  assert.equal(model.selectionForMove(invalid,'d-move','d-move-line-2'),null);
  assert.deepEqual(model.moveTargets(invalid,'d-move','d-move-line-2'),[]);
  assert.equal(model.moveSubtree(invalid,'d-move','d-move-line-2',null),invalid);
});
test('successive legal moves retain selection IDs and reverse to the original order within one date section',()=>{
  const state=single('[2026-09-07]\n- [ ] A\n  - 메모: A 메모\n- [ ] B\n- [ ] C');
  const first=model.moveSubtree(state,'doc-1','line-1',null);
  assertMovedSafely(state,first,'doc-1');
  const second=model.moveSubtree(first,'doc-1','line-1','line-3');
  assertMovedSafely(first,second,'doc-1');assert.deepEqual(second,state);
});

test('moving immediately before the next sibling across only blank separators is a no-op',()=>{
  const state=single('- [ ] A\n\n\n- [ ] B\n\n');
  assert.equal(model.moveSubtree(state,'doc-1','line-0','line-3'),state);
  assert.equal(model.moveSubtree(state,'doc-1','line-3',null),state);
});
test('a subcheck with an incomplete empty Task parent is not a movable root',()=>{
  const state=single('- [ ] \n  - [ ] 하위\n  - [ ] 둘째');
  assert(model.validate(state));assert.equal(model.selectionForMove(state,'doc-1','line-1'),null);
  assert.deepEqual(model.moveTargets(state,'doc-1','line-1'),[]);
});
test('depth-four Task moves can pin dates in allowed depth-five properties',()=>{
  let state=outline('[2026-09-07]\n- 이사 준비\n  - 박스 준비\n    - 세부\n      - 깊은 Flow\n        - [ ] A\n[2026-09-08]\n- 이사 준비\n  - 박스 준비\n    - 세부\n      - 깊은 Flow\n        - [ ] B',
    {1:'folder-move',2:'folder-box',7:'folder-move',8:'folder-box'});
  state.folders.push({id:'folder-leaf',title:'세부',parentId:'folder-box'});
  state.flows.push({id:'flow-deep',title:'깊은 Flow',folderId:'folder-leaf',folder:'세부',lines:[],private:true,sourceVersion:'fixture private'});
  for(const [index,scopeId] of [[3,'folder-leaf'],[4,'flow-deep'],[9,'folder-leaf'],[10,'flow-deep']])
    state.bindings.push({kind:'scope',docId:'outline',lineId:'o-'+index,scopeId});
  state.taskScopes['o-5']='flow-deep';state.taskScopes['o-11']='flow-deep';state.itemScopes['o-5']='flow-deep';state.itemScopes['o-11']='flow-deep';
  assert(model.validate(state));
  const next=model.moveSubtree(state,'outline','o-5','o-11');
  assertMovedSafely(state,next,'outline');
  const moved=model.tasks(next).find(task=>task.id==='o-5');
  assert.equal(moved.depth,4);assert.equal(moved.date,'2026-09-07');assert.equal(moved.groupDate,'2026-09-08');
  assert(model.rowMeta(next,'outline').some(row=>row.kind==='property'&&row.depth===5&&row.taskId==='o-5'));
});
test('movement accepts frozen immutable snapshots without writing into shared input objects',()=>{
  const state=model.createState();
  function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
  freeze(state);
  const next=model.moveSubtree(state,'d-move','d-move-line-2',null);
  assertMovedSafely(state,next,'d-move');assert(Object.isFrozen(state.documents[0].lines));
});

// v7 plans describe one native insertion. Exercise both the blank scaffold and the
// later user title input; testing only a prefilled full line would miss IME-era IDs.
function plannedSource(state, docId, option, content = '') {
  const source = model.raw(model.getDocument(state, docId));
  const inserted = source.slice(0, option.offset) + option.text + source.slice(option.offset);
  return inserted.slice(0, option.caretOffset) + content + inserted.slice(option.caretOffset);
}
function applyPlan(state, docId, option, content = '사용자가 적은 내용') {
  const staged = model.editText(state, docId, plannedSource(state, docId, option));
  assert.notEqual(staged, state, 'blank scaffold must be an accepted native transaction');
  assert(model.validate(staged));
  const next = model.editText(staged, docId, plannedSource(state, docId, option, content));
  assert.notEqual(next, staged, 'typing into the scaffold must stay editable');
  assert(model.validate(next));
  return next;
}
function planOf(state, docId, lineId, kind) {
  const option = model.insertionOptions(state, docId, lineId).find(option => option.kind === kind);
  assert(option, kind + ' plan at ' + lineId); return option;
}

test('v8 exclusively reads its new dated key and leaves v6 bytes untouched', () => {
  const oldKey = 'flowme:ux-review:text-workspace-v6:20260907';
  const store = storage({ [oldKey]: 'v6 byte-for-byte', 'flow:operating': 'untouched' });
  assert.equal(model.read(store).state.version, 11); assert.deepEqual(store.calls, [['get', model.KEY]]);
  assert(model.write(store, model.createState(), null).ok);
  assert(store.calls.every(call => call[1] === 'flowme:ux-review:text-workspace-v11:20260908'));
  assert.equal(store.data.get(oldKey), 'v6 byte-for-byte'); assert.equal(store.data.get('flow:operating'), 'untouched');
});
test('v6 schema at the v8 key is rejected without migration or writes', () => {
  const older = clone(model.createState()); older.version = 6;
  const store = storage({ [model.KEY]: JSON.stringify(older) });
  assert.equal(model.read(store).reason, 'invalid-schema'); assert.equal(model.write(store, older, JSON.stringify(older)).reason, 'invalid-state');
  assert.equal(store.calls.length, 1); assert.deepEqual(model.insertionOptions(older, 'd-move', 'd-move-line-2'), []);
});
test('insertion plans publish explicit relation syntax depth and UTF16 editor coordinates', () => {
  const state = single('- [ ] A'), plans = model.insertionOptions(state, 'doc-1', 'line-0');
  assert.deepEqual(plans.map(p => [p.kind, p.label, p.relation, p.syntax, p.depth]), [
    ['task', '다음 할 일', '같은 높이에', '- [ ] ', 0],
    ['subcheck', '하위 체크', '이 할 일 안에', '- [ ] ', 1],
    ['note', '메모', '이 할 일 안에', '- 메모: ', 1]
  ]);
  plans.forEach(p => { assert.equal(p.index, 1); assert.equal(p.offset, 7); assert.equal(p.caretOffset, p.offset + p.text.length); });
});
test('same-height next Task is placed after all children properties notes and closed code', () => {
  const state = single('- [ ] A\n  - 메모: 기존\n  - [x] child\n    작은 메모\n  ```\ncode\n  ```\n\n- [ ] B');
  const option = planOf(state, 'doc-1', 'line-0', 'task');
  assert.equal(option.index, 7); assert.equal(option.depth, 0);
  const next = applyPlan(state, 'doc-1', option, 'C');
  assert.deepEqual(model.tasks(next).map(t => t.title), ['A', 'C', 'B']);
  assert.equal(model.tasks(next)[0].note, '기존'); assert.equal(model.tasks(next)[0].subchecks[0].done, true);
});
test('a child check appends inside the selected Task rather than the last nested child', () => {
  const state = single('- [ ] A\n  - [ ] child\n    - [ ] grandchild\n- [ ] B');
  const option = planOf(state, 'doc-1', 'line-0', 'subcheck');
  assert.equal(option.index, 3); assert.equal(option.depth, 1); assert.equal(option.parentLineId, 'line-0');
  const next = applyPlan(state, 'doc-1', option);
  const added = model.rowMeta(next, 'doc-1').find(row => row.title === '사용자가 적은 내용');
  assert.equal(added.kind, 'subcheck'); assert.equal(added.parentLineId, 'line-0'); assert.equal(added.taskId, 'line-0');
});
test('a subcheck offers same-height and child checks plus own memo', () => {
  const state = single('- [ ] A\n  - [ ] child\n    - [ ] grandchild\n  - [ ] second');
  const plans = model.insertionOptions(state, 'doc-1', 'line-1');
  assert.equal(plans.length, 3); assert.equal(plans[0].kind, 'subcheck'); assert.equal(plans[0].index, 3);
  const next = applyPlan(state, 'doc-1', plans[0]);
  assert.equal(model.tasks(next).length, 1); assert.equal(model.tasks(next)[0].subchecks.length, 4);
  assert.equal(model.rowMeta(next, 'doc-1').find(row => row.title === '사용자가 적은 내용').parentLineId, 'line-0');
});
test('nested subcheck additions retain their immediate parent instead of the canonical Task depth', () => {
  const state = single('- [ ] A\n  - [ ] child\n    - [ ] grandchild\n  - [ ] second');
  const option = planOf(state, 'doc-1', 'line-2', 'subcheck');
  assert.equal(option.depth, 2); assert.equal(option.parentLineId, 'line-1');
  assert.equal(model.rowMeta(applyPlan(state, 'doc-1', option), 'doc-1').find(r => r.title === '사용자가 적은 내용').parentLineId, 'line-1');
});
test('a folder offers child Tasks and ordinary notes at its own subtree end', () => {
  const state = model.createState(), plans = model.insertionOptions(state, 'd-move', 'd-move-line-3');
  assert.deepEqual(plans.map(p => [p.kind, p.index, p.depth, p.parentLineId]), [
    ['task', 10, 1, 'd-move-line-3'], ['note', 10, 1, 'd-move-line-3']
  ]);
  const next = applyPlan(state, 'd-move', plans[0]);
  assert.equal(model.tasks(next).find(t => t.title === '사용자가 적은 내용').scopeId, 'folder-move');
  assert.equal(model.tasks(next).find(t => t.title === '사용자가 적은 내용').date, '2026-09-07');
});
test('a Flow connection creates a distinct private-owned Task without copying imported tasks', () => {
  const state = model.createState(), original = JSON.stringify(state.flows);
  const next = applyPlan(state, 'd-move', planOf(state, 'd-move', 'd-move-line-8', 'task'));
  const task = model.tasks(next).find(t => t.title === '사용자가 적은 내용');
  assert.equal(task.scopeId, 'flow-move-d30'); assert.equal(task.docId, 'd-move');
  assert.equal(JSON.stringify(next.flows), original); assert.equal(next.bindings.length, state.bindings.length);
});
test('a selected reference offers a same-height Task and local child but no direct properties', () => {
  const state = model.createState(), plans = model.insertionOptions(state, 'd-move', 'd-move-line-9');
  assert.equal(plans.length, 2); assert.equal(plans[0].kind, 'task'); assert.equal(plans[0].depth, 2); assert.equal(plans[1].kind,'subcheck');
  const next = applyPlan(state, 'd-move', plans[0]);
  assert.equal(JSON.stringify(next.flows), JSON.stringify(state.flows)); assert.deepEqual(next.bindings, state.bindings);
  assert.equal(model.tasks(next).length, model.tasks(state).length + 1);
});
test('ordinary bullets never become confirmed folders or receive child canonical Task options', () => {
  const state = single('- 일반 제목\n  일반 하위 메모\n- [ ] 다음');
  const plans = model.insertionOptions(state, 'doc-1', 'line-0');
  assert.deepEqual(plans.map(p => [p.kind, p.index, p.depth]), [['task', 2, 0], ['note', 2, 0]]);
  const next = applyPlan(state, 'doc-1', plans[0]); assert.equal(next.bindings.length, 0); assert.equal(next.folders.length, 1);
});
test('explicit checkboxes below ordinary prose create Tasks without folder interpretation', () => {
  const state=single('일반 제목\n  일반 메모'), plans=model.insertionOptions(state,'doc-1','line-1');
  assert.deepEqual(plans.map(p=>p.kind),['task','note']); assert.equal(plans[0].depth,1);
  const next=applyPlan(state,'doc-1',plans[0],'할 일'); assert.equal(model.tasks(next).length,1); assert.deepEqual(next.bindings,[]);
});
test('a note inside a Task offers a subcheck at that height without promoting the note', () => {
  const state = single('- [ ] A\n  일반 메모');
  const plans = model.insertionOptions(state, 'doc-1', 'line-1');
  assert.deepEqual(plans.map(p => p.kind), ['subcheck', 'note']);
  const next = applyPlan(state, 'doc-1', plans[0]); assert.equal(model.tasks(next).length, 1);
  assert.equal(model.getDocument(next, 'doc-1').lines.find(line => line.id === 'line-1').text, '  일반 메모');
});
test('Task memo planning appends an explicit property and preserves existing memo text and IDs', () => {
  const state = single('- [x] A\n  - 메모: 기존 메모\n  - 시간: 09:00\n  일반 설명\n- [ ] B');
  const next = applyPlan(state, 'doc-1', planOf(state, 'doc-1', 'line-0', 'note'), '추가 메모');
  const task = model.tasks(next)[0]; assert.equal(task.note, '기존 메모\n추가 메모'); assert.equal(task.time, '09:00'); assert.equal(task.done, true);
  for (const old of state.documents[0].lines) assert.deepEqual(next.documents[0].lines.find(line => line.id === old.id), old);
});
test('property-row additions point back to the owning Task and append after its descendants', () => {
  const state = single('- [ ] A\n  - 메모: 기존\n  - [ ] child\n    child 메모\n- [ ] B');
  const plans = model.insertionOptions(state, 'doc-1', 'line-1');
  assert.deepEqual(plans.map(p => [p.kind, p.depth, p.index, p.parentLineId]), [['subcheck', 1, 4, 'line-0'], ['note', 1, 4, 'line-0']]);
  plans.forEach(option => applyPlan(state, 'doc-1', option));
});
test('ordinary scope notes do not add properties or alter task dates and completion', () => {
  const state = model.createState(), before = model.tasks(state);
  const next = applyPlan(state, 'd-move', planOf(state, 'd-move', 'd-move-line-5', 'note'), '상자 보관 위치 메모');
  assert.deepEqual(model.tasks(next).map(t => [t.id, t.title, t.done, t.date, t.note, t.scopeId]), before.map(t => [t.id, t.title, t.done, t.date, t.note, t.scopeId]));
  assert.equal(next.bindings.length, state.bindings.length);
});
test('root headings and date sections offer new lines without inserting another date section', () => {
  for (const text of ['## 일반 제목\n- [ ] A', '[2026-09-07]\n- [ ] A', '[미정]\n- [ ] A']) {
    const state = single(text), plans = model.insertionOptions(state, 'doc-1', 'line-0');
    assert.deepEqual(plans.map(p => p.kind), ['task', 'note']); assert(plans.every(p => p.depth === 0));
    assert.equal(model.parseDocument(applyPlan(state, 'doc-1', plans[0]).documents[0]).rows.filter(r => r.kind === 'date').length, text.startsWith('[') ? 1 : 0);
  }
});
test('invalid date and incomplete Task anchors expose no misleading insertion plans', () => {
  for (const text of ['[2026-02-30]', '- [ ] ', '- [x] ', '- ', '-']) {
    const state = single(text); assert(model.validate(state)); assert.deepEqual(model.insertionOptions(state, 'doc-1', 'line-0'), []);
  }
});
test('code opening contents and closing rows never offer row insertion actions', () => {
  const state = single('```\n- [ ] example\n```\n- [ ] outside');
  for (let index = 0; index < 3; index++) assert.deepEqual(model.insertionOptions(state, 'doc-1', 'line-' + index), []);
  assert.equal(model.insertionOptions(state, 'doc-1', 'line-3').length, 3);
});
test('a subtree ending inside unclosed code offers no apparently safe insertions', () => {
  const state = single('- [ ] A\n  ```\n  code'); assert(model.validate(state));
  assert.deepEqual(model.insertionOptions(state, 'doc-1', 'line-0'), []);
});
test('insertion plans never steal a following child across a blank separator', () => {
  const state = single('- [ ] A\n\n  - [ ] child\n- [ ] B');
  const option = planOf(state, 'doc-1', 'line-0', 'task'); assert.equal(option.index, 3);
  const next = applyPlan(state, 'doc-1', option);
  assert.equal(model.rowMeta(next, 'doc-1').find(r => r.id === 'line-2').parentLineId, 'line-0');
});
test('end insertion prefixes exactly one newline and does not overwrite existing source', () => {
  const state = single('- [ ] A'), option = planOf(state, 'doc-1', 'line-0', 'task');
  assert.equal(option.text, '\n- [ ] '); assert.equal(plannedSource(state, 'doc-1', option, 'B'), '- [ ] A\n- [ ] B');
});
test('middle insertion keeps the next line after the caret separator', () => {
  const state = single('- [ ] A\n- [ ] B'), option = planOf(state, 'doc-1', 'line-0', 'task');
  assert.equal(option.text, '- [ ] \n'); assert.equal(plannedSource(state, 'doc-1', option, 'C'), '- [ ] A\n- [ ] C\n- [ ] B');
  assert.equal(option.caretOffset, option.offset + option.text.length - 1);
});
test('UTF16 offsets preserve Korean emoji and multi-code-unit source exactly', () => {
  const state = single('- [ ] 짐 📦 확인\n- [ ] 다음'), option = planOf(state, 'doc-1', 'line-0', 'task');
  assert.equal(option.offset, '- [ ] 짐 📦 확인\n'.length);
  const next = applyPlan(state, 'doc-1', option, '새 메모 👨‍👧');
  assert.equal(next.documents[0].lines[0].text, '- [ ] 짐 📦 확인'); assert.equal(model.tasks(next)[1].title, '새 메모 👨‍👧');
});
test('empty subcheck scaffolds retain their kind and ID throughout subsequent title typing', () => {
  const state = single('- [ ] A'), option = planOf(state, 'doc-1', 'line-0', 'subcheck');
  const staged = model.editText(state, 'doc-1', plannedSource(state, 'doc-1', option));
  const scaffold = staged.documents[0].lines[1]; assert.equal(model.rowMeta(staged, 'doc-1')[1].kind, 'subcheck');
  assert.equal(model.tasks(staged)[0].subchecks.length, 0);
  const next = model.editText(staged, 'doc-1', plannedSource(state, 'doc-1', option, '작은 확인'));
  assert.notEqual(next, staged); assert.equal(next.documents[0].lines[1].id, scaffold.id); assert.equal(model.tasks(next)[0].subchecks[0].id, scaffold.id);
});
test('incomplete subchecks cannot be moved completed or used to offer more scaffolds', () => {
  const state = single('- [ ] A\n  - [ ] '); assert(model.validate(state));
  assert.equal(model.selectionForMove(state, 'doc-1', 'line-1'), null); assert.deepEqual(model.moveTargets(state, 'doc-1', 'line-1'), []);
  assert.equal(model.updateSubcheck(state, 'doc-1', 'line-1', true), state); assert.deepEqual(model.insertionOptions(state, 'doc-1', 'line-1'), []);
});
test('clearing and retyping a subcheck title preserves its ID before explicit promotion', () => {
  const state = single('- [ ] A\n  - [ ] child');
  const empty = model.editText(state, 'doc-1', '- [ ] A\n  - [ ] '); assert.notEqual(empty, state);
  const restored = model.editText(empty, 'doc-1', '- [ ] A\n  - [ ] renamed'); assert.notEqual(restored, empty);
  assert.equal(restored.documents[0].lines[1].id, 'line-1'); assert.equal(model.tasks(restored).length, 1);
  assert.notEqual(model.editText(restored, 'doc-1', '- [ ] A\n- [ ] renamed'), restored);
});
test('incomplete canonical Task scaffolds also become Tasks only after user-authored text', () => {
  const state = single('- [ ] A'), option = planOf(state, 'doc-1', 'line-0', 'task');
  const staged = model.editText(state, 'doc-1', plannedSource(state, 'doc-1', option));
  assert.equal(model.tasks(staged).length, 1); assert.equal(Object.keys(staged.taskScopes).length, 1);
  const next = model.editText(staged, 'doc-1', plannedSource(state, 'doc-1', option, 'B')); assert.equal(model.tasks(next).length, 2);
});
test('depth-four subchecks offer same-level and depth-five child structures', () => {
  const state = single('- [ ] A\n  - [ ] B\n    - [ ] C\n      - [ ] D\n        - [ ] E');
  const plans = model.insertionOptions(state, 'doc-1', 'line-4'); assert.equal(plans.length, 3); assert.equal(plans[0].depth, 4);
  applyPlan(state, 'doc-1', plans[0]);
});
test('depth-four canonical Tasks still allow direct depth-five memo properties', () => {
  let state = outline('- 이사 준비\n  - 박스 준비\n    - 세부\n      - 깊은 Flow\n        - [ ] A', { 0: 'folder-move', 1: 'folder-box' });
  state.folders.push({ id: 'folder-leaf', title: '세부', parentId: 'folder-box' });
  state.flows.push({ id: 'flow-deep', title: '깊은 Flow', folderId: 'folder-leaf', folder: '세부', lines: [], private: true, sourceVersion: 'fixture' });
  state.bindings.push({ kind: 'scope', docId: 'outline', lineId: 'o-2', scopeId: 'folder-leaf' }, { kind: 'scope', docId: 'outline', lineId: 'o-3', scopeId: 'flow-deep' });
  state.taskScopes['o-4'] = 'flow-deep'; state.itemScopes['o-4'] = 'flow-deep'; assert(model.validate(state));
  const plans = model.insertionOptions(state, 'outline', 'o-4'); assert.deepEqual(plans.map(p => [p.kind, p.depth]), [['task', 4], ['subcheck', 5], ['note', 5]]);
  const next = applyPlan(state, 'outline', plans.find(p=>p.kind==='note'), '최대 깊이 메모'); assert.equal(outlineTasks(next)[0].note, '최대 깊이 메모');
});
test('missing foreign IDs invalid states and malformed document lookups fail closed', () => {
  const state = model.createState();
  for (const [s, docId, lineId] of [[null, 'd-move', 'x'], [state, 'missing', 'x'], [state, 'd-move', 'd-life-line-1'], [state, 'd-move', null], [{}, 'x', 'x']])
    assert.deepEqual(model.insertionOptions(s, docId, lineId), []);
});
test('line-capacity exhaustion omits all insertions before any editor write', () => {
  const state = single(['- [ ] A'].concat(Array.from({ length: 1199 }, (_, i) => '메모 ' + i)).join('\n'));
  assert(model.validate(state)); assert.deepEqual(model.insertionOptions(state, 'doc-1', 'line-0'), []);
});
test('raw-capacity exhaustion omits scaffolds that cannot accept even one typed character', () => {
  const state = single('- [ ] ' + 'x'.repeat(99994)); assert(model.validate(state));
  assert.deepEqual(model.insertionOptions(state, 'doc-1', 'line-0'), []);
});
test('duplicate titles and every existing source ID survive insertion and user typing', () => {
  const state = single('- [ ] same\n  - [ ] same\n- [x] same');
  const next = applyPlan(state, 'doc-1', planOf(state, 'doc-1', 'line-0', 'task'), 'same');
  state.documents[0].lines.forEach(line => assert.deepEqual(next.documents[0].lines.find(item => item.id === line.id), line));
  assert.equal(model.tasks(next).find(t => t.id === 'line-2').done, true); assert.equal(new Set(next.documents[0].lines.map(l => l.id)).size, 4);
});
test('all advertised seed plans support blank insertion then typing without changing prior source lines', () => {
  const state = model.createState(); let total = 0;
  for (const doc of state.documents.concat(state.flows)) for (const row of model.rowMeta(state, doc.id))
    for (const option of model.insertionOptions(state, doc.id, row.id)) {
      const next = applyPlan(state, doc.id, option);
      for (const original of doc.lines) assert.deepEqual(model.getDocument(next, doc.id).lines.find(line => line.id === original.id), original);
      assert.deepEqual(next.bindings, state.bindings); total++;
    }
  assert(total > 30);
});
test('insertion plans are deterministic read-only values and accept frozen snapshots', () => {
  const state = model.createState(), serialized = JSON.stringify(state);
  function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } }
  freeze(state);
  const first = model.insertionOptions(state, 'd-move', 'd-move-line-2');
  assert.deepEqual(model.insertionOptions(state, 'd-move', 'd-move-line-2'), first); assert.equal(JSON.stringify(state), serialized);
});
test('stable-ID plan recomputation follows a moved row rather than its former index', () => {
  const state = single('- [ ] A\n- [ ] B\n- [ ] C'), before = planOf(state, 'doc-1', 'line-0', 'task');
  const moved = model.moveSubtree(state, 'doc-1', 'line-0', null), after = planOf(moved, 'doc-1', 'line-0', 'task');
  assert.notEqual(after.index, before.index); assert.equal(after.index, 3); assert.equal(after.offset, model.raw(moved.documents[0]).length);
  assert.equal(model.tasks(applyPlan(moved, 'doc-1', after, 'D')).at(-1).title, 'D');
});
test('Undo snapshots and isolated persistence roundtrip pre-insert scaffold and completed source', () => {
  const state = model.createState(), option = planOf(state, 'd-move', 'd-move-line-6', 'subcheck');
  const staged = model.editText(state, 'd-move', plannedSource(state, 'd-move', option));
  const next = applyPlan(state, 'd-move', option), store = storage(); let expected = null;
  for (const snapshot of [state, staged, next, staged, state, next]) {
    const result = model.write(store, clone(snapshot), expected); assert(result.ok); expected = result.serialized;
    assert.deepEqual(model.read(store).state, snapshot);
  }
});

// v8 cumulative progress is an independent dated sidecar, not source syntax.
const trackedSeedId = 'flow-move-d30-line-3';
function withProgress(text = '- [ ] A', percent = 20, date = '2026-09-08') {
  const initial = single(text), taskId = model.tasks(initial)[0].id;
  const state = model.recordProgress(initial, taskId, date, percent);
  assert.notEqual(state, initial); assert(model.validate(state)); return { state, taskId };
}
function taskById(state, id) { return model.tasks(state).find(task => task.id === id); }

test('v8 seed adds two cumulative snapshots to one existing private Flow Task only', () => {
  const state = model.createState(); assert.equal(state.version, 11); assert.equal(model.tasks(state).length, 7);
  assert.deepEqual(state.progressRecords, [
    { taskId: trackedSeedId, date: '2026-09-07', percent: 10 }, { taskId: trackedSeedId, date: '2026-09-08', percent: 20 }
  ]);
  assert.deepEqual(model.progressHistory(state, trackedSeedId), [{ date: '2026-09-07', percent: 10 }, { date: '2026-09-08', percent: 20 }]);
  assert.deepEqual(model.latestProgress(state, trackedSeedId), { date: '2026-09-08', percent: 20 });
  assert.equal(taskById(state, trackedSeedId).done, false); assert.equal(state.flows[0].private, true);
});
test('day one 10 and day two 20 are snapshots not increments or duplicated Tasks', () => {
  let { state, taskId } = withProgress('- [ ] 하나', 10, '2026-09-07');
  state = model.recordProgress(state, taskId, '2026-09-08', 20);
  assert.equal(model.tasks(state).length, 1); assert.equal(model.latestProgress(state, taskId).percent, 20);
  assert.deepEqual(model.progressHistory(state, taskId).map(record => record.percent), [10, 20]);
});
test('same-day upsert changes only that day and retains the other snapshot', () => {
  const state = model.createState(), next = model.recordProgress(state, trackedSeedId, '2026-09-07', 15);
  assert.equal(next.progressRecords.length, 2); assert.equal(model.latestProgress(next, trackedSeedId).percent, 20);
  assert.deepEqual(model.progressHistory(next, trackedSeedId).map(record => record.percent), [15, 20]);
  assert.deepEqual(state.progressRecords.map(record => record.percent), [10, 20]);
});
test('same Task date and percentage are an exact no-op', () => {
  const state = model.createState(); assert.equal(model.recordProgress(state, trackedSeedId, '2026-09-08', 20), state);
});
test('latest progress is chronological even when the last edit is an earlier date', () => {
  let { state, taskId } = withProgress('- [ ] A', 100, '2026-10-02');
  state = model.recordProgress(state, taskId, '2026-09-30', 10);
  state = model.recordProgress(state, taskId, '2026-10-01', 80);
  assert.deepEqual(model.progressHistory(state, taskId).map(r => r.date), ['2026-09-30', '2026-10-01', '2026-10-02']);
  assert.deepEqual(model.latestProgress(state, taskId), { date: '2026-10-02', percent: 100 }); assert.equal(only(state).done, true);
});
test('decreasing cumulative values are allowed and do not rewrite prior days', () => {
  let { state, taskId } = withProgress('- [ ] A', 80, '2026-09-07');
  state = model.recordProgress(state, taskId, '2026-09-08', 20);
  assert.deepEqual(model.progressHistory(state, taskId).map(r => r.percent), [80, 20]); assert.equal(only(state).done, false);
});
test('zero and one hundred are valid explicit values and 100 completes the Task', () => {
  const initial = single('- [ ] A'), zero = model.recordProgress(initial, 'line-0', '2026-09-07', 0);
  assert.notEqual(zero, initial); assert.equal(only(zero).done, false);
  const complete = model.recordProgress(zero, 'line-0', '2026-09-08', 100);
  assert.equal(only(complete).done, true); assert.equal(complete.documents[0].lines[0].text, '- [x] A');
});
test('percentages must be finite integer numbers within 0 through 100', () => {
  const state = single('- [ ] A');
  for (const percent of [-1, 101, 10.5, NaN, Infinity, -Infinity, '20', null, undefined, true, {}, []])
    assert.equal(model.recordProgress(state, 'line-0', '2026-09-08', percent), state);
});
test('progress requires a real ISO calendar date and does not accept undated placeholders', () => {
  const state = single('- [ ] A');
  for (const date of [null, undefined, '', '미정', '@2026-09-08', '[2026-09-08]', '2026-9-8', '2026-02-30', '2026-09-08T12:00:00Z', 20260908])
    assert.equal(model.recordProgress(state, 'line-0', date, 20), state);
  assert.notEqual(model.recordProgress(state, 'line-0', '2028-02-29', 20), state);
});
test('a canonical ID is required and local reference line IDs never acquire their own histories', () => {
  const state = model.createState();
  assert.equal(model.recordProgress(state, 'd-move-line-9', '2026-09-08', 50), state);
  assert.deepEqual(model.progressHistory(state, 'd-move-line-9'), []); assert.equal(model.latestProgress(state, 'd-move-line-9'), null);
  const row = model.rowMeta(state, 'd-move').find(row => row.id === 'd-move-line-9');
  assert.equal(row.taskId, trackedSeedId); assert.notEqual(model.recordProgress(state, row.taskId, '2026-09-08', 50), state);
});
test('ordinary note scope date and incomplete Task rows cannot own progress', () => {
  const state = single('[2026-09-08]\n- [ ] A\n  - [ ] child\n메모\n- [ ] ');
  for (const id of ['line-0', 'line-3', 'line-4', 'missing', null, '__proto__']) {
    assert.equal(model.recordProgress(state, id, '2026-09-08', 20), state); assert.equal(model.latestProgress(state, id), null);
  }
  const seed = model.createState(); assert.equal(model.recordProgress(seed, 'folder-move', '2026-09-08', 20), seed);
});
test('same-title Tasks keep independent IDs histories and completion', () => {
  let state = single('- [ ] 같은 제목\n- [ ] 같은 제목');
  state = model.recordProgress(state, 'line-0', '2026-09-08', 100);
  state = model.recordProgress(state, 'line-1', '2026-09-08', 20);
  assert.equal(model.tasks(state).length, 2); assert.equal(model.latestProgress(state, 'line-0').percent, 100);
  assert.equal(model.latestProgress(state, 'line-1').percent, 20); assert.deepEqual(model.tasks(state).map(t => t.done), [true, false]);
});
test('partial progress changes no source bytes IDs parent owners dates or references', () => {
  const state = model.createState(), next = model.recordProgress(state, trackedSeedId, '2026-09-09', 50);
  assert.notEqual(next, state); assert.deepEqual(next.documents, state.documents); assert.deepEqual(next.flows, state.flows);
  assert.deepEqual(next.bindings, state.bindings); assert.deepEqual(next.taskScopes, state.taskScopes); assert.deepEqual(next.folders, state.folders);
  assert.deepEqual(model.tasks(next), model.tasks(state));
});
test('100 percent synchronizes only source and every reference checkbox with their IDs intact', () => {
  let state = model.createState(); state = appendLine(state, 'd-life');
  state = model.linkTask(state, 'd-life', state.documents[1].lines.length - 1, trackedSeedId);
  const next = model.recordProgress(state, trackedSeedId, '2026-09-09', 100);
  const affected = new Set([trackedSeedId].concat(state.bindings.filter(b => b.kind === 'task' && b.taskId === trackedSeedId).map(b => b.lineId)));
  for (const before of state.documents.concat(state.flows)) for (const line of before.lines) {
    const now = model.getDocument(next, before.id).lines.find(item => item.id === line.id);
    assert(now); assert.equal(now.text, affected.has(line.id) ? line.text.replace('[ ]', '[x]') : line.text);
  }
  assert.equal(taskById(next, trackedSeedId).done, true); assert.deepEqual(next.bindings, state.bindings);
});
test('a later partial record reopens completion without erasing the earlier 100 percent', () => {
  let { state, taskId } = withProgress('- [ ] A', 100, '2026-09-07');
  state = model.recordProgress(state, taskId, '2026-09-08', 90);
  assert.equal(only(state).done, false); assert.deepEqual(model.progressHistory(state, taskId).map(r => r.percent), [100, 90]);
});
test('editing the latest record across 100 synchronizes completion in both directions', () => {
  const initial = model.createState(), complete = model.recordProgress(initial, trackedSeedId, '2026-09-08', 100);
  const reopened = model.recordProgress(complete, trackedSeedId, '2026-09-08', 99);
  assert.equal(taskById(complete, trackedSeedId).done, true); assert.equal(taskById(reopened, trackedSeedId).done, false);
  assert.equal(reopened.progressRecords.length, 2); assert.equal(reopened.progressRecords[0].percent, 10);
});
test('an older 100 percent record cannot complete a Task whose newer snapshot is partial', () => {
  const state = model.createState(), next = model.recordProgress(state, trackedSeedId, '2026-09-07', 100);
  assert.equal(taskById(next, trackedSeedId).done, false); assert.equal(model.latestProgress(next, trackedSeedId).percent, 20);
  assert.deepEqual(next.documents, state.documents); assert.deepEqual(next.flows, state.flows);
});
test('starting tracking on a completed Task synchronizes to the explicit first partial record', () => {
  const initial = single('- [X] 이미 완료  '), next = model.recordProgress(initial, 'line-0', '2026-09-08', 20);
  assert.equal(only(next).done, false); assert.equal(next.documents[0].lines[0].text, '- [ ] 이미 완료  ');
  const sameDone = model.recordProgress(initial, 'line-0', '2026-09-08', 100);
  assert.equal(sameDone.documents[0].lines[0].text, initial.documents[0].lines[0].text);
});
test('tracked updateTask completion conflicts reject the whole patch atomically', () => {
  const state = model.createState();
  assert.equal(model.updateTask(state, trackedSeedId, { done: true }), state);
  assert.equal(model.updateTask(state, trackedSeedId, { done: true, title: '동시에 변경', date: null }), state);
  const next = model.updateTask(state, trackedSeedId, { done: false, title: '허용된 제목' });
  assert.notEqual(next, state); assert.equal(taskById(next, trackedSeedId).title, '허용된 제목'); assert.deepEqual(next.progressRecords, state.progressRecords);
});
test('raw source checkbox conflict is refused while source title edits retain records', () => {
  const { state, taskId } = withProgress('- [ ] A\n  - 메모: 기록 보존');
  assert.equal(model.editText(state, 'doc-1', '- [x] A\n  - 메모: 기록 보존'), state);
  const next = model.editText(state, 'doc-1', '- [ ] 바꾼 제목\n  - 메모: 기록 보존');
  assert.notEqual(next, state); assert.equal(only(next).id, taskId); assert.deepEqual(next.progressRecords, state.progressRecords);
});
test('raw reference completion conflict rejects source and reference changes together', () => {
  const state = model.createState(), source = model.raw(state.documents[0]);
  assert.equal(model.editText(state, 'd-move', source.replace('    - [ ] 이사업체 견적 비교', '    - [x] 잘못된 완료')), state);
  const next = model.editText(state, 'd-move', source.replace('이사업체 견적 비교', '제목만 수정'));
  assert.notEqual(next, state); assert.equal(taskById(next, trackedSeedId).title, '제목만 수정'); assert.deepEqual(next.progressRecords, state.progressRecords);
});
test('a tracked 100 percent Task cannot be reopened by raw source or checkbox API', () => {
  const { state, taskId } = withProgress('- [ ] A', 100);
  assert.equal(model.updateTask(state, taskId, { done: false }), state);
  assert.equal(model.editText(state, 'doc-1', '- [ ] A'), state); assert.equal(only(state).done, true);
});
test('untracked checkbox completion remains independent and creates no progress records', () => {
  const initial = single('- [ ] A'), complete = model.updateTask(initial, 'line-0', { done: true });
  assert.equal(only(complete).done, true); assert.deepEqual(complete.progressRecords, []);
  const reopened = model.editText(complete, 'doc-1', '- [ ] A'); assert.equal(only(reopened).done, false);
  assert.equal(model.latestProgress(reopened, 'line-0'), null);
});
test('subcheck completion neither creates progress nor aggregates into tracked parent progress', () => {
  const { state, taskId } = withProgress('- [ ] A\n  - [ ] child', 20);
  const next = model.updateSubcheck(state, 'doc-1', 'line-1', true);
  assert.equal(only(next).subchecks[0].done, true); assert.equal(only(next).done, false);
  assert.deepEqual(next.progressRecords, state.progressRecords); assert.equal(model.latestProgress(next, taskId).percent, 20);
});
test('changing the planned Task date does not move rewrite or synthesize progress snapshots', () => {
  const state = model.createState(), next = model.updateTask(state, trackedSeedId, { date: '2026-10-01' });
  assert.equal(taskById(next, trackedSeedId).date, '2026-10-01'); assert.deepEqual(next.progressRecords, state.progressRecords);
  assert.deepEqual(model.progressHistory(next, trackedSeedId).map(r => r.date), ['2026-09-07', '2026-09-08']);
});
test('restoring Task inherited date preserves its dated progress snapshots', () => {
  const { state, taskId } = withProgress('[2026-09-07]\n- [ ] A\n  - 날짜: 2026-09-20');
  const next = model.restoreTaskDate(state, taskId); assert.equal(only(next).date, '2026-09-07');
  assert.deepEqual(next.progressRecords, state.progressRecords);
});
test('recorded Task source reordering preserves history and current ownership', () => {
  const state = model.createState(), next = model.moveSubtree(state, 'flow-move-d30', trackedSeedId, null);
  assert.notEqual(next, state); assert.deepEqual(next.progressRecords, state.progressRecords);
  assert.equal(taskById(next, trackedSeedId).date, taskById(state, trackedSeedId).date);
  assert.equal(taskById(next, trackedSeedId).scopeId, 'flow-move-d30');
});
test('moving only a reference leaves original Flow raw text and all progress untouched', () => {
  const state = model.createState(), next = model.moveSubtree(state, 'd-move', 'd-move-line-10', 'd-move-line-9');
  assert.notEqual(next, state); assert.deepEqual(next.flows, state.flows); assert.deepEqual(next.progressRecords, state.progressRecords);
});
test('Flow and folder renames retain the same progress canonical identity', () => {
  const state = model.createState(), renamed = model.renameScope(model.renameScope(state, 'folder-move', '새 폴더명'), 'flow-move-d30', '새 Flow명');
  assert(model.validate(renamed)); assert.deepEqual(renamed.progressRecords, state.progressRecords);
  assert.equal(model.scopeTasks(renamed, 'flow-move-d30').filter(task => task.id === trackedSeedId).length, 1);
});
test('recorded Tasks cannot be removed explicitly even with no references', () => {
  const { state, taskId } = withProgress('- [ ] A\n  - 메모: 보존\n- [ ] B');
  assert.equal(model.removeTask(state, taskId), state); assert.equal(model.tasks(state).length, 2);
});
test('raw removal clearing or conversion of a recorded Task fails closed without losing history', () => {
  const { state } = withProgress('- [ ] A\n- [ ] B');
  for (const text of ['', '- [ ] B', '일반 문장 A\n- [ ] B', '- [ ] \n- [ ] B', '```\n- [ ] A\n```\n- [ ] B'])
    assert.equal(model.editText(state, 'doc-1', text), state);
});
test('unrecorded Task removal remains allowed and leaves another Task history intact', () => {
  const { state } = withProgress('- [ ] A\n- [ ] B'), next = model.removeTask(state, 'line-1');
  assert.notEqual(next, state); assert.equal(model.tasks(next).length, 1); assert.deepEqual(next.progressRecords, state.progressRecords);
});
test('removing a local reference does not delete or detach its original progress records', () => {
  const state = model.createState(), next = model.unlink(state, 'd-move', 'd-move-line-9');
  assert.notEqual(next, state); assert.deepEqual(next.progressRecords, state.progressRecords);
  assert.deepEqual(model.latestProgress(next, trackedSeedId), { date: '2026-09-08', percent: 20 });
});
test('unwrapping a scope preserves progress records of original Tasks and imported references', () => {
  const state = model.createState(), next = model.unlink(state, 'd-move', 'd-move-line-8');
  assert.notEqual(next, state); assert.deepEqual(next.progressRecords, state.progressRecords);
  assert.equal(model.tasks(next).filter(t => t.id === trackedSeedId).length, 1);
});
test('percent-looking TXT titles and ordinary properties are never parsed as progress', () => {
  const state = single('- [ ] 작업 [20%]\n  - 진행: 30%\n일반 문장 100%');
  assert(model.validate(state)); assert.deepEqual(state.progressRecords, []); assert.equal(model.latestProgress(state, 'line-0'), null);
  assert.equal(only(state).title, '작업 [20%]'); assert.equal(only(state).done, false);
});
test('schema rejects malformed percentages dates unknown fields and duplicate Task-date pairs', () => {
  const state = model.createState();
  for (const mutate of [
    s => { s.progressRecords = null; }, s => { delete s.progressRecords; }, s => { s.progressRecords[0].percent = 101; },
    s => { s.progressRecords[0].percent = 1.5; }, s => { s.progressRecords[0].percent = '10'; }, s => { s.progressRecords[0].date = null; },
    s => { s.progressRecords[0].date = '2026-02-30'; }, s => { s.progressRecords[0].extra = true; },
    s => { s.progressRecords.push(clone(s.progressRecords[0])); }, s => { s.progressRecords[0].taskId = 'missing'; },
    s => { s.progressRecords[0].taskId = 'd-move-line-9'; }, s => { s.progressRecords[0].taskId = 'd-move-line-8'; }
  ]) { const invalid = clone(state); mutate(invalid); assert.equal(model.validate(invalid), false); }
});
test('schema rejects snapshot completion mismatch even if source references agree with each other', () => {
  const invalid = clone(model.createState());
  invalid.flows[0].lines[2].text = invalid.flows[0].lines[2].text.replace('[ ]', '[x]');
  invalid.documents[0].lines[8].text = invalid.documents[0].lines[8].text.replace('[ ]', '[x]');
  assert.equal(model.validate(invalid), false); assert.equal(model.write(storage(), invalid, null).reason, 'invalid-state');
});
test('schema rejects a deleted recorded source even after its taskScopes and refs were cleaned', () => {
  const { state, taskId } = withProgress(), invalid = clone(state);
  invalid.documents[0].lines = []; delete invalid.taskScopes[taskId];
  assert.equal(model.validate(invalid), false); assert.equal(model.read(storage({ [model.KEY]: JSON.stringify(invalid) })).reason, 'invalid-schema');
});
test('progress history query returns detached values and cannot mutate stored records', () => {
  const state = model.createState(), before = JSON.stringify(state), history = model.progressHistory(state, trackedSeedId), latest = model.latestProgress(state, trackedSeedId);
  history[0].percent = 99; history.reverse(); latest.percent = 100;
  assert.equal(JSON.stringify(state), before); assert.equal(model.latestProgress(state, trackedSeedId).percent, 20);
});
test('missing inputs malformed states and foreign IDs safely return no-op or empty history', () => {
  const state = model.createState();
  for (const [value, id] of [[state, 'missing'], [null, trackedSeedId], [{}, trackedSeedId], [state, null]]) {
    assert.equal(model.recordProgress(value, id, '2026-09-08', 20), value);
    assert.deepEqual(model.progressHistory(value, id), []); assert.equal(model.latestProgress(value, id), null);
  }
});
test('record upserts accept deeply frozen states without mutating shared documents or sidecars', () => {
  const state = model.createState(), before = JSON.stringify(state);
  function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } }
  freeze(state); const next = model.recordProgress(state, trackedSeedId, '2026-09-09', 100);
  assert.notEqual(next, state); assert.equal(JSON.stringify(state), before); assert(model.validate(next));
});
test('date-record capacity is fail-closed while an existing date remains editable', () => {
  const state = single('- [ ] A');
  state.progressRecords = Array.from({ length: 10000 }, (_, i) => ({ taskId: 'line-0', date: new Date(Date.UTC(2000, 0, 1 + i)).toISOString().slice(0, 10), percent: 20 }));
  assert(model.validate(state)); assert.equal(model.recordProgress(state, 'line-0', '2040-01-01', 20), state);
  const next = model.recordProgress(state, 'line-0', '2000-01-01', 10); assert.notEqual(next, state); assert.equal(next.progressRecords.length, 10000);
  const invalid = clone(state); invalid.progressRecords.push({ taskId: 'line-0', date: '2040-01-01', percent: 20 }); assert.equal(model.validate(invalid), false);
});
test('v8 key ignores v7 bytes and rejects schema7 placed at the v8 key without migration', () => {
  const key = 'flowme:ux-review:text-workspace-v7:20260908', store = storage({ [key]: 'older serialized bytes' });
  assert.equal(model.read(store).state.version, 11); assert.deepEqual(store.calls, [['get', model.KEY]]);
  assert.equal(store.data.get(key), 'older serialized bytes');
  const older = clone(model.createState()); older.version = 7; delete older.progressRecords;
  assert.equal(model.read(storage({ [model.KEY]: JSON.stringify(older) })).reason, 'invalid-schema');
});
test('record histories survive same-key write read and JSON snapshot Undo Redo exactly', () => {
  const before = model.createState(), after = model.recordProgress(before, trackedSeedId, '2026-09-09', 100), store = storage(); let expected = null;
  for (const snapshot of [before, after, before, after]) {
    const result = model.write(store, clone(snapshot), expected); assert(result.ok); expected = result.serialized;
    const read = model.read(store); assert.deepEqual(read.state, snapshot); assert.deepEqual(model.progressHistory(read.state, trackedSeedId), model.progressHistory(snapshot, trackedSeedId));
  }
});
test('progress persistence failure and conflict cannot overwrite a newer serialized snapshot', () => {
  const before = model.createState(), changed = model.recordProgress(before, trackedSeedId, '2026-09-09', 50);
  const oldBytes = JSON.stringify(before), newerBytes = JSON.stringify(model.recordProgress(before, trackedSeedId, '2026-09-10', 80));
  const conflict = storage({ [model.KEY]: newerBytes }); assert.equal(model.write(conflict, changed, oldBytes).reason, 'conflict'); assert.equal(conflict.data.get(model.KEY), newerBytes);
  const quota = storage({ [model.KEY]: oldBytes }); quota.setItem = () => { throw new Error('quota'); };
  assert.equal(model.write(quota, changed, oldBytes).reason, 'storage-unavailable'); assert.equal(quota.data.get(model.KEY), oldBytes);
  const lost = storage({ [model.KEY]: oldBytes }); lost.setItem = () => {};
  assert.equal(model.write(lost, changed, oldBytes).reason, 'readback-failed'); assert.equal(lost.data.get(model.KEY), oldBytes);
});

// v9 numeric marks preserve spelling; dates remain sidecar snapshot identity.
function editMark(state, docId, lineId, token, options) {
  const doc = model.getDocument(state, docId);
  return model.editText(state, docId, doc.lines.map(line => line.id === lineId ? line.text.replace(/\[[^\]]*\]/, '[' + token + ']') : line.text).join('\n'), options);
}
function numericFixture(token = '20%', date = '2026-09-07') {
  const initial = single('[' + date + ']\n- [ ] A');
  const state = editMark(initial, 'doc-1', 'line-1', token); assert.notEqual(state, initial); assert(model.validate(state)); return state;
}

test('progress token parser publishes exact kinds with unbracketed string inputs', () => {
  assert.deepEqual(model.parseProgressToken('20%'), { ok: true, percent: 20, kind: 'percent' });
  assert.deepEqual(model.parseProgressToken('20'), { ok: true, percent: 20, kind: 'integer' });
  assert.deepEqual(model.parseProgressToken('0.2'), { ok: true, percent: 20, kind: 'ratio' });
  for (const token of ['[20%]', ' ', 'x', 20, null, undefined, {}, []]) assert.deepEqual(model.parseProgressToken(token), { ok: false, percent: null, kind: null });
});
test('lexical integer one means one percent while decimal one means one hundred', () => {
  for (const [token, percent] of [['1', 1], ['1.0', 100], ['1.00', 100], ['0.01', 1], ['0.0100', 1]]) assert.equal(model.parseProgressToken(token).percent, percent);
});
test('explicit percent wins over ratio notation but its value must be an integer', () => {
  for (const [token, percent] of [['1.0%', 1], ['20.0%', 20], ['100.000%', 100], ['0.00%', 0]]) assert.equal(model.parseProgressToken(token).percent, percent);
  for (const token of ['1.5%', '0.2%', '20.01%', '100.001%', '101%']) assert.equal(model.parseProgressToken(token).ok, false);
});
test('ratio conversion is exact for every hundredth without floating-point rounding', () => {
  for (let percent = 0; percent < 100; percent++) {
    const token = '0.' + String(percent).padStart(2, '0'); assert.equal(model.parseProgressToken(token).percent, percent);
    assert.equal(model.parseProgressToken(token + '000').percent, percent);
  }
  for (const token of ['0.001', '0.291', '0.999', '1.001', '20.0']) assert.equal(model.parseProgressToken(token).ok, false);
});
test('numeric syntax rejects signs exponent partial decimal whitespace and nonfinite forms', () => {
  for (const token of ['-1', '+20', '.2', '1.', '1.%', '1e2', 'NaN', 'Infinity', '', ' 20', '20 ', '20 %', '2 0', '101', '9'.repeat(400)])
    assert.equal(model.parseProgressToken(token).ok, false, token);
});
test('zero and hundred lexical numeric endpoints derive current completion correctly', () => {
  for (const [token, percent] of [['0', 0], ['0%', 0], ['0.0', 0], ['100', 100], ['100%', 100], ['1.0', 100]]) {
    const state = numericFixture(token); assert.equal(only(state).done, percent === 100); assert.equal(model.latestProgress(state, 'line-1').percent, percent);
    assert.equal(state.documents[0].lines[1].text, '- [' + token + '] A');
  }
});
test('equivalent twenty percent spellings create equal progress without normalizing source', () => {
  for (const token of ['20%', '20', '0.2', '0.20', '20.0%']) {
    const state = numericFixture(token); assert.equal(model.latestProgress(state, 'line-1').percent, 20);
    assert.equal(state.documents[0].lines[1].text, '- [' + token + '] A'); assert.equal(only(state).id, 'line-1');
    const row = model.rowMeta(state, 'doc-1')[1]; assert.equal(row.progressToken, token); assert.equal(row.progressPercent, 20);
  }
});
test('numeric canonical Tasks remain one Task with source token metadata and stable identity', () => {
  const state = numericFixture('0.2'), task = only(state);
  assert.equal(model.tasks(state).length, 1); assert.equal(task.inputToken, '0.2'); assert.equal(task.inputPercent, 20); assert.equal(task.id, 'line-1');
  assert.equal(task.scopeId, 'folder-life'); assert.equal(task.date, '2026-09-07');
});
test('a complete numeric Task pasted into an empty document records once with explicit fallback', () => {
  const initial = single(''), state = model.editText(initial, 'doc-1', '- [20%] 새 할 일', { progressDate: '2026-09-08' });
  assert.notEqual(state, initial); assert.equal(model.tasks(state).length, 1); assert.equal(state.progressRecords.length, 1);
  assert.equal(state.progressRecords[0].taskId, only(state).id); assert.equal(only(state).date, null);
});
test('new numeric input without a date or explicit fallback is rejected atomically', () => {
  const state = single('- [ ] A'); assert.equal(editMark(state, 'doc-1', 'line-0', '20%'), state);
  assert.deepEqual(state.progressRecords, []); assert.equal(state.documents[0].lines[0].text, '- [ ] A');
});
test('valid fallback dates are used only when the input line has no assigned date', () => {
  const initial = single('- [ ] A'), fallback = editMark(initial, 'doc-1', 'line-0', '20', { progressDate: '2026-09-08' });
  assert.deepEqual(model.progressHistory(fallback, 'line-0'), [{ date: '2026-09-08', percent: 20 }]);
  const dated = single('[2026-09-07]\n- [ ] A'), next = editMark(dated, 'doc-1', 'line-1', '20', { progressDate: '2026-09-09' });
  assert.equal(next.progressRecords[0].date, '2026-09-07');
});
test('a direct individual date overrides the common section and fallback for numeric input', () => {
  const initial = single('[2026-09-07]\n- [ ] A\n  - 날짜: 2026-09-10');
  const next = editMark(initial, 'doc-1', 'line-1', '20', { progressDate: '2026-09-09' });
  assert.equal(next.progressRecords[0].date, '2026-09-10'); assert.equal(only(next).date, '2026-09-10');
});
test('explicit undated source accepts only an explicit fallback for a new numeric record', () => {
  const initial = single('[2026-09-07]\n- [ ] A\n  - 날짜: 미정');
  assert.equal(editMark(initial, 'doc-1', 'line-1', '20'), initial);
  const next = editMark(initial, 'doc-1', 'line-1', '20', { progressDate: '2026-09-09' });
  assert.equal(next.progressRecords[0].date, '2026-09-09'); assert.equal(only(next).date, null);
});
test('invalid source dates cannot silently fall through to an otherwise valid fallback', () => {
  for (const source of ['[2026-02-30]\n- [ ] A', '[2026-09-07]\n- [ ] A\n  - 날짜: 2026-02-30']) {
    const initial = single(source); assert.equal(editMark(initial, 'doc-1', 'line-1', '20', { progressDate: '2026-09-09' }), initial);
  }
});
test('a valid individual date can override an invalid common section without guessing', () => {
  const initial = single('[2026-02-30]\n- [ ] A\n  - 날짜: 2026-09-10'), next = editMark(initial, 'doc-1', 'line-1', '20');
  assert.notEqual(next, initial); assert.equal(next.progressRecords[0].date, '2026-09-10');
});
test('malformed editText option objects and fallback dates are rejected safely', () => {
  const state = single('- [ ] A');
  for (const options of [null, [], true, { unknown: true }, { progressDate: null }, { progressDate: '미정' }, { progressDate: '2026-02-30' }, { progressDate: undefined }])
    assert.equal(editMark(state, 'doc-1', 'line-0', '20', options), state);
});
test('same numeric value with another spelling never records on a new fallback date', () => {
  let state = numericFixture('20%'); const records = clone(state.progressRecords);
  for (const token of ['20', '0.2', '0.20', '20.0%']) {
    const next = editMark(state, 'doc-1', 'line-1', token, { progressDate: '2026-10-01' });
    assert.notEqual(next, state); assert.deepEqual(next.progressRecords, records); state = next;
  }
});
test('a real percent change upserts that day instead of duplicating source or history', () => {
  const state = numericFixture('1'), next = editMark(state, 'doc-1', 'line-1', '1.0');
  assert.equal(next.progressRecords.length, 1); assert.equal(next.progressRecords[0].percent, 100); assert.equal(only(next).done, true);
  assert.equal(next.documents[0].lines[1].text, '- [1.0] A'); assert.equal(only(next).id, 'line-1');
});
test('renaming a numeric Task changes its title without replaying its original percentage', () => {
  const source = numericFixture('20'), newer = model.recordProgress(source, 'line-1', '2026-09-08', 80);
  const next = model.editText(newer, 'doc-1', model.raw(newer.documents[0]).replace('] A', '] 바꾼 이름'), { progressDate: '2026-09-09' });
  assert.equal(only(next).title, '바꾼 이름'); assert.deepEqual(next.progressRecords, newer.progressRecords); assert.equal(model.latestProgress(next, 'line-1').percent, 80);
});
test('changing a date section alone does not move or duplicate an existing progress snapshot', () => {
  const state = numericFixture('20'), next = model.editText(state, 'doc-1', model.raw(state.documents[0]).replace('2026-09-07', '2026-09-08'));
  assert.notEqual(next, state); assert.equal(only(next).date, '2026-09-08'); assert.deepEqual(next.progressRecords, state.progressRecords);
});
test('a later actual numeric change uses the current input section after a date-only edit', () => {
  const state = numericFixture('20'), movedDate = model.editText(state, 'doc-1', model.raw(state.documents[0]).replace('2026-09-07', '2026-09-08'));
  const next = editMark(movedDate, 'doc-1', 'line-1', '30');
  assert.deepEqual(model.progressHistory(next, 'line-1'), [{ date: '2026-09-07', percent: 20 }, { date: '2026-09-08', percent: 30 }]);
});
test('source reordering numeric rows preserves percentages dates identities and records', () => {
  const initial = single('[2026-09-07]\n- [ ] A\n- [ ] B'), state = editMark(initial, 'doc-1', 'line-1', '20');
  const next = model.moveSubtree(state, 'doc-1', 'line-1', null);
  assert.notEqual(next, state); assert.deepEqual(next.progressRecords, state.progressRecords);
  assert.equal(next.documents[0].lines.at(-1).text, '- [20] A'); assert.equal(taskById(next, 'line-1').id, 'line-1');
});
test('numeric historical 100 and latest 20 coexist without normalizing original source', () => {
  const source = numericFixture('100'), next = model.recordProgress(source, 'line-1', '2026-09-08', 20);
  assert.equal(next.documents[0].lines[1].text, '- [100] A'); assert.equal(only(next).inputPercent, 100); assert.equal(only(next).done, false);
  assert.equal(model.latestProgress(next, 'line-1').percent, 20); assert(model.validate(next));
});
test('editing an older numeric input does not override a later current completion snapshot', () => {
  let state = numericFixture('10'); state = model.recordProgress(state, 'line-1', '2026-09-08', 20);
  const next = editMark(state, 'doc-1', 'line-1', '100');
  assert.equal(only(next).done, false); assert.equal(model.latestProgress(next, 'line-1').percent, 20);
  assert.deepEqual(model.progressHistory(next, 'line-1').map(r => r.percent), [100, 20]); assert.equal(next.documents[0].lines[1].text, '- [100] A');
});
test('progress dialog updates current records without erasing numeric spelling', () => {
  const state = numericFixture('0.20'), next = model.recordProgress(state, 'line-1', '2026-09-08', 100);
  assert.equal(next.documents[0].lines[1].text, '- [0.20] A'); assert.equal(only(next).done, true);
  const renamed = model.updateTask(next, 'line-1', { title: '원문 보존' }); assert.equal(renamed.documents[0].lines[1].text, '- [0.20] 원문 보존');
});
test('numeric reference input records against its canonical ID using reference placement date', () => {
  const state = model.createState(), next = editMark(state, 'd-move', 'd-move-line-9', '30');
  assert.notEqual(next, state); assert.equal(model.tasks(next).length, 7);
  assert.deepEqual(model.progressHistory(next, trackedSeedId), [{ date: '2026-09-07', percent: 30 }, { date: '2026-09-08', percent: 20 }]);
  assert.equal(taskById(next, trackedSeedId).date, '2026-09-08'); assert.equal(next.documents[0].lines[8].text, '    - [30] 이사업체 견적 비교');
});
test('a numeric reference can record historical 100 while source and current completion stay partial', () => {
  const state = model.createState(), next = editMark(state, 'd-move', 'd-move-line-9', '1.0');
  assert.equal(next.documents[0].lines[8].text, '    - [1.0] 이사업체 견적 비교'); assert.equal(next.flows[0].lines[2].text, state.flows[0].lines[2].text);
  assert.equal(taskById(next, trackedSeedId).done, false); assert.equal(model.latestProgress(next, trackedSeedId).percent, 20);
});
test('numeric reference title edits synchronize titles but preserve each line token spelling', () => {
  const initial = model.createState(), sourceNumeric = editMark(initial, 'flow-move-d30', trackedSeedId, '0.2');
  const withRef = editMark(sourceNumeric, 'd-move', 'd-move-line-9', '10%');
  const next = model.editText(withRef, 'd-move', model.raw(withRef.documents[0]).replace('이사업체 견적 비교', '제목 수정'));
  assert.equal(next.documents[0].lines[8].text, '    - [10%] 제목 수정'); assert.equal(next.flows[0].lines[2].text, '- [0.2] 제목 수정');
  assert.deepEqual(next.progressRecords, withRef.progressRecords);
});
test('numeric updates keep literal references synchronized without rewriting numeric references', () => {
  let state = model.createState(); state = editMark(state, 'flow-move-d30', trackedSeedId, '20');
  state = editMark(state, 'd-move', 'd-move-line-9', '10%');
  state = appendLine(state, 'd-life'); state = model.linkTask(state, 'd-life', state.documents[1].lines.length - 1, trackedSeedId);
  const ref = state.bindings.find(b => b.kind === 'task' && b.docId === 'd-life'), next = model.recordProgress(state, trackedSeedId, '2026-09-09', 100);
  assert.equal(next.documents[0].lines[8].text, '    - [10%] 이사업체 견적 비교');
  assert(model.getDocument(next, 'd-life').lines.find(l => l.id === ref.lineId).text.startsWith('- [x]'));
  assert.equal(next.flows[0].lines[2].text, '- [20] 이사업체 견적 비교'); assert.equal(taskById(next, trackedSeedId).done, true);
});
test('two references with conflicting numeric input for one Task-date reject the entire edit', () => {
  let { state, taskId } = linkedFixture(); state = appendLine(state, 'd-life', '사이 메모\n');
  state = model.linkTask(state, 'd-life', model.getDocument(state, 'd-life').lines.length - 1, taskId);
  const refs = state.bindings.filter(b => b.kind === 'task' && b.docId === 'd-life'), doc = model.getDocument(state, 'd-life');
  const raw = doc.lines.map(l => l.id === refs[0].lineId ? '- [10] ' + taskById(state, taskId).title : l.id === refs[1].lineId ? '- [20] ' + taskById(state, taskId).title : l.text).join('\n');
  assert.equal(model.editText(state, 'd-life', raw), state); assert.deepEqual(state.progressRecords, []);
});
test('two references on different dates create two snapshots of the same canonical Task', () => {
  let { state, taskId } = linkedFixture(); state = appendLine(state, 'd-life', '[2026-09-08]\n');
  state = model.linkTask(state, 'd-life', model.getDocument(state, 'd-life').lines.length - 1, taskId);
  const refs = state.bindings.filter(b => b.kind === 'task' && b.docId === 'd-life'), doc = model.getDocument(state, 'd-life');
  const raw = doc.lines.map(l => l.id === refs[0].lineId ? '- [100] ' + taskById(state, taskId).title : l.id === refs[1].lineId ? '- [20] ' + taskById(state, taskId).title : l.text).join('\n');
  const next = model.editText(state, 'd-life', raw); assert.notEqual(next, state);
  assert.deepEqual(model.progressHistory(next, taskId), [{ date: '2026-09-07', percent: 100 }, { date: '2026-09-08', percent: 20 }]);
  assert.equal(model.tasks(next).length, 7); assert.equal(taskById(next, taskId).done, false);
});
test('same-day equal numeric input through two refs deduplicates only that Task-date record', () => {
  let { state, taskId } = linkedFixture(); state = appendLine(state, 'd-life', '사이\n');
  state = model.linkTask(state, 'd-life', model.getDocument(state, 'd-life').lines.length - 1, taskId);
  const refs = state.bindings.filter(b => b.kind === 'task' && b.docId === 'd-life'), ids = new Set(refs.map(r => r.lineId));
  const next = model.editText(state, 'd-life', model.getDocument(state, 'd-life').lines.map(l => ids.has(l.id) ? l.text.replace('[ ]', '[20%]') : l.text).join('\n'));
  assert.notEqual(next, state); assert.equal(next.progressRecords.length, 1); assert.equal(model.tasks(next).length, 7);
});
test('partial numeric editing never replaces existing IDs or loses recorded history', () => {
  const state = numericFixture('20'), before = JSON.stringify(state);
  for (const mark of ['[', '[0.', '[1.', '[20', '[20%', '[.2]', '[1.]', '[20.0]', '[NaN]', '[ 20]', '[-1]', '[101]']) {
    assert.equal(model.editText(state, 'doc-1', '[2026-09-07]\n- ' + mark + ' A'), state, mark);
    assert.equal(JSON.stringify(state), before);
  }
});
test('mixed valid numeric and invalid numeric lines reject one whole source transaction', () => {
  const state = single('[2026-09-07]\n- [ ] A\n- [ ] B');
  assert.equal(model.editText(state, 'doc-1', '[2026-09-07]\n- [20] A\n- [20.0] B'), state); assert.deepEqual(state.progressRecords, []);
});
test('an empty numeric scaffold keeps a Task row but records nothing before title entry', () => {
  const initial = single('- [ ] '), staged = model.editText(initial, 'doc-1', '- [20%] ');
  assert.notEqual(staged, initial); assert(model.validate(staged)); assert.equal(model.rowMeta(staged, 'doc-1')[0].kind, 'task');
  assert.equal(model.tasks(staged).length, 0); assert.deepEqual(staged.progressRecords, []); assert.equal(staged.documents[0].lines[0].id, 'line-0');
  const next = model.editText(staged, 'doc-1', '- [20%] 작성한 제목', { progressDate: '2026-09-08' });
  assert.notEqual(next, staged); assert.equal(only(next).id, 'line-0'); assert.equal(next.progressRecords[0].percent, 20);
});
test('titleless numeric marks can finish their title only with a resolved record date', () => {
  const initial = single(''), staged = model.editText(initial, 'doc-1', '- [20]'); assert.notEqual(staged, initial);
  assert.equal(model.editText(staged, 'doc-1', '- [20] A'), staged);
  const next = model.editText(staged, 'doc-1', '- [20] A', { progressDate: '2026-09-08' }); assert.notEqual(next, staged); assert.equal(only(next).inputPercent, 20);
});
test('v10 numeric subchecks and scaffolds retain child identity without Task promotion', () => {
  const state = single('[2026-09-07]\n- [ ] A\n  - [ ] child');
  const next = model.editText(state, 'doc-1', '[2026-09-07]\n- [ ] A\n  - [20] child');
  assert.notEqual(next, state); assert.equal(model.tasks(next).length, 1); assert.equal(only(next).subchecks[0].id, 'line-2');
  assert.equal(model.latestProgress(next, 'line-2').percent, 20); assert.equal(only(next).done, false);
  const staged = model.editText(state, 'doc-1', '[2026-09-07]\n- [ ] A\n  - [20] ');
  assert.notEqual(staged, state); assert.deepEqual(staged.progressRecords, []); assert.equal(model.tasks(staged).length, 1);
});
test('numeric text under ordinary unconfirmed prose creates a Task without an automatic folder binding', () => {
  const state = single('일반 메모\n  작성 중');
  const next = model.editText(state, 'doc-1', '일반 메모\n  - [20] 항목', { progressDate: '2026-09-08' });
  assert.notEqual(next,state); assert.equal(model.tasks(next).length,1); assert.equal(model.latestProgress(next,model.tasks(next)[0].id).percent,20); assert.deepEqual(next.bindings,[]);
});
test('numeric and malformed marks inside code fences remain verbatim ordinary code', () => {
  const state = single('- [ ] A'), next = model.editText(state, 'doc-1', '- [ ] A\n```\n- [20.0] 코드\n- [0.2] 코드\n- [\n```');
  assert.notEqual(next, state); assert.equal(model.tasks(next).length, 1); assert.deepEqual(next.progressRecords, []);
  assert(model.raw(next.documents[0]).includes('- [20.0] 코드'));
});
test('bracketed ordinary notes and Markdown links are not promoted into progress Tasks', () => {
  const state = single('- [문서] 일반 메모\n- [참고](https://example.test)\n- [20](https://example.test)\n일반문장 [20%]');
  assert(model.validate(state)); assert.equal(model.tasks(state).length, 0); assert.deepEqual(state.progressRecords, []);
});
test('same-title numeric Tasks retain distinct identities and independent records', () => {
  const initial = single('[2026-09-07]\n- [ ] 같은 제목\n- [ ] 같은 제목');
  const first = editMark(initial, 'doc-1', 'line-1', '10'), next = editMark(first, 'doc-1', 'line-2', '20');
  assert.notEqual(next, initial); assert.deepEqual(model.tasks(next).map(t => t.id), ['line-1', 'line-2']);
  assert.deepEqual(next.progressRecords.map(r => [r.taskId, r.percent]), [['line-1', 10], ['line-2', 20]]);
});
test('ambiguous simultaneous numeric rewrites of duplicate-title Tasks preserve the prior state', () => {
  const state = single('[2026-09-07]\n- [ ] 같은 제목\n- [ ] 같은 제목');
  assert.equal(model.editText(state, 'doc-1', '[2026-09-07]\n- [10] 같은 제목\n- [20] 같은 제목'), state);
});
test('recorded numeric Task deletion and clearing remain blocked while planning survives nesting', () => {
  const state = numericFixture('20');
  for (const source of ['', '[2026-09-07]', '[2026-09-07]\n- [ ] ']) assert.equal(model.editText(state, 'doc-1', source), state);
  const next=model.editText(state,'doc-1','[2026-09-07]\n- [ ] 새 부모\n  - [20] A'); assert.notEqual(next,state); assert.equal(model.latestProgress(next,'line-1').percent,20);
  assert.equal(model.removeTask(state, 'line-1'), state);
});
test('legacy literal checkbox edits do not become progress zero or hundred records', () => {
  const initial = single('- [ ] A'), complete = model.editText(initial, 'doc-1', '- [x] A');
  assert.equal(only(complete).done, true); assert.deepEqual(complete.progressRecords, []);
  const tracked = numericFixture('20'); assert.equal(editMark(tracked, 'doc-1', 'line-1', 'x'), tracked);
  const blank = editMark(tracked, 'doc-1', 'line-1', ' '); assert.notEqual(blank, tracked); assert.deepEqual(blank.progressRecords, tracked.progressRecords);
});
test('a current tracked hundred cannot be bypassed by replacing its numeric mark with empty checkbox', () => {
  const state = numericFixture('100'); assert.equal(editMark(state, 'doc-1', 'line-1', ' '), state);
  assert.equal(model.updateTask(state, 'line-1', { done: false }), state); assert.equal(only(state).done, true);
});
test('same source numeric title and ordinary date or note helpers preserve lexical spelling and records', () => {
  const state = numericFixture('0.20'), next = model.updateTask(state, 'line-1', { title: '새 이름', date: '2026-10-01', note: '메모' });
  assert.notEqual(next, state); assert.equal(next.documents[0].lines[1].text, '- [0.20] 새 이름'); assert.deepEqual(next.progressRecords, state.progressRecords);
});
test('numeric source with no canonical record is rejected by validation and storage', () => {
  const invalid = single('[2026-09-07]\n- [20] A'); assert.equal(model.validate(invalid), false);
  assert.equal(model.write(storage(), invalid, null).reason, 'invalid-state'); assert.equal(model.read(storage({ [model.KEY]: JSON.stringify(invalid) })).reason, 'invalid-schema');
});
test('numeric reference cannot bypass missing canonical progress records in serialized state', () => {
  const invalid = model.createState(); invalid.progressRecords = []; invalid.documents[0].lines[8].text = '    - [20] 이사업체 견적 비교';
  assert.equal(model.validate(invalid), false);
});
test('v9 remains isolated from v8 key schema and saved numeric data', () => {
  const key = 'flowme:ux-review:text-workspace-v8:20260908', store = storage({ [key]: 'v8 bytes' });
  assert.equal(model.KEY, 'flowme:ux-review:text-workspace-v11:20260908'); assert.equal(model.read(store).state.version, 11);
  assert.deepEqual(store.calls, [['get', model.KEY]]); assert.equal(store.data.get(key), 'v8 bytes');
  const older = clone(model.createState()); older.version = 8; assert.equal(model.read(storage({ [model.KEY]: JSON.stringify(older) })).reason, 'invalid-schema');
});
test('numeric source lexical spelling and history survive JSON Undo Redo and reload', () => {
  const before = numericFixture('1'), after = editMark(before, 'doc-1', 'line-1', '1.0'), store = storage(); let expected = null;
  for (const state of [before, after, before, after]) {
    const result = model.write(store, clone(state), expected); assert(result.ok); expected = result.serialized;
    assert.deepEqual(model.read(store).state, state); assert.equal(model.read(store).state.documents[0].lines[1].text, state.documents[0].lines[1].text);
  }
});
test('numeric raw edit returns an immutable candidate and quota or conflict preserves saved data', () => {
  const state = numericFixture('20'), snapshot = JSON.stringify(state), next = editMark(state, 'doc-1', 'line-1', '30');
  assert.equal(JSON.stringify(state), snapshot); const store = storage({ [model.KEY]: snapshot }); store.setItem = () => { throw new Error('quota'); };
  assert.equal(model.write(store, next, snapshot).reason, 'storage-unavailable'); assert.equal(store.data.get(model.KEY), snapshot);
  const conflict = storage({ [model.KEY]: 'newer bytes' }); assert.equal(model.write(conflict, next, snapshot).reason, 'conflict'); assert.equal(conflict.data.get(model.KEY), 'newer bytes');
});
test('a numeric mark missing the title separator is rejected instead of becoming ordinary text', () => {
  const state = single('- [ ] A'); assert.equal(model.editText(state, 'doc-1', '- [20]A', { progressDate: '2026-09-08' }), state);
});
test('nested numeric Task date updates replace the original property instead of duplicating it', () => {
  let state = model.createState(); state = editMark(state, 'd-move', 'd-move-line-4', '20');
  state = model.updateTask(state, 'd-move-line-4', { date: '2026-09-09', note: '보존', time: '09:00' });
  const previous = state.documents[0].lines.filter(line => /날짜:|메모:|시간:/.test(line.text));
  const next = model.updateTask(state, 'd-move-line-4', { date: '2026-09-10', note: '수정', time: '10:00' });
  assert.notEqual(next, state); assert.equal(next.documents[0].lines.filter(line => /날짜:/.test(line.text)).length, 1);
  assert.equal(taskById(next, 'd-move-line-4').note, '수정'); assert.equal(taskById(next, 'd-move-line-4').time, '10:00');
  assert.deepEqual(next.documents[0].lines.filter(line => /날짜:|메모:|시간:/.test(line.text)).map(line => line.id), previous.map(line => line.id));
  assert.deepEqual(next.progressRecords, state.progressRecords);
});
test('a literal checkbox request conflicting with a simultaneous numeric ref record rejects atomically', () => {
  let { state, taskId } = linkedFixture(); state = appendLine(state, 'd-life', '사이\n');
  state = model.linkTask(state, 'd-life', model.getDocument(state, 'd-life').lines.length - 1, taskId);
  const refs = state.bindings.filter(b => b.kind === 'task' && b.docId === 'd-life'), doc = model.getDocument(state, 'd-life');
  const source = doc.lines.map(line => line.id === refs[0].lineId ? line.text.replace('[ ]', '[20]') : line.id === refs[1].lineId ? line.text.replace('[ ]', '[x]') : line.text).join('\n');
  assert.equal(model.editText(state, 'd-life', source), state); assert.deepEqual(state.progressRecords, []);
});
test('new numeric input respects the record limit while equivalent lexical edits do not add records', () => {
  const state = numericFixture('20');
  state.progressRecords = Array.from({ length: 10000 }, (_, i) => ({ taskId: 'line-1', date: new Date(Date.UTC(2000, 0, 1 + i)).toISOString().slice(0, 10), percent: 20 }));
  assert(model.validate(state)); const restated = editMark(state, 'doc-1', 'line-1', '0.2'); assert.notEqual(restated, state); assert.equal(restated.progressRecords.length, 10000);
  const undated = model.updateTask(state, 'line-1', { date: null }); assert.notEqual(undated, state);
  assert.equal(editMark(undated, 'doc-1', 'line-1', '30', { progressDate: '2040-01-01' }), undated);
});
test('updateSubcheck cannot create progress or edit a numeric canonical Task', () => {
  const numeric = numericFixture('20'); assert.equal(model.updateSubcheck(numeric, 'doc-1', 'line-1', true), numeric);
  const ordinary = single('- [ ] A\n  - [ ] child'), checked = model.updateSubcheck(ordinary, 'doc-1', 'line-1', true);
  assert.notEqual(checked, ordinary); assert.deepEqual(checked.progressRecords, []);
  const invalid = single('- [ ] A\n  - [20] child'); assert.equal(model.validate(invalid), false);
  assert.equal(model.updateSubcheck(invalid, 'doc-1', 'line-1', true), invalid);
});
test('freshly pasted same-title numeric Tasks create distinct IDs without title-based merging', () => {
  const initial = single(''), next = model.editText(initial, 'doc-1', '[2026-09-07]\n- [10] 같은 제목\n- [20] 같은 제목');
  assert.notEqual(next, initial); const tasks = model.tasks(next); assert.equal(tasks.length, 2); assert.notEqual(tasks[0].id, tasks[1].id);
  assert.deepEqual(tasks.map(task => model.latestProgress(next, task.id).percent), [10, 20]);
});

// v10 child progress uses source-line identity without adding canonical Tasks.
function childFixture(percent, date = '2026-09-07', text = '[2026-09-07]\n- [ ] 부모\n  - [ ] 하위\n  - [ ] 다른 하위') {
  const initial = single(text), child = model.rowMeta(initial, 'doc-1').find(row => row.kind === 'subcheck');
  const state = percent === undefined ? initial : model.recordProgress(initial, child.id, date, percent);
  assert(model.validate(state)); if (percent !== undefined) assert.notEqual(state, initial);
  return { state, childId: child.id, parentId: child.taskId };
}
function childRow(state, childId) { return model.rowMeta(state, 'doc-1').find(row => row.id === childId); }

test('v10 retains the seed and isolates schema10 storage from schema9', () => {
  const seed = model.createState(); assert.equal(seed.version, 11); assert.equal(model.KEY, 'flowme:ux-review:text-workspace-v11:20260908');
  assert.equal(model.tasks(seed).length, 7); assert.equal(seed.progressRecords.length, 2); assert.equal(model.latestProgress(seed, 'd-move-line-7'), null);
  const oldKey = 'flowme:ux-review:text-workspace-v9:20260908', store = storage({ [oldKey]: 'v9 bytes' });
  assert.equal(model.read(store).state.version, 11); assert.deepEqual(store.calls, [['get', model.KEY]]); assert.equal(store.data.get(oldKey), 'v9 bytes');
  const old = clone(seed); old.version = 9; assert.equal(model.read(storage({ [model.KEY]: JSON.stringify(old) })).reason, 'invalid-schema');
});
test('child progress uses its stable line ID and never adds a canonical Task or taskScope', () => {
  const { state, childId, parentId } = childFixture(20);
  assert.deepEqual(model.progressHistory(state, childId), [{ date: '2026-09-07', percent: 20 }]);
  assert.equal(state.progressRecords[0].taskId, childId); assert.equal(model.tasks(state).length, 1);
  assert.deepEqual(Object.keys(state.taskScopes), [parentId]); assert.equal(model.latestProgress(state, parentId), null);
});
test('child metadata exposes its own progress target but retains the canonical parent taskId', () => {
  const { state, childId, parentId } = childFixture(20), row = childRow(state, childId);
  assert.equal(row.kind, 'subcheck'); assert.equal(row.taskId, parentId); assert.equal(row.parentTaskId, parentId);
  assert.equal(row.progressTargetId, childId); assert.equal(row.progressTitle, '하위'); assert.equal(row.progressDate, '2026-09-07');
  assert.equal(row.task.id, parentId); assert.equal(row.done, false);
});
test('canonical and reference progress metadata resolve one canonical identity', () => {
  const state = model.createState(), source = model.rowMeta(state, 'flow-move-d30').find(row => row.id === trackedSeedId);
  const ref = model.rowMeta(state, 'd-move').find(row => row.id === 'd-move-line-9');
  assert.equal(source.progressTargetId, trackedSeedId); assert.equal(ref.progressTargetId, trackedSeedId);
  assert.equal(ref.progressTitle, source.progressTitle); assert.equal(ref.progressDate, source.progressDate);
});
test('child zero partial and hundred independently determine only child completion', () => {
  for (const percent of [0, 20, 100]) {
    const { state, childId, parentId } = childFixture(percent);
    assert.equal(childRow(state, childId).done, percent === 100); assert.equal(taskById(state, parentId).done, false);
    assert.equal(only(state).subchecks[1].done, false); assert.equal(model.latestProgress(state, childId).percent, percent);
  }
});
test('child records are dated cumulative snapshots rather than additions', () => {
  const { state, childId } = childFixture(10), next = model.recordProgress(state, childId, '2026-09-08', 20);
  assert.deepEqual(model.progressHistory(next, childId), [{ date: '2026-09-07', percent: 10 }, { date: '2026-09-08', percent: 20 }]);
  assert.equal(model.latestProgress(next, childId).percent, 20); assert.equal(model.tasks(next).length, 1);
});
test('same-day child edits upsert once and exact repeats are a no-op', () => {
  const { state, childId } = childFixture(10), next = model.recordProgress(state, childId, '2026-09-07', 20);
  assert.equal(next.progressRecords.length, 1); assert.equal(next.progressRecords[0].percent, 20);
  assert.equal(model.recordProgress(next, childId, '2026-09-07', 20), next); assert.equal(state.progressRecords[0].percent, 10);
});
test('a child latest value is chronological rather than last edited', () => {
  const { state, childId } = childFixture(100, '2026-09-09'), next = model.recordProgress(state, childId, '2026-09-07', 20);
  assert.equal(model.latestProgress(next, childId).percent, 100); assert.equal(childRow(next, childId).done, true);
  assert.deepEqual(model.progressHistory(next, childId).map(record => record.date), ['2026-09-07', '2026-09-09']);
});
test('a later child decrease reopens only that child and preserves its earlier hundred', () => {
  const { state, childId, parentId } = childFixture(100), next = model.recordProgress(state, childId, '2026-09-08', 10);
  assert.equal(childRow(next, childId).done, false); assert.equal(taskById(next, parentId).done, false);
  assert.deepEqual(model.progressHistory(next, childId).map(record => record.percent), [100, 10]);
});
test('completed parent and partial children remain independent without automatic aggregation', () => {
  const { state, childId, parentId } = childFixture(20, '2026-09-07', '[2026-09-07]\n- [x] 부모\n  - [ ] 하위');
  assert.equal(taskById(state, parentId).done, true); assert.equal(childRow(state, childId).done, false);
  assert.equal(model.latestProgress(state, parentId), null); assert.equal(model.tasks(state).length, 1);
});
test('parent progress does not overwrite any child percentage or completion', () => {
  const { state, childId, parentId } = childFixture(20), next = model.recordProgress(state, parentId, '2026-09-08', 100);
  assert.equal(taskById(next, parentId).done, true); assert.equal(childRow(next, childId).done, false);
  assert.deepEqual(model.progressHistory(next, childId), model.progressHistory(state, childId));
  assert.equal(only(next).subchecks[1].done, false);
});
test('multiple children can have independent values on the same date', () => {
  const { state, childId } = childFixture(20), other = only(state).subchecks[1].id, next = model.recordProgress(state, other, '2026-09-07', 100);
  assert.equal(model.latestProgress(next, childId).percent, 20); assert.equal(model.latestProgress(next, other).percent, 100);
  assert.deepEqual(only(next).subchecks.map(child => child.done), [false, true]); assert.equal(only(next).done, false);
});
test('same-title parent and children do not merge record identity', () => {
  let { state, childId, parentId } = childFixture(20, '2026-09-07', '[2026-09-07]\n- [ ] 동명\n  - [ ] 동명\n  - [ ] 동명');
  const second = only(state).subchecks[1].id; state = model.recordProgress(state, parentId, '2026-09-07', 10);
  state = model.recordProgress(state, second, '2026-09-07', 100);
  assert.deepEqual([parentId, childId, second].map(id => model.latestProgress(state, id).percent), [10, 20, 100]);
  assert.equal(model.tasks(state).length, 1); assert.equal(new Set(state.progressRecords.map(record => record.taskId)).size, 3);
});
test('child progress remains absent from period and folder Task projections', () => {
  const { state, childId, parentId } = childFixture(20);
  assert.deepEqual(model.tasks(state, { from: '2026-09-07', to: '2026-09-08' }).map(task => task.id), [parentId]);
  assert.deepEqual(model.scopeTasks(state, 'folder-life').map(task => task.id), [parentId]);
  assert(!model.tasks(state).some(task => task.id === childId));
});
test('the five approved TXT numeric forms work for children and preserve spelling', () => {
  for (const [token, percent] of [['20%', 20], ['20', 20], ['0.2', 20], ['1', 1], ['1.0', 100]]) {
    const { state, childId, parentId } = childFixture(), next = editMark(state, 'doc-1', childId, token);
    assert.notEqual(next, state); assert.equal(model.latestProgress(next, childId).percent, percent); assert.equal(childRow(next, childId).kind, 'subcheck');
    assert.equal(childRow(next, childId).text, '  - [' + token + '] 하위'); assert.equal(taskById(next, parentId).done, false);
    assert.equal(model.tasks(next).length, 1); assert.equal(childRow(next, childId).done, percent === 100);
  }
});
test('child lexical one to one point zero changes one percent into a hundred on the same ID', () => {
  const { state, childId } = childFixture(), one = editMark(state, 'doc-1', childId, '1'), complete = editMark(one, 'doc-1', childId, '1.0');
  assert.equal(model.latestProgress(one, childId).percent, 1); assert.equal(model.latestProgress(complete, childId).percent, 100);
  assert.equal(childRow(complete, childId).done, true); assert.equal(complete.progressRecords.length, 1);
});
test('numeric child current completion comes from latest history while original spelling remains', () => {
  const { state, childId } = childFixture(), numeric = editMark(state, 'doc-1', childId, '100');
  const next = model.recordProgress(numeric, childId, '2026-09-08', 20);
  assert.equal(childRow(next, childId).text, '  - [100] 하위'); assert.equal(childRow(next, childId).done, false);
  assert.deepEqual(model.progressHistory(next, childId).map(record => record.percent), [100, 20]);
});
test('child equivalent lexical restatements and title edits do not replay progress', () => {
  const { state, childId } = childFixture(), numeric = editMark(state, 'doc-1', childId, '20%');
  const newer = model.recordProgress(numeric, childId, '2026-09-08', 80), restated = editMark(newer, 'doc-1', childId, '0.2');
  const renamed = model.editText(restated, 'doc-1', model.raw(restated.documents[0]).replace('] 하위', '] 바꾼 하위'));
  assert.notEqual(renamed, restated); assert.equal(childRow(renamed, childId).title, '바꾼 하위'); assert.deepEqual(renamed.progressRecords, newer.progressRecords);
});
test('child numeric records use parent individual date ahead of section and fallback', () => {
  const { state, childId } = childFixture(undefined, '2026-09-07', '[2026-09-07]\n- [ ] 부모\n  - 날짜: 2026-09-10\n  - [ ] 하위');
  const next = editMark(state, 'doc-1', childId, '20', { progressDate: '2026-09-09' });
  assert.equal(model.latestProgress(next, childId).date, '2026-09-10'); assert.equal(childRow(next, childId).progressDate, '2026-09-10');
});
test('parent date properties after child rows still supply the child progress date', () => {
  const { state, childId } = childFixture(undefined, '2026-09-07', '[2026-09-07]\n- [ ] 부모\n  - [ ] 하위\n  - 날짜: 2026-09-10');
  const next = editMark(state, 'doc-1', childId, '20'); assert.equal(model.latestProgress(next, childId).date, '2026-09-10');
});
test('undated children require an explicit fallback while invalid parent dates are not guessed', () => {
  const { state, childId } = childFixture(undefined, '2026-09-07', '- [ ] 부모\n  - [ ] 하위');
  assert.equal(editMark(state, 'doc-1', childId, '20'), state);
  const next = editMark(state, 'doc-1', childId, '20', { progressDate: '2026-09-08' }); assert.equal(model.latestProgress(next, childId).date, '2026-09-08');
  const bad = childFixture(undefined, '2026-09-07', '[2026-09-07]\n- [ ] 부모\n  - 날짜: 2026-02-30\n  - [ ] 하위');
  assert.equal(editMark(bad.state, 'doc-1', bad.childId, '20', { progressDate: '2026-09-08' }), bad.state);
});
test('parent date or date-section edits change child metadata but never rewrite child history', () => {
  const { state, childId, parentId } = childFixture(20), next = model.updateTask(state, parentId, { date: '2026-09-10' });
  assert.equal(childRow(next, childId).progressDate, '2026-09-10'); assert.deepEqual(next.progressRecords, state.progressRecords);
  const changed = model.editText(state, 'doc-1', model.raw(state.documents[0]).replace('2026-09-07', '2026-09-08'));
  assert.equal(childRow(changed, childId).progressDate, '2026-09-08'); assert.deepEqual(changed.progressRecords, state.progressRecords);
});
test('nested children at depth four retain independent percentages and canonical parent identity', () => {
  let state = single('[2026-09-07]\n- [ ] 부모\n  - [ ] 하위1\n    - [ ] 하위2\n      - [ ] 하위3\n        - [ ] 하위4');
  for (const [id, percent] of [['line-2', 10], ['line-3', 20], ['line-4', 100], ['line-5', 0]]) state = model.recordProgress(state, id, '2026-09-07', percent);
  assert(model.validate(state)); assert.equal(model.tasks(state).length, 1); assert.deepEqual(only(state).subchecks.map(child => child.done), [false, false, true, false]);
  for (const row of model.rowMeta(state, 'doc-1').filter(row => row.kind === 'subcheck')) { assert.equal(row.parentTaskId, 'line-1'); assert.equal(row.progressTargetId, row.id); }
});
test('fresh nested numeric children do not become canonical Tasks or aggregate into ancestors', () => {
  const initial = single(''), next = model.editText(initial, 'doc-1', '[2026-09-07]\n- [ ] 부모\n  - [20] 하위\n    - [1.0] 손자');
  assert.notEqual(next, initial); assert.equal(model.tasks(next).length, 1); assert.equal(only(next).done, false);
  assert.deepEqual(only(next).subchecks.map(child => model.latestProgress(next, child.id).percent), [20, 100]);
});
test('parent and child numeric changes in one source edit record independent targets', () => {
  const { state, childId, parentId } = childFixture(), next = model.editText(state, 'doc-1', model.raw(state.documents[0]).replace('- [ ] 부모', '- [80] 부모').replace('- [ ] 하위', '- [20] 하위'));
  assert.notEqual(next, state); assert.equal(model.latestProgress(next, parentId).percent, 80); assert.equal(model.latestProgress(next, childId).percent, 20);
  assert.equal(next.progressRecords.length, 2); assert.equal(model.tasks(next).length, 1);
});
test('empty numeric child scaffolds preserve IDs and record only when their title materializes', () => {
  const initial = single('[2026-09-07]\n- [ ] 부모\n  - [ ] '), staged = model.editText(initial, 'doc-1', '[2026-09-07]\n- [ ] 부모\n  - [20] ');
  assert.notEqual(staged, initial); assert.deepEqual(staged.progressRecords, []); assert.equal(model.rowMeta(staged, 'doc-1')[2].kind, 'subcheck');
  const next = model.editText(staged, 'doc-1', '[2026-09-07]\n- [ ] 부모\n  - [20] 새 하위');
  assert.notEqual(next, staged); assert.equal(only(next).subchecks[0].id, 'line-2'); assert.equal(model.latestProgress(next, 'line-2').percent, 20);
});
test('partial and invalid numeric child edits preserve the committed ID source and records', () => {
  const { state, childId } = childFixture(), numeric = editMark(state, 'doc-1', childId, '20'), snapshot = JSON.stringify(numeric);
  for (const token of ['[20', '[0.', '[101]', '[-1]', '[1.01]', '[20.0]']) {
    const source = model.raw(numeric.documents[0]).replace('[20]', token); assert.equal(model.editText(numeric, 'doc-1', source), numeric);
    assert.equal(JSON.stringify(numeric), snapshot);
  }
});
test('recordProgress rejects invalid numeric ranges dates and incomplete or orphan children', () => {
  const { state, childId } = childFixture();
  for (const percent of [-1, 101, 1.5, null, '20', NaN]) assert.equal(model.recordProgress(state, childId, '2026-09-07', percent), state);
  for (const date of [null, undefined, '미정', '2026-02-30']) assert.equal(model.recordProgress(state, childId, date, 20), state);
  const empty = single('- [ ] 부모\n  - [ ] '); assert.equal(model.recordProgress(empty, 'line-1', '2026-09-07', 20), empty);
  const orphan = single('- [ ] \n  - [ ] 고아'); assert.equal(model.recordProgress(orphan, 'line-1', '2026-09-07', 20), orphan);
});
test('tracked child literal checkbox conflicts are rejected by both raw and boolean APIs', () => {
  const { state, childId } = childFixture(20);
  assert.equal(model.updateSubcheck(state, 'doc-1', childId, true), state); assert.equal(editMark(state, 'doc-1', childId, 'x'), state);
  assert.equal(model.updateSubcheck(state, 'doc-1', childId, false), state);
  const complete = model.recordProgress(state, childId, '2026-09-08', 100);
  assert.equal(model.updateSubcheck(complete, 'doc-1', childId, false), complete); assert.equal(editMark(complete, 'doc-1', childId, ' '), complete);
});
test('untracked child boolean completion remains usable and creates no progress record', () => {
  const { state, childId, parentId } = childFixture(), next = model.updateSubcheck(state, 'doc-1', childId, true);
  assert.notEqual(next, state); assert.equal(childRow(next, childId).done, true); assert.equal(taskById(next, parentId).done, false);
  assert.deepEqual(next.progressRecords, []);
});
test('numeric child updateSubcheck cannot silently rewrite spelling or return a false successful toggle', () => {
  const { state, childId } = childFixture(), numeric = editMark(state, 'doc-1', childId, '20');
  assert.equal(model.updateSubcheck(numeric, 'doc-1', childId, true), numeric); assert.equal(model.updateSubcheck(numeric, 'doc-1', childId, false), numeric);
  assert.equal(childRow(numeric, childId).text, '  - [20] 하위');
});
test('recorded child source deletion title clearing and enclosing-parent deletion are blocked', () => {
  const { state, childId, parentId } = childFixture(20), source = model.raw(state.documents[0]);
  assert.equal(model.editText(state, 'doc-1', source.split('\n').filter(line => line !== '  - [ ] 하위').join('\n')), state);
  assert.equal(model.editText(state, 'doc-1', source.replace('  - [ ] 하위', '  - [ ] ')), state);
  assert.equal(model.editText(state, 'doc-1', ''), state); assert.equal(model.removeTask(state, parentId), state); assert.equal(model.removeTask(state, childId), state);
});
test('removing an untracked sibling preserves the recorded child identity and history', () => {
  const { state, childId } = childFixture(20), next = model.editText(state, 'doc-1', model.raw(state.documents[0]).replace('\n  - [ ] 다른 하위', ''));
  assert.notEqual(next, state); assert.equal(only(next).subchecks.length, 1); assert.equal(only(next).subchecks[0].id, childId); assert.deepEqual(next.progressRecords, state.progressRecords);
});
test('deleting an untracked ancestor child cannot delete a recorded grandchild inside it', () => {
  const state = single('[2026-09-07]\n- [ ] 부모\n  - [ ] 상위 하위\n    - [ ] 기록 하위');
  const recorded = model.recordProgress(state, 'line-3', '2026-09-07', 20);
  assert.equal(model.editText(recorded, 'doc-1', '[2026-09-07]\n- [ ] 부모'), recorded);
});
test('numeric child promotion preserves its stable ID and dated history', () => {
  const {state,childId}=childFixture(), numeric=editMark(state,'doc-1',childId,'20');
  const next=model.editText(numeric,'doc-1',model.raw(numeric.documents[0]).replace('  - [20] 하위','- [20] 하위'));
  assert.notEqual(next,numeric); assert(model.tasks(next).some(t=>t.id===childId)); assert.deepEqual(next.progressRecords,numeric.progressRecords);
});
test('a recorded child can reorder within the same immediate parent without any new history', () => {
  const { state, childId } = childFixture(20), sibling = only(state).subchecks[1].id;
  const next = model.moveSubtree(state, 'doc-1', sibling, childId); assert.notEqual(next, state);
  assert.deepEqual(next.progressRecords, state.progressRecords); assert.deepEqual(only(next).subchecks.map(child => child.id), [sibling, childId]);
  assert.equal(childRow(next, childId).parentLineId, childRow(state, childId).parentLineId);
});
test('moving a child subtree preserves nested child records raw notes and current completion', () => {
  const initial = single('[2026-09-07]\n- [ ] 부모\n  - [ ] 첫 하위\n    - [ ] 손자\n    메모\n  - [ ] 둘째 하위');
  let state = model.recordProgress(initial, 'line-2', '2026-09-07', 20); state = model.recordProgress(state, 'line-3', '2026-09-08', 100);
  const next = model.moveSubtree(state, 'doc-1', 'line-5', 'line-2'); assert.notEqual(next, state); assert.deepEqual(next.progressRecords, state.progressRecords);
  assert.equal(childRow(next, 'line-3').done, true); assert.equal(next.documents[0].lines.find(line => line.id === 'line-4').text, '    메모');
});
test('child target lists allow reparenting while preserving history and unplanned status', () => {
  const initial=single('[2026-09-07]\n- [ ] A\n  - [ ] a\n- [ ] B\n  - [ ] b'), state=model.recordProgress(initial,'line-2','2026-09-07',20);
  assert(model.moveTargets(state,'doc-1','line-2').some(t=>t.beforeLineId==='line-4'&&t.depth===1));
  const next=model.moveSubtree(state,'doc-1','line-2','line-4',1); assert.notEqual(next,state); assert.deepEqual(next.progressRecords,state.progressRecords); assert(!next.taskScopes['line-2']);
});
test('moving the parent Task across a date boundary pins its date and preserves child record dates', () => {
  const initial = single('[2026-09-07]\n- [ ] A\n  - [ ] child\n[2026-09-08]\n- [ ] B'), state = model.recordProgress(initial, 'line-2', '2026-09-07', 20);
  const next = model.moveSubtree(state, 'doc-1', 'line-1', null); assert.notEqual(next, state);
  assert.deepEqual(next.progressRecords, state.progressRecords); assert.equal(childRow(next, 'line-2').progressDate, '2026-09-07');
  assert.equal(childRow(next, 'line-2').groupDate, '2026-09-08');
});
test('progress in a private Flow source child never changes parent reference completion or identity', () => {
  let state = model.createState();
  state = model.editText(state, 'flow-move-d30', model.raw(state.flows[0]).replace('- [ ] 이사업체 견적 비교', '- [ ] 이사업체 견적 비교\n  - [ ] 원본 하위'));
  const child = model.rowMeta(state, 'flow-move-d30').find(row => row.kind === 'subcheck'), next = model.recordProgress(state, child.id, '2026-09-08', 100);
  assert.notEqual(next, state); assert.deepEqual(next.documents, state.documents); assert.deepEqual(next.bindings, state.bindings);
  assert.equal(taskById(next, trackedSeedId).done, false); assert.equal(model.latestProgress(next, trackedSeedId).percent, 20); assert.equal(model.tasks(next).length, 7);
});
test('references can acquire independent local child progress targets and canonical ref IDs still resolve once', () => {
  const state = model.createState(), source = model.raw(state.documents[0]).replace('    - [ ] 이사업체 견적 비교', '    - [ ] 이사업체 견적 비교\n      - [20] 로컬 하위');
  const next=model.editText(state,'d-move',source); assert.notEqual(next,state); assert.deepEqual(next.flows,state.flows); assert.equal(next.progressRecords.length,state.progressRecords.length+1); assert.equal(model.recordProgress(state, 'd-move-line-9', '2026-09-07', 20), state);
});
test('scope unwrapping preserves recorded child IDs progress owner and inherited date', () => {
  const state = model.recordProgress(model.createState(), 'd-move-line-7', '2026-09-08', 20), next = model.unlink(state, 'd-move', 'd-move-line-5');
  assert.notEqual(next, state); assert.deepEqual(next.progressRecords, state.progressRecords);
  const row = model.rowMeta(next, 'd-move').find(row => row.id === 'd-move-line-7');
  assert.equal(row.progressTargetId, 'd-move-line-7'); assert.equal(row.taskId, 'd-move-line-6'); assert.equal(row.progressDate, '2026-09-07');
});
test('schema accepts child record IDs but rejects dangling incomplete code or duplicate child records', () => {
  const { state, childId } = childFixture(20); assert(model.validate(state));
  for (const mutate of [s => { s.progressRecords[0].taskId = 'missing'; }, s => { s.progressRecords[0].taskId = 'line-0'; },
    s => { s.progressRecords.push(clone(s.progressRecords[0])); }, s => { s.progressRecords[0].percent = 101; },
    s => { s.documents[0].lines.find(line => line.id === childId).text = '  - [ ] '; }]) {
    const invalid = clone(state); mutate(invalid); assert.equal(model.validate(invalid), false);
  }
});
test('serialized child latest progress must agree with its literal completion', () => {
  const { state, childId } = childFixture(20), invalid = clone(state);
  invalid.documents[0].lines.find(line => line.id === childId).text = '  - [x] 하위';
  assert.equal(model.validate(invalid), false); assert.equal(model.read(storage({ [model.KEY]: JSON.stringify(invalid) })).reason, 'invalid-schema');
});
test('serialized numeric child without a progress record remains invalid', () => {
  const invalid = single('[2026-09-07]\n- [ ] 부모\n  - [20] 하위'); assert.equal(model.validate(invalid), false);
  assert.equal(model.write(storage(), invalid, null).reason, 'invalid-state');
});
test('child history results are detached and immutable input snapshots are respected', () => {
  const { state, childId } = childFixture(20), snapshot = JSON.stringify(state), history = model.progressHistory(state, childId);
  history[0].percent = 100; assert.equal(JSON.stringify(state), snapshot);
  function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } }
  freeze(state); const next = model.recordProgress(state, childId, '2026-09-08', 100);
  assert.notEqual(next, state); assert.equal(JSON.stringify(state), snapshot); assert.equal(childRow(next, childId).done, true);
});
test('child source progress history and parent values roundtrip exact Undo Redo and reload', () => {
  const { state, childId } = childFixture(20), after = model.recordProgress(state, childId, '2026-09-08', 100), store = storage(); let expected = null;
  for (const snapshot of [state, after, state, after]) {
    const result = model.write(store, clone(snapshot), expected); assert(result.ok); expected = result.serialized;
    assert.deepEqual(model.read(store).state, snapshot); assert.deepEqual(model.tasks(model.read(store).state), model.tasks(snapshot));
  }
});
test('child writes keep quota conflict and lost-write failures isolated from committed source', () => {
  const { state, childId } = childFixture(20), next = model.recordProgress(state, childId, '2026-09-08', 100), bytes = JSON.stringify(state);
  const quota = storage({ [model.KEY]: bytes }); quota.setItem = () => { throw new Error('quota'); };
  assert.equal(model.write(quota, next, bytes).reason, 'storage-unavailable'); assert.equal(quota.data.get(model.KEY), bytes);
  const conflict = storage({ [model.KEY]: 'newer' }); assert.equal(model.write(conflict, next, bytes).reason, 'conflict'); assert.equal(conflict.data.get(model.KEY), 'newer');
  const lost = storage({ [model.KEY]: bytes }); lost.setItem = () => {}; assert.equal(model.write(lost, next, bytes).reason, 'readback-failed');
});
test('child recording shares the bounded record capacity and existing dates remain editable', () => {
  const { state, childId } = childFixture(); state.progressRecords = Array.from({ length: 10000 }, (_, i) => ({ taskId: childId, date: new Date(Date.UTC(2000, 0, 1 + i)).toISOString().slice(0, 10), percent: 20 }));
  assert(model.validate(state)); assert.equal(model.recordProgress(state, childId, '2040-01-01', 20), state);
  const changed = model.recordProgress(state, childId, '2000-01-01', 10); assert.notEqual(changed, state); assert.equal(changed.progressRecords.length, 10000);
});

console.log('\n' + count + '/' + count + ' model checks passed.');
