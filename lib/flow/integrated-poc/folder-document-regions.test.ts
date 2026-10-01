import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { readProgramFolderRegions as read, planProgramRegionEdit as edit, isProgramFolderViewCurrent } from './folder-document-regions';

function fixture(raw = '[2026-10-01]\n- 업무\n  - 메모\n  - [ ] 할 일\n    - 메모: 설명\n    - 시간: 09:00\n- 외부 메모\n- [ ] 외부 할 일\n[2026-10-02]\n- 업무\n  - 둘째 메모') {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '문서' });
  state = { ...state, folders: [...state.folders, { id: 'work', title: '업무', parentId: null }, { id: 'child', title: '하위', parentId: 'work' }] };
  const id = state.documents[0].id;
  state = M.editText(state, id, raw);
  // Bind first, then materialize children, to use the real scope ownership rules.
  const lines = state.documents[0].lines;
  const scopeIndices = lines.flatMap((line, index) => line.text === '- 업무' ? [index] : []);
  state = { ...state, bindings: scopeIndices.map(index => ({ kind: 'scope' as const, docId: id, lineId: lines[index].id, scopeId: 'work' })),
    taskScopes: { ...state.taskScopes }, itemScopes: { ...state.itemScopes } };
  for (const row of M.parseDocument(state.documents[0], state).rows) if (row.ancestorScopeIds?.includes('work')) {
    if (row.id in state.taskScopes) state.taskScopes[row.id] = 'work';
    if (row.id in state.itemScopes) state.itemScopes[row.id] = 'work';
  }
  assert(M.validate(state));
  return { state, id };
}

function success(state: TextWorkspaceState, id: string, replace: (raw: string) => string, regionIndex = 0) {
  const view = read(state, id, 'work')!, region = view.regions[regionIndex];
  const result = edit(state, view, region.key, replace(region.raw));
  assert(result.ok, JSON.stringify(result));
  assert(M.validate(result.next));
  return result;
}

test('reader includes multiple explicit regions and date contexts without selecting document storage prose', () => {
  const { state, id } = fixture(), before = JSON.stringify(state), view = read(state, id, 'work')!;
  assert.equal(view.regions.length, 2);
  assert.match(view.regions[0].raw, /메모/);
  assert(!view.regions.some(region => region.raw.includes('외부')));
  assert(view.regions[0].contextRows.some(row => row.kind === 'date' && row.date === '2026-10-01'));
  assert.deepEqual(view.matchingDocumentIds, [id]);
  assert.equal(JSON.stringify(state), before);
  const plain = M.editText(M.addDocument(createEmptyTextWorkspace(), { title: '보관' }), 'missing', '');
  const plainId = plain.documents[0].id;
  const prose = M.editText(plain, plainId, '일반 본문');
  assert.equal(read(prose, plainId, 'folder-unfiled')!.regions.length, 0);
});

test('title, ordinary note and time edit retain hidden IDs, records, ownership and dates', () => {
  let { state, id } = fixture();
  const task = M.tasks(state).find(entry => entry.title === '할 일')!;
  state = M.recordProgress(state, task.id, '2026-09-30', 20);
  const before = JSON.stringify(state), view = read(state, id, 'work')!;
  const result = success(state, id, raw => raw.replace('- 메모\n', '- 메모 수정\n').replace('[ ] 할 일', '[ ] 할 일 수정').replace('09:00', '10:30'));
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(result.next.taskScopes, state.taskScopes);
  assert.deepEqual(result.next.itemScopes, state.itemScopes);
  assert.deepEqual(result.next.progressRecords, state.progressRecords);
  assert.deepEqual(result.next.documents[0].lines.map(line => line.id), state.documents[0].lines.map(line => line.id));
  assert.equal(M.tasks(result.next).find(entry => entry.id === task.id)!.date, task.date);
  assert.equal(read(result.next, id, 'work')!.regions[0].key, view.regions[0].key);
  assert.equal(result.fullRaw, M.raw(result.next.documents[0]));
});

