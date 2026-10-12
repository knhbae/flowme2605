import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEmptyTextWorkspace,
  textEditorRows,
  textWorkspaceModel as M,
  type TextEditorRowMeta,
  type TextWorkspaceState,
} from './text-workspace';

function document(raw: string) {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '진행률 회귀용 문서' });
  const id = state.documents[0].id;
  state = M.editText(state, id, raw, { progressDate: '2026-10-12' });
  assert.equal(M.raw(state.documents[0]), raw);
  assert(M.validate(state));
  return { state, id };
}

function progress(row: TextEditorRowMeta) {
  return {
    targetId: row.progressTargetId,
    percent: row.progressPercent,
    date: row.progressDate,
    tracked: row.progressTracked,
  };
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test('editor progress picks the latest date per target rather than record position or percentage', () => {
  const { state, id } = document('- [ ] 준비\n- [ ] 예약');
  const [preparation, reservation] = state.documents[0].lines;
  state.progressRecords = [
    { taskId: preparation.id, date: '2026-12-31', percent: 80 },
    { taskId: reservation.id, date: '2027-01-02', percent: 40 },
    { taskId: preparation.id, date: '2027-01-01', percent: 0 },
    { taskId: reservation.id, date: '2026-10-12', percent: 90 },
    { taskId: preparation.id, date: '2026-10-12', percent: 60 },
  ];
  assert(M.validate(state));
  const before = structuredClone(state);
  assert.deepEqual(textEditorRows(state, id).map(progress), [
    { targetId: preparation.id, percent: 0, date: '2027-01-01', tracked: true },
    { targetId: reservation.id, percent: 40, date: '2027-01-02', tracked: true },
  ]);
  assert.deepEqual(state, before, 'reading never sorts or rewrites dated records');
});

test('unrecorded tasks and subchecks keep checkbox fallback without becoming tracked', () => {
  const { state, id } = document('- [ ] 준비\n  - [x] 물품\n- [x] 예약\n  - [ ] 연락');
  assert.deepEqual(textEditorRows(state, id).map(progress), state.documents[0].lines.map((line, index) => ({
    targetId: line.id, percent: index === 1 || index === 2 ? 100 : 0, date: null, tracked: false,
  })));
  assert.deepEqual(state.progressRecords, []);
});

test('tracked zero, forty and one hundred override stale numeric source tokens', () => {
  let { state, id } = document('- [10%] 시작\n- [10%] 진행\n- [10%] 완료');
  const ids = state.documents[0].lines.map(line => line.id);
  for (const [index, percent] of [0, 40, 100].entries()) {
    state = M.recordProgress(state, ids[index], '2026-10-13', percent);
  }
  assert(M.validate(state));
  assert.deepEqual(textEditorRows(state, id).map(progress), ids.map((targetId, index) => ({
    targetId, percent: [0, 40, 100][index], date: '2026-10-13', tracked: true,
  })));
  assert.equal(M.raw(state.documents[0]), '- [10%] 시작\n- [10%] 진행\n- [10%] 완료');
});

test('reference rows use their canonical target history and retain local row identity', () => {
  let { state, id } = document('- [ ] 준비');
  const canonicalId = state.documents[0].lines[0].id;
  state = M.recordProgress(state, canonicalId, '2026-10-12', 40);
  state = M.addDocument(state, { title: '참조 문서' });
  const referenceDocId = state.documents.at(-1)!.id;
  state = M.linkTask(state, referenceDocId, 0, canonicalId);
  assert(M.validate(state));
  const before = structuredClone(state);
  const canonical = textEditorRows(state, id)[0];
  const reference = textEditorRows(state, referenceDocId)[0];
  assert.notEqual(reference.id, canonicalId);
  assert.equal(reference.id, state.documents.at(-1)!.lines[0].id);
  assert.equal(reference.kind, 'reference');
  assert.equal(reference.isCanonical, !!M.rowMeta(state, referenceDocId)[0].isCanonical);
  assert.equal(reference.label, canonical.label);
  assert.deepEqual(progress(reference), progress(canonical));
  assert.deepEqual(progress(reference), { targetId: canonicalId, percent: 40, date: '2026-10-12', tracked: true });
  assert.deepEqual(state, before);
});

test('subcheck progress stays on its own source ID independently of its parent', () => {
  let { state, id } = document('[2026-10-12]\n- [ ] 준비\n  - [ ] 물품');
  const parentId = state.documents[0].lines[1].id;
  const childId = state.documents[0].lines[2].id;
  state = M.recordProgress(state, parentId, '2026-10-13', 40);
  state = M.recordProgress(state, childId, '2026-10-14', 100);
  const rows = textEditorRows(state, id);
  assert.equal(rows[1].kind, 'task');
  assert.equal(rows[2].kind, 'subcheck');
  assert.deepEqual(progress(rows[1]), { targetId: parentId, percent: 40, date: '2026-10-13', tracked: true });
  assert.deepEqual(progress(rows[2]), { targetId: childId, percent: 100, date: '2026-10-14', tracked: true });
  assert.equal(rows[2].depth, 1);
  assert.equal(M.tasks(state).length, 1, 'a child is not promoted or aggregated into a task');
});

test('memo-only documents expose no progress fields even when another document has history', () => {
  let { state } = document('- [40%] 다른 문서의 준비');
  state = M.addDocument(state, { title: '메모 문서' });
  const memoId = state.documents.at(-1)!.id;
  state = M.editText(state, memoId, '오늘의 메모\n\n## 확인할 내용');
  assert(M.validate(state));
  const rows = textEditorRows(state, memoId);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => row.kind), ['note', 'blank', 'heading']);
  for (const row of rows) {
    for (const field of ['progressTargetId', 'progressPercent', 'progressDate', 'progressTracked']) {
      assert.equal(Object.hasOwn(row, field), false, `${row.kind} must omit ${field}`);
    }
  }
});

