import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyTextWorkspace, textEditorRows, textWorkspaceModel as M, type TextDocument, type TextWorkspaceState } from './text-workspace';
import { applyProgramParseCache, programParseCacheEnabled, PROGRAM_PARSE_CACHE_KEY } from './typing-parse-cache';

// typelag (나) (총괄 11/11): the model's document parse cache gives what a fresh parse gives. The cache stays on across
// every state below, so parses kept from earlier states (same document ids, other inputs) are offered each time; and a
// transaction's clone changed in place between two reads (taskScopes, a binding, a line id, a title, a folder, a
// reference's source date: the parse inputs the audit found changed that way) is parsed again.
function ids(state: TextWorkspaceState) { return [...state.documents, ...state.flows].map(doc => doc.id); }
function docs(state: TextWorkspaceState): TextDocument[] { return [...state.documents, ...state.flows]; }
/** Every document's cached parse (both source-date modes) equals a fresh one. */
function parsesFresh(state: TextWorkspaceState, label: string) {
  for (const doc of docs(state)) for (const skip of [undefined, true]) {
    const kept = M.parseDocumentCached(doc, state, skip);
    assert.deepEqual(kept, M.parseDocument(doc, state, skip), `${label} ${doc.title} skip=${skip}`);
  }
}
function look(state: TextWorkspaceState) {
  return {
    valid: M.validate(state), tasks: M.tasks(state), dated: M.tasks(state, { from: '2026-11-11', to: '2026-11-13' }), scopes: M.scopes(state),
    rows: ids(state).map(id => M.rowMeta(state, id)), editor: ids(state).map(id => textEditorRows(state, id)),
    context: ids(state).map(id => M.contextAt(state, id, 1)),
  };
}
function both<T>(read: () => T): { on: T; off: T } {
  M.parseCache(false); const off = read();
  M.parseCache(true); const on = read(), again = read();
  assert.deepEqual(again, on, 'a second read (from the cache) is the first');
  return { on, off };
}
function edit(state: TextWorkspaceState, id: string, raw: string) {
  const result = M.editTextResult(state, id, raw, { folderText: true });
  return { reason: result.reason, folderProblem: result.folderProblem ?? null, raw: result.reason === null ? ids(result.state).map(doc => M.raw(M.getDocument(result.state, doc))) : null,
    tasks: result.reason === null ? M.tasks(result.state).map(task => [task.title, task.date, task.done, task.folder]) : null };
}
function random(seed: number) { return () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }; }
const VOCABULARY = ['[2026-11-11]', '[2026-11-12]', '[미정]', '- [ ] 할 일', '- [x] 끝난 일', '- [50%] 반쯤', '  - [ ] 하위 체크', '  - 메모: 짧은 메모',
  '  - 날짜: 2026-11-13', '  - 시간: 09:00', '- /가', '- /나', '  - [ ] 폴더 안 일', '일반 글', '', '# 제목', '- 목록', '    - 깊은 줄', '- [ ] 운동', '- [ ]'];
// Blocks the parser takes (a task with its properties and subchecks, a folder with a task, a date head, plain lines);
// now and then one line of the vocabulary anywhere, which the model may refuse.
const BLOCKS = [['[2026-11-11]'], ['[2026-11-12]'], ['[미정]'], ['- [ ] 할 일', '  - 메모: 짧은 메모'], ['- [x] 끝난 일'], ['- [50%] 반쯤', '  - 날짜: 2026-11-13'],
  ['- [ ] 큰 일', '  - [ ] 하위 체크', '  - [x] 끝난 하위'], ['- [ ] 시간 일', '  - 시간: 09:00'], ['- /가', '  - [ ] 폴더 안 일'], ['- /나', '  - 폴더 메모'],
  ['일반 글'], [''], ['# 제목'], ['- 목록', '  - 하위 목록'], ['- [ ] 운동']];
