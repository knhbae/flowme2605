import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData } from './contract';
import { createProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { programOrderedExecutionRows } from './recurrence-order';
import { programContinueBand, programContinueMeta, programSameTaskGroups, programSameTaskKey } from './continue-band';

// F8 1단계 (11/10): '이어지는 일' over a writing document, and 오늘's '같은 일 n줄'.
const TODAY = '2026-11-10';
function written(raw: string, other?: string) {
  let data: ProgramData = createProgramData();
  const actor = data.activeActorId, made = createProgramDocument(data, { actorId: actor, requestId: 'f8s1-a', expectedSpace: data.spaces[actor], title: '작성한 글' });
  assert(made.ok); data = programClone(made.data);
  let text = M.editTextResult(data.spaces[actor].text, made.result, raw, { folderText: true });
  assert.equal(text.reason, null);
  data.spaces[actor] = { ...data.spaces[actor], text: text.state };
  let otherId: string | null = null;
  if (other) {
    const second = createProgramDocument(data, { actorId: actor, requestId: 'f8s1-b', expectedSpace: data.spaces[actor], title: '회사' });
    assert(second.ok); data = programClone(second.data); otherId = second.result;
    text = M.editTextResult(data.spaces[actor].text, otherId, other, { folderText: true });
    assert.equal(text.reason, null);
    data.spaces[actor] = { ...data.spaces[actor], text: text.state };
  }
  const rows = programOrderedExecutionRows(data, { period: 'today', date: TODAY, today: TODAY, folderId: '', query: '', includeHeld: false, includeExcluded: false, page: 0 }).rows;
  return { data, actor, documentId: made.result, otherId, rows };
}
const context = (documentId: string, extra: Partial<Parameters<typeof programContinueBand>[1]> = {}) => ({ today: TODAY, documentId, flowTitle: () => null, repeat: () => null, progress: () => null, ...extra });

test('the band: a task moved to today from an older section, and another document\'s today; not this document\'s today section; the late counted', () => {
  const { rows, documentId } = written(['[2026-11-07]', '- [ ] 밀린 서류', '[2026-11-08]', '- [ ] 세금 서류 챙기기', '  - 날짜: 2026-11-10', '[2026-11-10]', '- [ ] 회의실 잡기'].join('\n'),
    ['[2026-11-10]', '- [ ] 은행 서류 보내기'].join('\n'));
  const band = programContinueBand(rows, context(documentId));
  assert.deepEqual(band.rows.map(row => [row.task.title, row.kind]), [['세금 서류 챙기기', 'moved'], ['은행 서류 보내기', 'moved']]);
  assert.equal(band.late, 1);
  assert(!band.rows.some(row => row.task.title === '회의실 잡기'), 'this document\'s today section is not in the band (taskId)');
  const [moved, other] = band.rows;
  assert.deepEqual(programContinueMeta(moved.task, documentId, '집안일'), ['11/8에 씀', '미룸', '/ 집안일']);
  assert.deepEqual(programContinueMeta(other.task, documentId, null), ['‘회사’ 문서']);
  assert.deepEqual(programContinueMeta(moved.task, documentId, null, 'repeat'), ['11/8에 씀'], 'a repeat line\'s date is its start, not a move');
});

test('the band: Flow, moved, progress, repeat in that order; done and 100% left out; nothing, no rows', () => {
  const { rows, documentId, otherId } = written(['[2026-11-08]', '- [ ] 운동 30분', '  - 날짜: 2026-11-10', '- [ ] 보고서 다듬기', '  - 날짜: 2026-11-10',
    '- [ ] 끝낸 일', '  - 날짜: 2026-11-10', '- [x] 이미 끝냄', '  - 날짜: 2026-11-10', '- [ ] 세금 서류', '  - 날짜: 2026-11-10'].join('\n'), ['[2026-11-10]', '- [ ] 전입 신고'].join('\n'));
  const id = (title: string) => rows.find(row => row.kind === 'text-task' && row.task.title === title)!.kind === 'text-task' ? (rows.find(row => row.kind === 'text-task' && row.task.title === title) as { task: { id: string } }).task.id : '';
  const band = programContinueBand(rows, context(documentId, {
    flowTitle: doc => doc === otherId ? '이사 준비 2주' : null,
    repeat: task => task === id('운동 30분') ? '↻ 매주 화' : null,
    progress: task => task === id('보고서 다듬기') ? 40 : task === id('끝낸 일') ? 100 : null }));
  assert.deepEqual(band.rows.map(row => [row.task.title, row.kind, row.percent, row.repeat, row.flowTitle]), [
    ['전입 신고', 'flow', null, null, '이사 준비 2주'], ['세금 서류', 'moved', null, null, null], ['보고서 다듬기', 'progress', 40, null, null], ['운동 30분', 'repeat', null, '↻ 매주 화', null]]);
  assert.equal(band.flow, 1);
  assert.deepEqual(programContinueBand([], context(documentId)), { rows: [], late: 0, flow: 0 });
});

test('같은 일: words without the repeat marker, spaces folded, the ending punctuation off; one row per group and folder, the first written standing', () => {
  assert.equal(programSameTaskKey('  보고서  다듬기. '), '보고서 다듬기');
  assert.equal(programSameTaskKey('운동 30분 @매주 화'), '운동 30분');
  assert.equal(programSameTaskKey('보고서 다듬기!!'), programSameTaskKey('보고서 다듬기'));
  const task = (id: string, title: string, groupDate: string | null, folder = 'f', sourceIndex = 0) => ({ id, title, groupDate, folderId: folder, docId: 'd', sourceIndex }) as never;
  const rows = [
    { task: task('c', '독서 모임 책 사기', '2026-11-08', 'f', 9), group: 'past-incomplete' }, { task: task('a', '독서 모임 책 사기.', '2026-11-06', 'f', 3), group: 'past-incomplete' },
    { task: task('b', '독서 모임 책 사기', '2026-11-07', 'f', 6), group: 'past-incomplete' }, { task: task('x', '독서 모임 책 사기', '2026-11-07', 'g', 7), group: 'past-incomplete' },
    { task: task('t', '독서 모임 책 사기', '2026-11-10', 'f', 12), group: 'on-date' }];
  const groups = programSameTaskGroups(rows, row => (row as unknown as { folderId: string }).folderId);
  assert.deepEqual([...groups.members].map(([id, members]) => [id, members.map(member => member.id)]), [['a', ['a', 'b', 'c']]]);
  assert.deepEqual([...groups.hidden].sort(), ['b', 'c'], 'another folder and today\'s group stay their own rows');
});