test('new explicit Todo and ordinary note append within same scope without promoting old notes', () => {
  const { state, id } = fixture();
  const result = success(state, id, raw => `${raw}\n  - 일반 메모 추가\n  - [ ] 새 할 일`);
  assert.equal(M.tasks(result.next).length, M.tasks(state).length + 1);
  const task = M.tasks(result.next).find(entry => entry.title === '새 할 일')!;
  assert.equal(task.scopeId, 'work'); assert.equal(task.date, '2026-10-01');
  assert.equal(M.rowMeta(result.next, id).find(row => row.text.includes('일반 메모 추가'))!.kind, 'note');
});

test('an empty linked folder permits note or explicit Todo without mutating the read', () => {
  const { state, id } = fixture('- 업무\n외부');
  const view = read(state, id, 'work')!;
  assert.equal(view.regions[0].raw, ''); assert.equal(view.regions[0].depth, 1);
  for (const raw of ['  - 새 메모', '  - [ ] 새 할 일']) {
    const result = edit(state, view, view.regions[0].key, raw);
    assert(result.ok, JSON.stringify(result));
    assert.equal(result.next.documents[0].lines.at(-1)!.id, state.documents[0].lines.at(-1)!.id);
  }
});

test('stale full workspace, forged or modified tokens and missing region fail without writes', () => {
  const { state, id } = fixture(), view = read(state, id, 'work')!, region = view.regions[0];
  const newer = M.recordProgress(state, M.tasks(state)[0].id, '2026-10-01', 20);
  assert.equal(M.raw(newer.documents[0]), view.fullRaw);
  assert.deepEqual(edit(newer, view, region.key, region.raw + '\n  - 메모'), { ok: false, reason: 'stale-workspace' });
  assert.deepEqual(edit(state, { ...view }, region.key, region.raw), { ok: false, reason: 'invalid-view' });
  assert.equal(edit(state, view, 'missing', region.raw).ok, false);
  view.regions[0].endIndex++;
  assert.deepEqual(edit(state, view, region.key, region.raw), { ok: false, reason: 'invalid-view' });
});

test('no-op returns the exact original workspace and full raw', () => {
  const { state, id } = fixture(), view = read(state, id, 'work')!, region = view.regions[0];
  const result = edit(state, view, region.key, region.raw);
  assert(result.ok); assert.equal(result.next, state); assert.equal(result.fullRaw, view.fullRaw);
});

test('indent escape, headers, date insert, malformed token, promotion, deletion and progress edits reject', () => {
  const { state, id } = fixture(), view = read(state, id, 'work')!, region = view.regions[0], before = JSON.stringify(state);
  for (const replacement of [region.raw + '\n- 탈출', region.raw + '\n  # 제목', region.raw + '\n[2026-10-03]',
    region.raw.replace('[ ]', '[101%]'), region.raw.replace('- 메모\n', '- [ ] 메모\n'), '', region.raw.replace('[ ]', '[x]'),
    region.raw + '\n    - 날짜: 2026-11-01']) {
    assert.equal(edit(state, view, region.key, replacement).ok, false, replacement);
  }
  assert.equal(JSON.stringify(state), before);
});

test('selected blank lines are editable while fences remain readonly and preserved', () => {
  const { state, id } = fixture('- 업무\n  - 앞 메모\n\n  ```\n  코드\n  ```\n  - 뒤 메모\n외부');
  const view = read(state, id, 'work')!;
  assert.equal(view.regions.length, 2);
  const blank = state.documents[0].lines[2];
  assert(view.regions[0].lineIds.includes(blank.id));
  assert(!view.regions[0].contextRows.some(row => row.kind === 'blank'));
  assert.equal(view.regions[0].contextRows.filter(row => row.kind === 'fence').length, 3);
  const result = success(state, id, raw => raw.replace('앞 메모', '앞 메모 수정'));
  assert.deepEqual(result.next.documents[0].lines.slice(2), state.documents[0].lines.slice(2));
});