function text(next: () => number) {
  const count = 1 + Math.floor(next() * 8), lines: string[] = [];
  for (let i = 0; i < count; i++) {
    if (next() < 0.1) { lines.push(VOCABULARY[Math.floor(next() * VOCABULARY.length)]); continue; }
    const block = BLOCKS[Math.floor(next() * BLOCKS.length)], tag = next() < 0.4 ? ' ' + i : '';
    lines.push(...block.map(line => line && !line.startsWith('[') && !line.includes('/') ? line + tag : line));
  }
  return lines.join('\n');
}

test('cache on and off give the same parses, queries and edits on random workspaces', () => {
  try {
    for (let run = 0; run < 6; run++) {
      const next = random(run + 7);
      let state = createEmptyTextWorkspace();
      for (const title of ['하나', '둘', '셋']) state = M.addDocument(state, { title });
      let accepted = 0;
      for (let step = 0; step < 60; step++) {
        const id = ids(state)[Math.floor(next() * ids(state).length)], raw = text(next);
        M.parseCache(true);
        const result = M.editTextResult(state, id, raw, { folderText: true });
        if (result.reason !== null) continue;
        state = result.state; accepted++;
        M.parseCache(true); parsesFresh(state, `run ${run} step ${step}`);
        const queries = both(() => look(state));
        assert.deepEqual(queries.on, queries.off, `run ${run} step ${step}`);
        // An edit offered on top of this state (as typing does) is judged the same, whatever the cache holds.
        const other = ids(state)[Math.floor(next() * ids(state).length)], lines = M.raw(M.getDocument(state, other)).split('\n');
        lines[Math.floor(next() * lines.length)] = VOCABULARY[Math.floor(next() * VOCABULARY.length)];
        const offered = both(() => edit(state, other, lines.join('\n')));
        assert.deepEqual(offered.on, offered.off, `run ${run} step ${step} offered edit`);
      }
      assert(accepted > 5, `run ${run} kept ${accepted} edits`);
    }
  } finally { M.parseCache(false); }
});

function fixture() {
  let state = createEmptyTextWorkspace();
  state = M.addDocument(state, { title: '원본' }); state = M.addDocument(state, { title: '참조' });
  const [a, b] = ids(state);
  let result = M.editTextResult(state, a, '[2026-11-12]\n- [ ] 원본 일\n- /가\n  - [ ] 폴더 일\n- [ ] 큰 일\n  - [ ] 하위 체크', { folderText: true });
  assert.equal(result.reason, null); state = result.state;
  result = M.editTextResult(state, b, '[2026-11-11]\n메모 줄', { folderText: true });
  assert.equal(result.reason, null); state = result.state;
  const source = M.tasks(state).find(task => task.title === '원본 일')!;
  state = M.linkTask(state, b, M.getDocument(state, b)!.lines.length, source.id);
  assert.equal(M.validate(state), true);
  assert(state.bindings.some(binding => binding.kind === 'task' && binding.docId === b));
  return { state, a, b, sourceId: source.id };
}

test('a reference takes its source document\'s date through the cache, and follows the source when it moves', () => {
  try {
    const { state, a, b, sourceId } = fixture();
    M.parseCache(true); parsesFresh(state, 'linked');
    const date = (s: TextWorkspaceState) => M.parseDocumentCached(M.getDocument(s, b)!, s).items.find(item => M.parseDocument(M.getDocument(s, b)!, s).items.some(fresh => fresh.id === item.id && fresh.title === '원본 일'))?.date;
    assert.equal(date(state), '2026-11-12');
    const moved = M.editTextResult(state, a, M.raw(M.getDocument(state, a)!).replace('[2026-11-12]', '[2026-11-13]'), { folderText: true });
    assert.equal(moved.reason, null);
    assert.equal(date(moved.state), '2026-11-13');
    parsesFresh(moved.state, 'source moved');
    const queries = both(() => look(moved.state));
    assert.deepEqual(queries.on, queries.off);
    assert.equal(M.rowMeta(moved.state, b).find(row => row.isReference)?.taskId, sourceId);
  } finally { M.parseCache(false); }
});

