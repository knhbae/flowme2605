import assert from 'node:assert/strict';
import test from 'node:test';
import { readProgramTaskDatePresentation } from './execution-presentation';
import { programTaskDateChangeHint, readProgramMemoContext } from './text-context-presentation';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

function fixture(raw: string) {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '문맥 확인' });
  const documentId = state.documents[0].id;
  state = M.editText(state, documentId, raw);
  assert.equal(M.raw(M.getDocument(state, documentId)), raw);
  assert(M.validate(state));
  const lineId = (text: string) => {
    const line = M.getDocument(state, documentId)!.lines.find(entry => entry.text === text);
    assert(line, `missing fixture line: ${text}`);
    return line.id;
  };
  return { state, documentId, lineId };
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function dateFixture(raw: string) {
  const f = fixture(raw), task = M.tasks(f.state)[0];
  assert(task);
  return { ...f, presentation: readProgramTaskDatePresentation(f.state, task) };
}

test('repeated direct memo lines identify one exact root Item and grant no mutation authority', () => {
  const f = fixture('- [ ] 보고서 준비\n  - 메모: 첫 줄\n  - 메모: 둘째 줄');
  const expected = {
    itemId: f.lineId('- [ ] 보고서 준비'), title: '보고서 준비', kind: 'task',
    label: '메모 · 보고서 준비', continuation: '메모 줄 끝에서 Enter를 누르면 같은 할 일의 메모를 이어 씁니다.',
  };
  for (const text of ['  - 메모: 첫 줄', '  - 메모: 둘째 줄']) {
    assert.deepEqual(readProgramMemoContext(f.state, f.documentId, f.lineId(text)), expected);
  }
  assert.equal(M.tasks(f.state)[0].note, '첫 줄\n둘째 줄');
});

test('child memo belongs to the direct subcheck rather than the nearby root task', () => {
  const f = fixture('- [ ] 부모\n  - 메모: 부모 기록\n  - [ ] 자식\n    - 메모: 자식 기록');
  const result = readProgramMemoContext(f.state, f.documentId, f.lineId('    - 메모: 자식 기록'));
  assert.equal(result?.itemId, f.lineId('  - [ ] 자식'));
  assert.equal(result?.title, '자식'); assert.equal(result?.kind, 'subcheck');
  assert.match(result!.continuation, /같은 하위 체크/);
  assert.notEqual(result?.itemId, f.lineId('- [ ] 부모'));
});

test('a previously registered Item retains task meaning after becoming structurally nested', () => {
  const f = fixture('- [ ] 부모\n- [ ] 등록된 자식\n  - 메모: 기록');
  const childId = f.lineId('- [ ] 등록된 자식'), memoId = f.lineId('  - 메모: 기록');
  const next = M.editText(f.state, f.documentId, '- [ ] 부모\n  - [ ] 등록된 자식\n    - 메모: 기록');
  assert.notEqual(next, f.state);
  const result = readProgramMemoContext(next, f.documentId, memoId);
  assert.equal(result?.itemId, childId); assert.equal(result?.kind, 'task');
  assert.match(result!.continuation, /같은 할 일/);
});

test('deep child memo identifies its immediate check rather than either ancestor', () => {
  const f = fixture('- [ ] 부모\n  - [ ] 자식\n    - [ ] 손자\n      - 메모: 손자 기록');
  const result = readProgramMemoContext(f.state, f.documentId, f.lineId('      - 메모: 손자 기록'));
  assert.equal(result?.itemId, f.lineId('    - [ ] 손자'));
  assert.equal(result?.title, '손자'); assert.equal(result?.kind, 'subcheck');
});

test('ordinary prose, a blank line and a top-level memo-like line produce no Item memo guidance', () => {
  const f = fixture('일반 문장\n\n- 메모: 문서 메모\n- [ ] 실제 할 일\n  들여쓴 설명');
  for (const text of ['일반 문장', '', '- 메모: 문서 메모', '  들여쓴 설명', '- [ ] 실제 할 일']) {
    assert.equal(readProgramMemoContext(f.state, f.documentId, f.lineId(text)), null);
  }
  assert.equal(M.tasks(f.state).length, 1);
});

test('memo-looking content inside a fence has no execution owner guidance', () => {
  const f = fixture('~~~\n- [ ] 코드 예시\n  - 메모: 실행 메모 아님\n~~~');
  assert.equal(readProgramMemoContext(f.state, f.documentId, f.lineId('  - 메모: 실행 메모 아님')), null);
  assert.equal(M.tasks(f.state).length, 0);
});