test('folder parent chains and flow folder inheritance match actual task ownership in other documents', () => {
  const { state, id } = fixture('본문'), other = M.addDocument(state, { title: '다른 문서', folderId: 'child' });
  const otherId = other.documents[1].id, withTask = M.editText(other, otherId, '- [ ] 하위 소속');
  assert.deepEqual(read(withTask, id, 'work')!.matchingDocumentIds, [otherId]);
  assert.equal(read(withTask, otherId, 'work')!.regions.length, 1);
  const flowId = 'flow-doc';
  const withFlow: TextWorkspaceState = { ...withTask, flows: [{ id: flowId, title: '개인 Flow', folder: '하위', folderId: 'child', lines: [], private: true, sourceVersion: 'v1' }] };
  const final = M.editText(withFlow, flowId, '- [ ] Flow 할 일');
  assert(M.validate(final));
  assert(read(final, id, 'work')!.matchingDocumentIds.includes(flowId));
});

test('scope mismatch is preserved as readonly context while genuinely owned tasks remain visible', () => {
  const { state, id } = fixture(), task = M.tasks(state).find(entry => entry.title === '할 일')!;
  const mismatch = { ...state, taskScopes: { ...state.taskScopes, [task.id]: 'folder-unfiled' }, itemScopes: { ...state.itemScopes, [task.id]: 'folder-unfiled' } };
  assert(M.validate(mismatch));
  const view = read(mismatch, id, 'work')!;
  assert(view.regions.some(region => region.contextRows.some(row => row.id === task.id && row.scopeMismatch)));
  assert(!view.regions.some(region => region.lineIds.includes(task.id)));
  assert(read(mismatch, id, 'folder-unfiled')!.regions.some(region => region.lineIds.includes(task.id)));
});

test('canonical title with an external reference refuses model-wide reference synchronization', () => {
  let { state, id } = fixture();
  const task = M.tasks(state).find(entry => entry.title === '할 일')!;
  state = M.addDocument(state, { title: '참조 문서' });
  const otherId = state.documents[1].id;
  state = M.editText(state, otherId, '- ');
  state = M.linkTask(state, otherId, 0, task.id);
  const before = JSON.stringify(state), view = read(state, id, 'work')!, region = view.regions[0];
  const result = edit(state, view, region.key, region.raw.replace('할 일', '변경 제목'));
  assert.deepEqual(result, { ok: false, reason: 'linked-document-change' });
  assert.equal(JSON.stringify(state), before);
});

test('date property remains readonly while its following memo and time are editable', () => {
  const { state, id } = fixture('- 업무\n  - [ ] 할 일\n    - 날짜: 2026-10-05\n    - 메모: 원래\n    - 시간: 09:00\n외부');
  const view = read(state, id, 'work')!;
  assert.equal(view.regions.length, 2);
  assert(view.regions[1].contextRows.some(row => row.text.includes('날짜:')));
  const simultaneous = edit(state, view, view.regions[1].key, view.regions[1].raw.replace('원래', '바뀐 메모').replace('09:00', '10:00'));
  // The existing reconciler reallocates both property IDs for this bulk edit.
  // Keep that limitation explicit instead of silently repairing model identity.
  assert.deepEqual(simultaneous, { ok: false, reason: 'existing-line-removed' });
  const memo = success(state, id, raw => raw.replace('원래', '바뀐 메모'), 1);
  const result = success(memo.next, id, raw => raw.replace('09:00', '10:00'), 1);
  const task = M.tasks(result.next)[0];
  assert.equal(task.date, '2026-10-05'); assert.equal(task.note, '바뀐 메모'); assert.equal(task.time, '10:00');
  assert.deepEqual(result.next.documents[0].lines.slice(0, 3), state.documents[0].lines.slice(0, 3));
});

test('blank-only empty folder retains blank identity and accepts an explicit new note', () => {
  const { state, id } = fixture('- 업무\n\n외부'), view = read(state, id, 'work')!;
  const insertion = view.regions.find(region => region.lineIds.length === 0)!;
  const result = edit(state, view, insertion.key, '  - 메모');
  assert(result.ok, JSON.stringify(result));
  assert.deepEqual(result.next.documents[0].lines.slice(0, 2), state.documents[0].lines.slice(0, 2));
});