test('a clone changed in place between two reads is parsed again', () => {
  try {
    const { state, a, b } = fixture();
    const changes: [string, (s: TextWorkspaceState) => void][] = [
      ['taskScopes: a nested task becomes a plan of its own', s => { const sub = M.getDocument(s, a)!.lines[5]; s.taskScopes[sub.id] = s.itemScopes[sub.id] ?? s.folders[0].id; }],
      ['binding moved to another document', s => { const scope = s.bindings.find(binding => binding.kind === 'scope')!; scope.docId = b; }],
      ['binding moved to another line', s => { const scope = s.bindings.find(binding => binding.kind === 'scope')!; scope.lineId = M.getDocument(s, a)!.lines[4].id; }],
      ['binding taken away', s => { s.bindings.splice(s.bindings.findIndex(binding => binding.kind === 'scope'), 1); }],
      ['line id', s => { M.getDocument(s, a)!.lines[1].id = 'renamed-line'; }],
      ['title', s => { M.getDocument(s, a)!.title = '바뀐 제목'; }],
      ['folder', s => { M.getDocument(s, a)!.folder = '다른 폴더'; }],
      ['text', s => { M.getDocument(s, a)!.lines[1].text = '- [x] 원본 일'; }],
      ['source date', s => { M.getDocument(s, a)!.lines[0].text = '[2026-11-20]'; }],
      ['reference target text', s => { M.getDocument(s, a)!.lines[1].text = '- [ ] 원본 일 바뀜'; }],
    ];
    for (const [label, change] of changes) {
      const clone = structuredClone(state) as TextWorkspaceState;
      M.parseCache(true);
      parsesFresh(clone, `${label} before`);
      look(clone);
      const before = docs(clone).map(doc => M.parseDocument(doc, clone));
      change(clone);
      assert.notDeepEqual(docs(clone).map(doc => M.parseDocument(doc, clone)), before, `${label}: the change shows in a fresh parse`);
      parsesFresh(clone, label);
      const queries = both(() => look(clone));
      assert.deepEqual(queries.on, queries.off, label);
    }
  } finally { M.parseCache(false); }
});

test('the cache keeps other documents\' parses across an edit in one, and its kept parses are frozen', () => {
  try {
    const { state, a } = fixture();
    M.parseCache(true);
    M.tasks(state);
    const first = M.parseCache();
    M.tasks(state);
    const second = M.parseCache();
    assert.equal(second.misses, first.misses, 'a second query parses nothing again');
    assert(second.hits > first.hits);
    const typed = M.editTextResult(state, a, M.raw(M.getDocument(state, a)!) + '\n- [ ] 새 일', { folderText: true });
    assert.equal(typed.reason, null);
    const beforeTyped = M.parseCache();
    M.tasks(typed.state);
    assert(M.parseCache().misses - beforeTyped.misses <= 1, 'only the typed document is parsed again');
    const task = M.tasks(typed.state).find(entry => entry.subchecks.length)!;
    assert.equal(Object.isFrozen(task.subchecks), true);
    assert.equal(Object.isFrozen(M.rowMeta(typed.state, a)[0].guideLevels), true);
    M.parseCache(false);
    assert.equal(Object.isFrozen(M.rowMeta(typed.state, a)[0].guideLevels), false, 'off: as before');
    assert.equal(Object.isFrozen(M.parseDocument(M.getDocument(typed.state, a)!, typed.state).rows), false, 'the public parse is never the kept one');
  } finally { M.parseCache(false); }
});

test('the switch: on in a window unless this device says off; the model is off without a window', () => {
  assert.equal(programParseCacheEnabled(null), true);
  assert.equal(programParseCacheEnabled({ getItem: key => key === PROGRAM_PARSE_CACHE_KEY ? 'off' : null }), false);
  assert.equal(M.parseCache().on, false, 'node (no window): off');
  assert.equal(applyProgramParseCache(null), false, 'no window: stays off');
});