test('orphan memo properties do not borrow a task beyond a prose or depth boundary', () => {
  for (const raw of ['일반 문장\n  - 메모: 귀속 없음', '- [ ] 부모\n  설명\n    - 메모: 귀속 없음']) {
    const f = fixture(raw), memo = M.getDocument(f.state, f.documentId)!.lines.at(-1)!;
    assert(M.parseDocument(M.getDocument(f.state, f.documentId)!, f.state).issues.some(issue => issue.code === 'orphan-property'));
    assert.equal(readProgramMemoContext(f.state, f.documentId, memo.id), null);
  }
});

test('an empty checkbox scaffold does not grant its following memo an Item owner', () => {
  const f = fixture('- [ ] \n  - 메모: 아직 제목 없음');
  assert.equal(readProgramMemoContext(f.state, f.documentId, f.lineId('  - 메모: 아직 제목 없음')), null);
  assert.equal(M.tasks(f.state).length, 0);
});

test('date and time properties never receive memo continuation guidance', () => {
  const f = fixture('- [ ] 준비\n  - 날짜: 2026-10-04\n  - 시간: 09:10');
  for (const text of ['  - 날짜: 2026-10-04', '  - 시간: 09:10']) {
    assert.equal(readProgramMemoContext(f.state, f.documentId, f.lineId(text)), null);
  }
});

test('null, missing or foreign document/line targets do not invent an owner', () => {
  const f = fixture('- [ ] 준비\n  - 메모: 기록'), memoId = f.lineId('  - 메모: 기록');
  assert.equal(readProgramMemoContext(f.state, f.documentId, null), null);
  assert.equal(readProgramMemoContext(f.state, f.documentId, 'missing-line'), null);
  assert.equal(readProgramMemoContext(f.state, 'missing-document', memoId), null);
  const other = M.addDocument(f.state, { title: '다른 문서' });
  assert.equal(readProgramMemoContext(other, other.documents.at(-1)!.id, memoId), null);
});

test('a reference memo has no direct-owner instruction and cannot claim canonical edit authority', () => {
  const f = fixture('- [ ] 원래 항목\n  - 메모: 원래 기록');
  let linked = M.addDocument(f.state, { title: '참조 문서' }); const linkedId = linked.documents.at(-1)!.id;
  linked = M.linkTask(linked, linkedId, 0, f.lineId('- [ ] 원래 항목'));
  const reference = M.getDocument(linked, linkedId)!.lines[0];
  assert.equal(readProgramMemoContext(linked, linkedId, reference.id), null);
  const raw = M.raw(M.getDocument(linked, linkedId)) + '\n  - 메모: 참조 쪽 기록';
  assert.equal(M.editText(linked, linkedId, raw), linked, 'the existing writer rejects reference-owned memo properties');
  // Read-only defence for an unsupported snapshot, never a permitted write fixture.
  const unsupported = structuredClone(linked), memo = { id: 'unsupported-reference-memo', text: '  - 메모: 참조 쪽 기록' };
  M.getDocument(unsupported, linkedId)!.lines.push(memo);
  assert.equal(M.validate(unsupported), false);
  assert.equal(readProgramMemoContext(unsupported, linkedId, memo.id), null);
  assert.equal(M.tasks(linked).length, 1);
});

test('HTML-like title characters remain plain string data for the caller to escape', () => {
  const title = '<img src=x onerror=alert(1)> & "준비"';
  const f = fixture(`- [ ] ${title}\n  - 메모: 내용`);
  const result = readProgramMemoContext(f.state, f.documentId, f.lineId('  - 메모: 내용'));
  assert.equal(result?.title, title); assert.equal(result?.label, `메모 · ${title}`);
  assert.deepEqual(Object.keys(result!).sort(), ['continuation', 'itemId', 'kind', 'label', 'title']);
});

test('memo context reads deeply frozen JSON without changing raw, IDs, dates or records', () => {
  const f = fixture('[2026-10-04]\n- [20%] 준비\n  - 시간: 09:10\n  - 메모: 기록');
  const before = JSON.stringify(f.state), frozen = freeze(JSON.parse(before) as TextWorkspaceState);
  assert(readProgramMemoContext(frozen, f.documentId, f.lineId('  - 메모: 기록')));
  assert.equal(JSON.stringify(frozen), before); assert.equal(JSON.stringify(f.state), before);
});