test('a document containing only a task reference exposes readonly context without an editable fragment', () => {
  let { state } = fixture();
  const task = M.tasks(state).find(entry => entry.title === '할 일')!;
  state = M.addDocument(state, { title: '참조만' });
  const id = state.documents[1].id;
  state = M.editText(state, id, '- '); state = M.linkTask(state, id, 0, task.id);
  const view = read(state, id, 'work')!;
  assert(view.regions[0].readOnly);
  assert(view.regions[0].contextRows.some(row => row.isReference));
  assert.deepEqual(edit(state, view, view.regions[0].key, '- 변경'), { ok: false, reason: 'readonly-context' });
});

test('a token detects in-place workspace metadata changes despite identical document raw', () => {
  const { state, id } = fixture(), view = read(state, id, 'work')!, raw = M.raw(state.documents[0]);
  state.folders.find(folder => folder.id === 'work')!.title = '바뀐 이름';
  assert.equal(M.raw(state.documents[0]), raw);
  assert.deepEqual(edit(state, view, view.regions[0].key, view.regions[0].raw), { ok: false, reason: 'stale-workspace' });
});

test('editing one region cannot use a refreshed view to apply an old different-region boundary', () => {
  const { state, id } = fixture(), view = read(state, id, 'work')!, second = view.regions[1];
  const result = success(state, id, raw => `${raw}\n  - 새로운 줄`);
  assert.deepEqual(edit(result.next, view, second.key, '  - 덮어쓰기'), { ok: false, reason: 'stale-workspace' });
  const refreshed = read(result.next, id, 'work')!;
  assert.equal(refreshed.regions[1].key, second.key);
  assert.deepEqual(refreshed.regions[1].lineIds, second.lineIds);
  assert.equal(refreshed.regions[1].raw, second.raw);
});

test('new blank lines and empty Todo scaffolds preserve existing source identities and hidden context', () => {
  const { state, id } = fixture(), view = read(state, id, 'work')!, region = view.regions[0];
  for (const addition of ['\n', '\n  - [ ] ']) {
    const result = edit(state, view, region.key, region.raw + addition);
    assert(result.ok, JSON.stringify(result));
    const originalIds = new Set(state.documents[0].lines.map(line => line.id));
    assert.deepEqual(result.next.documents[0].lines.filter(line => originalIds.has(line.id)), state.documents[0].lines);
    assert.deepEqual(result.next.progressRecords, state.progressRecords);
    assert.deepEqual(result.next.taskScopes, state.taskScopes);
    assert.deepEqual(result.next.itemScopes, state.itemScopes);
    assert.equal(M.tasks(result.next).length, M.tasks(state).length);
  }
});

test('an autosaved blank becomes ordinary prose with the same source ID and inherited insertion context', () => {
  let { state, id } = fixture('[2026-10-01]\n- 업무\n  첫 메모\n외부');
  const saved = success(state, id, raw => raw + '\n  ');
  state = saved.next;
  const view = read(state, id, 'work')!, region = view.regions[0], blank = state.documents[0].lines[3];
  assert.equal(M.rowMeta(state, id)[3].kind, 'blank');
  const fullReconcile = M.editTextResult(state, id, view.fullRaw.replace('  \n외부', '  둘째 메모\n외부'));
  assert.notEqual(fullReconcile.state.documents[0].lines[3].id, blank.id);
  const result = edit(state, view, region.key, region.raw + '둘째 메모');
  assert(result.ok, JSON.stringify(result));
  assert.equal(result.next.documents[0].lines[3].id, blank.id);
  assert.equal(result.next.documents[0].lines[3].text, '  둘째 메모');
  assert.deepEqual(result.next.documents[0].lines.filter(line => line.id !== blank.id), state.documents[0].lines.filter(line => line.id !== blank.id));
  assert.equal(M.rowMeta(result.next, id)[3].kind, 'note');
  assert.deepEqual(M.rowMeta(result.next, id)[3].ancestorScopeIds, ['work']);
  assert.equal(M.rowMeta(result.next, id)[3].groupDate, '2026-10-01');
  assert.deepEqual(result.next.bindings, state.bindings); assert.deepEqual(result.next.itemScopes, state.itemScopes);
  assert.deepEqual(result.next.taskScopes, state.taskScopes); assert.deepEqual(result.next.progressRecords, state.progressRecords);
  assert.equal(M.tasks(result.next).length, 0);
  const continued = success(result.next, id, raw => raw.replace('둘째 메모', '둘째 메모 계속 작성'));
  assert.equal(continued.next.documents[0].lines[3].id, blank.id);
});