test('invalid workspace data, missing documents and empty documents return no editor rows', () => {
  const { state, id } = document('- [ ] 준비');
  const taskId = state.documents[0].lines[0].id;
  const record = { taskId, date: '2026-10-12', percent: 40 };
  const invalid: unknown[] = [
    null,
    { ...state, version: 10 },
    { ...state, progressRecords: null },
    { ...state, progressRecords: [{ ...record, percent: 101 }] },
    { ...state, progressRecords: [{ ...record, date: '2026-02-30' }] },
    { ...state, progressRecords: [{ ...record, taskId: 'missing-task' }] },
    { ...state, progressRecords: [record, { ...record }] },
    { ...state, progressRecords: [{ ...record, percent: 100 }] },
  ];
  for (const candidate of invalid) {
    assert.equal(M.validate(candidate), false);
    assert.deepEqual(textEditorRows(candidate as TextWorkspaceState, id), []);
  }
  assert.deepEqual(textEditorRows(state, 'missing-document'), []);
  const empty = createEmptyTextWorkspace();
  empty.documents.push({ id: 'empty-document', title: '빈 문서', folder: '미분류', folderId: 'folder-unfiled', lines: [] });
  assert(M.validate(empty));
  assert.deepEqual(textEditorRows(empty, 'empty-document'), []);
  assert.deepEqual(textEditorRows(createEmptyTextWorkspace(), id), []);
});

test('each call sees mutations to the same workspace object, record, array and source checkbox', () => {
  const { state, id } = document('- [ ] 준비');
  const taskId = state.documents[0].lines[0].id;
  const expect = (percent: number, date: string | null, tracked: boolean) => {
    assert(M.validate(state));
    assert.deepEqual(progress(textEditorRows(state, id)[0]), { targetId: taskId, percent, date, tracked });
  };
  expect(0, null, false);
  state.progressRecords.push({ taskId, date: '2026-10-12', percent: 40 });
  expect(40, '2026-10-12', true);
  state.progressRecords[0].percent = 0;
  expect(0, '2026-10-12', true);
  state.progressRecords.push({ taskId, date: '2026-10-13', percent: 40 });
  expect(40, '2026-10-13', true);
  state.progressRecords = [{ taskId, date: '2026-10-14', percent: 0 }];
  expect(0, '2026-10-14', true);
  state.progressRecords.length = 0;
  state.documents[0].lines[0].text = '- [x] 준비';
  expect(100, null, false);
  state.progressRecords.push({ taskId, date: '2026-10-15', percent: 100 });
  expect(100, '2026-10-15', true);
});

test('editor projection reads a deeply frozen workspace without mutating its source or history', () => {
  const { state, id } = document('- [ ] 준비\n  - [ ] 물품\n메모');
  const [parent, child] = state.documents[0].lines;
  state.progressRecords = [
    { taskId: parent.id, date: '2026-10-13', percent: 40 },
    { taskId: child.id, date: '2026-10-14', percent: 0 },
    { taskId: parent.id, date: '2026-10-12', percent: 20 },
  ];
  assert(M.validate(state));
  const before = structuredClone(state);
  const documents = state.documents, records = state.progressRecords;
  freeze(state);
  const rows = textEditorRows(state, id);
  assert.deepEqual(rows.filter(row => row.progressTargetId).map(progress), [
    { targetId: parent.id, percent: 40, date: '2026-10-13', tracked: true },
    { targetId: child.id, percent: 0, date: '2026-10-14', tracked: true },
  ]);
  assert.deepEqual(state, before);
  assert.equal(state.documents, documents);
  assert.equal(state.progressRecords, records);
  rows[0].progressPercent = 100;
  assert.deepEqual(state, before, 'editor metadata cannot write through to a progress record');
});

test('progress projection cost: one history scan after rowMeta and zero per-row latestProgress queries', t => {
  const { state, id } = document('- [ ] 준비\n  - [ ] 물품\n- [ ] 예약\n- [ ] 기록 없음');
  const [parent, child, reservation] = state.documents[0].lines;
  state.progressRecords = [
    { taskId: parent.id, date: '2026-10-12', percent: 20 },
    { taskId: child.id, date: '2026-10-12', percent: 0 },
    { taskId: parent.id, date: '2026-10-13', percent: 40 },
    { taskId: reservation.id, date: '2026-10-12', percent: 40 },
  ];
  assert(M.validate(state));
  let projectionStarted = false;
  let recordReads = 0;
  state.progressRecords = new Proxy(state.progressRecords, {
    get(target, property, receiver) {
      if (projectionStarted && typeof property === 'string' && /^(0|[1-9]\d*)$/.test(property)) recordReads++;
      return Reflect.get(target, property, receiver);
    },
  });
  const originalRowMeta = M.rowMeta;
  const rowMeta = t.mock.method(M, 'rowMeta', (nextState: TextWorkspaceState, docId: string) => {
    const rows = originalRowMeta(nextState, docId);
    // Exclude rowMeta's existing validation and parsing; measure only projection work after it returns.
    recordReads = 0;
    projectionStarted = true;
    return rows;
  });
  const latestProgress = t.mock.method(M, 'latestProgress');
  const rows = textEditorRows(state, id);
  projectionStarted = false;
  assert.equal(rows.length, 4);
  assert.equal(rowMeta.mock.callCount(), 1);
  assert.equal(latestProgress.mock.callCount(), 0, 'do not repeat full workspace validation and history sorting for every row');
  assert.equal(recordReads, state.progressRecords.length, 'each record is visited once after row metadata is ready');
});