test('unchanged inherited date does not suggest converting it to an individual exception', () => {
  const f = dateFixture('[2026-10-04]\n- [ ] 준비');
  assert.equal(f.presentation?.source, 'section');
  assert.equal(programTaskDateChangeHint(f.presentation, '2026-10-04'), null);
});

test('unchanged explicit date equal to its section produces no change hint', () => {
  const f = dateFixture('[2026-10-04]\n- [ ] 준비\n  - 날짜: 2026-10-04');
  assert.equal(f.presentation?.source, 'individual');
  assert.equal(programTaskDateChangeHint(f.presentation, '2026-10-04'), null);
});

test('a valid time-only edit explains the existing individual pin of an inherited date without mutation', () => {
  const f = dateFixture('[2026-10-04]\n- [ ] 준비\n  - 시간: 09:00');
  assert.equal(f.presentation?.source, 'section'); assert(f.presentation);
  const before = JSON.stringify(f.state), presentation = freeze(structuredClone(f.presentation));
  for (const timeEdit of [{ current: '09:00', draft: '10:00' }, { current: '09:00', draft: '' }, { current: '', draft: '09:00' }]) {
    const frozenEdit = freeze(timeEdit), editBefore = JSON.stringify(frozenEdit);
    assert.equal(programTaskDateChangeHint(presentation, '2026-10-04', frozenEdit),
      '시간을 바꾸면 실행 날짜도 2026-10-04으로 개별 지정됩니다. 원문 위치와 구획 날짜는 그대로입니다.');
    assert.equal(JSON.stringify(frozenEdit), editBefore);
  }
  assert.equal(JSON.stringify(f.state), before);
  assert.deepEqual(presentation, f.presentation);
  assert.equal(M.tasks(f.state)[0].explicitDate, false);
});

test('time-only hints stay hidden for individual dates, unchanged times and invalid time edits', () => {
  for (const raw of ['[2026-10-04]\n- [ ] 준비\n  - 날짜: 2026-10-04', '[2026-10-04]\n- [ ] 준비\n  - 날짜: 미정']) {
    const f = dateFixture(raw); assert.equal(f.presentation?.source, 'individual');
    assert.equal(programTaskDateChangeHint(f.presentation, f.presentation!.effectiveDate || '', { current: '09:00', draft: '10:00' }), null);
  }
  const f = dateFixture('[2026-10-04]\n- [ ] 준비\n  - 시간: 09:00');
  for (const timeEdit of [
    { current: '09:00', draft: '09:00' }, { current: '', draft: '' },
    { current: '24:00', draft: '10:00' }, { current: '09:00', draft: '24:00' },
    { current: '09:00', draft: '09:60' }, { current: '09:00', draft: '9:00' },
    { current: '09:00', draft: ' ' }, { current: null, draft: '10:00' }, { current: '09:00', draft: 1000 },
  ]) {
    assert.equal(programTaskDateChangeHint(f.presentation, '2026-10-04', timeEdit as { current: string; draft: string }), null);
  }
  assert.equal(programTaskDateChangeHint(f.presentation, '2026-10-04'), null);
});

test('the existing date-and-time model patch pins an inherited date while preserving the same Item and its context', () => {
  const f = fixture('[2026-10-04]\n- [ ] 준비\n  - 메모: 기존 기록\n  - 시간: 09:00');
  const initialTask = M.tasks(f.state)[0];
  const state = M.recordProgress(f.state, initialTask.id, '2026-10-03', 20);
  assert(M.validate(state));
  const task = M.tasks(state)[0], before = JSON.stringify(state);
  assert.equal(task.explicitDate, false);
  const next = M.updateTask(state, task.id, { date: task.date, time: '10:00' });
  assert.notEqual(next, state); assert(M.validate(next));
  const after = M.tasks(next)[0];
  assert.equal(after.id, task.id); assert.equal(after.docId, task.docId);
  assert.equal(after.date, task.date); assert.equal(after.explicitDate, true); assert.equal(after.time, '10:00');
  assert.equal(after.title, task.title); assert.equal(after.note, task.note); assert.equal(after.done, task.done);
  assert.equal(after.sourceIndex, task.sourceIndex);
  assert.deepEqual(next.progressRecords, state.progressRecords);
  assert.deepEqual(next.taskScopes, state.taskScopes); assert.deepEqual(next.itemScopes, state.itemScopes);
  assert.deepEqual(next.folders, state.folders);
  assert.deepEqual(M.getDocument(next, f.documentId)!.lines[0], M.getDocument(state, f.documentId)!.lines[0]);
  assert.match(M.raw(M.getDocument(next, f.documentId)), /\n  - 날짜: 2026-10-04(?:\n|$)/);
  const presentation = readProgramTaskDatePresentation(next, after);
  assert.equal(presentation?.source, 'individual'); assert.equal(presentation?.sectionDate, '2026-10-04');
  assert.equal(JSON.stringify(state), before);
});