test('blank materialization only permits one same-depth ordinary note, not Item or context promotion', () => {
  const { state, id } = fixture('- 업무\n  첫 메모\n  \n외부'), view = read(state, id, 'work')!, region = view.regions[0], original = JSON.stringify(state);
  for (const replacement of [region.raw + '- [ ] 새 할 일', region.raw + '# 제목', region.raw + '[2026-11-01]',
    region.raw.slice(0, -2) + '    다른 깊이', region.raw.replace('첫 메모', '첫 메모 수정') + '둘째 메모']) {
    assert.equal(edit(state, view, region.key, replacement).ok, false, replacement);
  }
  const ordinary = edit(state, view, region.key, region.raw + '- 둘째 메모');
  assert(ordinary.ok, JSON.stringify(ordinary));
  assert.equal(ordinary.next.documents[0].lines[2].id, state.documents[0].lines[2].id);
  assert.equal(M.tasks(ordinary.next).length, 0);
  assert.equal(JSON.stringify(state), original);
});

test('a saved blank can become prose and continue with one same-context blank or note before autosave', () => {
  const { state, id } = fixture('[2026-10-01]\n- 업무\n  첫 메모\n  \n외부'), view = read(state, id, 'work')!, region = view.regions[0];
  const blank = state.documents[0].lines[3];
  for (const suffix of ['둘째 메모\n  ', '둘째 메모\n  셋째 메모', '- 둘째 메모\n  - ']) {
    const result = edit(state, view, region.key, region.raw + suffix);
    assert(result.ok, JSON.stringify(result));
    assert.equal(result.next.documents[0].lines[3].id, blank.id);
    const existingIds = new Set(state.documents[0].lines.map(line => line.id));
    assert.deepEqual(result.next.documents[0].lines.filter(line => existingIds.has(line.id) && line.id !== blank.id), state.documents[0].lines.filter(line => line.id !== blank.id));
    assert.equal(M.tasks(result.next).length, 0);
    assert.deepEqual(result.next.bindings, state.bindings); assert.deepEqual(result.next.progressRecords, state.progressRecords);
    const added = result.next.documents[0].lines[4];
    assert(!existingIds.has(added.id));
    assert.deepEqual(M.insertionContext(result.next, id, 4, 1), M.insertionContext(state, id, 3, 1));
  }
});

test('blank continuation still refuses multiple new paragraphs, several old blanks and new context or Item kinds', () => {
  const { state, id } = fixture('- 업무\n  첫 메모\n  \n외부'), view = read(state, id, 'work')!, region = view.regions[0], original = JSON.stringify(state);
  for (const suffix of ['둘째\n  셋째\n  넷째', '둘째\n  - [ ] 새 할 일', '둘째\n  # 새 제목',
    '둘째\n  [2026-11-01]', '둘째\n    다른 깊이']) {
    assert.equal(edit(state, view, region.key, region.raw + suffix).ok, false, suffix);
  }
  const many = fixture('- 업무\n  \n  \n외부'), manyView = read(many.state, many.id, 'work')!, manyRegion = manyView.regions[0];
  assert.equal(edit(many.state, manyView, manyRegion.key, '  첫째\n  둘째').ok, false);
  const item = fixture('- 업무\n  - [ ] 원래 할 일\n    \n외부'), itemView = read(item.state, item.id, 'work')!, itemRegion = itemView.regions[0];
  assert.equal(edit(item.state, itemView, itemRegion.key, itemRegion.raw + '메모\n    - 메모: 속성').ok, false);
  assert.equal(JSON.stringify(state), original);
  assert.equal(edit(state, view, region.key, region.raw.replace('첫 메모', '- [ ] 첫 메모') + '둘째\n  셋째').ok, false);
});

test('forged blank ownership cannot gain a read or edit capability through the prose identity exception', () => {
  const fixtureState = fixture('- 업무\n  첫 메모\n  \n외부');
  const blankId = fixtureState.state.documents[0].lines[2].id, view = read(fixtureState.state, fixtureState.id, 'work')!, region = view.regions[0];
  for (const registry of ['taskScopes', 'itemScopes'] as const) {
    const state = { ...fixtureState.state, [registry]: { ...fixtureState.state[registry], [blankId]: 'work' } };
    assert(!M.validate(state)); assert.equal(read(state, fixtureState.id, 'work'), null);
    const original = JSON.stringify(state);
    assert.equal(edit(state, view, region.key, region.raw + '둘째 메모').ok, false);
    assert.equal(JSON.stringify(state), original);
    assert.equal(state[registry][blankId], 'work');
  }
});

test('a Flow document uses the same narrow blank identity preservation without changing its metadata', () => {
  const f = fixture('- 업무\n  첫 메모\n  \n외부'), doc = f.state.documents[0];
  const state: TextWorkspaceState = { ...f.state, documents: [], flows: [{ ...doc, private: true, sourceVersion: 'v1' }] };
  assert(M.validate(state));
  const view = read(state, f.id, 'work')!, region = view.regions[0];
  const result = edit(state, view, region.key, region.raw + '둘째 메모');
  assert(result.ok, JSON.stringify(result));
  assert.equal(result.next.flows[0].lines[2].id, doc.lines[2].id);
  assert.equal(result.next.flows[0].sourceVersion, 'v1'); assert.equal(result.next.flows[0].private, true);
  assert.deepEqual(result.next.documents, []);
});

test('repeated memo properties use the existing grammar and preserve Item identity', () => {
  const { state, id } = fixture('- 업무\n  - [ ] 할 일\n    - 메모: 첫 문장\n외부');
  const task = M.tasks(state)[0];
  const result = success(state, id, raw => raw + '\n    - 메모: 둘째 문장');
  const updated = M.tasks(result.next).find(entry => entry.id === task.id)!;
  assert.equal(updated.note, '첫 문장\n둘째 문장');
  assert.equal(updated.scopeId, task.scopeId); assert.equal(updated.date, task.date);
});

test('typing a title into a new empty scaffold reveals the existing folder and date context', () => {
  const { state, id } = fixture(), view = read(state, id, 'work')!, region = view.regions[0];
  const scaffold = edit(state, view, region.key, region.raw + '\n  - [ ] ');
  assert(scaffold.ok, JSON.stringify(scaffold));
  const refreshed = read(scaffold.next, id, 'work')!, current = refreshed.regions[0];
  const emptyLine = scaffold.next.documents[0].lines.find(line => line.text === '  - [ ] ')!;
  const titled = edit(scaffold.next, refreshed, current.key, current.raw.slice(0, -emptyLine.text.length) + '  - [ ] 새 할 일');
  assert(titled.ok, JSON.stringify(titled));
  const task = M.tasks(titled.next).find(entry => entry.id === emptyLine.id)!;
  assert.equal(task.title, '새 할 일'); assert.equal(task.scopeId, 'work'); assert.equal(task.date, '2026-10-01');
  assert.deepEqual(titled.next.progressRecords, state.progressRecords);
});

test('existing empty scaffolds cannot exit their type or change depth through a bounded edit', () => {
  const { state, id } = fixture('- 업무\n  - [ ] \n외부'), view = read(state, id, 'work')!, region = view.regions[0];
  for (const raw of ['', '  ', '- [ ] ']) assert.equal(edit(state, view, region.key, raw).ok, false);
});