test('changing an inherited date explains the individual date and retained source placement', () => {
  const f = dateFixture('[2026-10-04]\n- [ ] 준비');
  const hint = programTaskDateChangeHint(f.presentation, '2026-10-05');
  assert.equal(hint, '실행 날짜를 2026-10-05으로 개별 지정합니다. 원문 위치와 구획 날짜는 그대로입니다.');
  assert.equal(M.tasks(f.state)[0].date, '2026-10-04');
});

test('changing an individual exception to its section date still describes individual assignment', () => {
  const f = dateFixture('[2026-10-04]\n- [ ] 준비\n  - 날짜: 2026-10-05');
  assert.equal(programTaskDateChangeHint(f.presentation, '2026-10-04'),
    '실행 날짜를 2026-10-04으로 개별 지정합니다. 원문 위치와 구획 날짜는 그대로입니다.');
});

test('an undated Item can preview a valid individual date without being moved or duplicated', () => {
  for (const raw of ['- [ ] 준비', '[미정]\n- [ ] 준비', '[2026-10-04]\n- [ ] 준비\n  - 날짜: 미정']) {
    const f = dateFixture(raw), before = JSON.stringify(f.state);
    assert.match(programTaskDateChangeHint(f.presentation, '2026-10-05')!, /2026-10-05.*개별 지정/);
    assert.equal(JSON.stringify(f.state), before); assert.equal(M.tasks(f.state).length, 1);
  }
});

test('clearing a dated draft explains explicit unscheduled assignment rather than inheritance restoration', () => {
  const f = dateFixture('[2026-10-04]\n- [ ] 준비\n  - 날짜: 2026-10-05');
  assert.equal(programTaskDateChangeHint(f.presentation, ''),
    '실행 날짜를 미정으로 개별 지정합니다. 원문 위치와 구획 날짜는 그대로입니다.');
});

test('already undated individual, section and outside-section sources all have no empty-draft change hint', () => {
  for (const raw of ['- [ ] 준비', '[미정]\n- [ ] 준비', '[2026-10-04]\n- [ ] 준비\n  - 날짜: 미정']) {
    const f = dateFixture(raw); assert.equal(f.presentation?.effectiveDate, null);
    assert.equal(programTaskDateChangeHint(f.presentation, ''), null);
  }
});

test('missing presentation, invalid source or malformed date draft cannot claim a date change', () => {
  assert.equal(programTaskDateChangeHint(null, '2026-10-05'), null);
  for (const raw of ['[2026-02-30]\n- [ ] 준비', '- [ ] 준비\n  - 날짜: 2026-02-30']) {
    const f = dateFixture(raw); assert.equal(f.presentation, null);
    assert.equal(programTaskDateChangeHint(f.presentation, '2026-10-05'), null);
  }
  const f = dateFixture('[2026-10-04]\n- [ ] 준비');
  for (const value of ['2026-02-30', '2026/10/05', '2026-10-5', '미정', ' ', '2026-10-05T09:10']) {
    assert.equal(programTaskDateChangeHint(f.presentation, value), null);
  }
});

test('date hints accept frozen presentation JSON without mutation and reject non-string drafts defensively', () => {
  const f = dateFixture('[2026-10-04]\n- [ ] 준비\n  - 날짜: 2026-10-05'); assert(f.presentation);
  const before = JSON.stringify(f.presentation), presentation = freeze(JSON.parse(before));
  assert(programTaskDateChangeHint(presentation, '2026-10-06'));
  assert.equal(JSON.stringify(presentation), before); assert.equal(JSON.stringify(f.presentation), before);
  for (const value of [null, undefined, 0, {}, ['2026-10-06']]) {
    assert.equal(programTaskDateChangeHint(presentation, value as unknown as string), null);
  }
});