test('dormant source Item title changes retain its exact owner, ID and other progress records', () => {
  let { state, id } = fixture();
  const task = M.tasks(state).find(entry => entry.title === '할 일')!;
  const tracked = M.tasks(state).find(entry => entry.title === '외부 할 일')!;
  state = M.recordProgress(state, tracked.id, '2026-09-30', 20);
  const taskRow = M.rowMeta(state, id).find(row => row.id === task.id)!;
  const raw = state.documents[0].lines.filter((_, index) => index <= taskRow.index || index >= taskRow.subtreeEndIndex)
    .map(line => line.id === task.id ? '  - [ ] ' : line.text).join('\n');
  state = M.editText(state, id, raw);
  assert.equal(state.documents[0].lines.find(line => line.id === task.id)?.text, '  - [ ] ');
  assert(state.itemScopes[task.id]); assert(state.progressRecords.some(record => record.taskId === tracked.id));
  const view = read(state, id, 'work')!, region = view.regions[0];
  const renamed = edit(state, view, region.key, region.raw.replace('  - [ ] ', '  - [ ] 되살린 제목'));
  assert(renamed.ok, JSON.stringify(renamed));
  assert(M.tasks(renamed.next).some(entry => entry.id === task.id && entry.title === '되살린 제목'));
  assert.deepEqual(renamed.next.itemScopes, state.itemScopes); assert.deepEqual(renamed.next.taskScopes, state.taskScopes);
  assert.deepEqual(renamed.next.progressRecords, state.progressRecords);
  for (const raw of [region.raw.replace('  - [ ] ', '  '), region.raw.replace('  - [ ] ', '- [ ] ')]) assert.equal(edit(state, view, region.key, raw).ok, false);
});

test('a recorded Item cannot become an empty scaffold or lose its title through partial text', () => {
  let { state, id } = fixture();
  const task = M.tasks(state).find(entry => entry.title === '할 일')!;
  state = M.recordProgress(state, task.id, '2026-09-30', 20);
  const view = read(state, id, 'work')!, region = view.regions[0], original = JSON.stringify(state);
  const changed = region.raw.replace('  - [ ] 할 일', '  - [ ] ');
  assert.notEqual(changed, region.raw);
  assert.equal(edit(state, view, region.key, changed).ok, false);
  assert.equal(JSON.stringify(state), original);
  assert(state.progressRecords.some(record => record.taskId === task.id));
});

test('a dormant Item outside the selected ownership remains protected despite its visible outline location', () => {
  let { state, id } = fixture();
  const task = M.tasks(state).find(entry => entry.title === '할 일')!;
  state = { ...state, taskScopes: { ...state.taskScopes, [task.id]: 'folder-unfiled' }, itemScopes: { ...state.itemScopes, [task.id]: 'folder-unfiled' } };
  state = M.editText(state, id, M.raw(state.documents[0]).replace('  - [ ] 할 일\n    - 메모: 설명\n    - 시간: 09:00', '  - [ ] '));
  assert(M.validate(state));
  const view = read(state, id, 'work')!;
  assert(!view.regions.some(region => region.lineIds.includes(task.id)));
  assert(view.regions.some(region => region.contextRows.some(row => row.id === task.id)));
  assert.equal(state.itemScopes[task.id], 'folder-unfiled');
});

test('local handoff capability validates exact view, full model and region boundaries without authorizing an edit', () => {
  const { state, id } = fixture(), view = read(state, id, 'work')!;
  assert(isProgramFolderViewCurrent(state, view));
  assert(!isProgramFolderViewCurrent(state, { ...view }));
  const changed = M.editText(state, id, M.raw(state.documents[0]).replace('외부 메모', '새 외부 메모'));
  assert(!isProgramFolderViewCurrent(changed, view));
  view.regions[0].lineIds.reverse();
  assert(!isProgramFolderViewCurrent(state, view));
});
