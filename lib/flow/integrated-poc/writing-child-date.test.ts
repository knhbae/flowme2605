import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData } from './contract';
import { createProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { prepareWritingChild } from './writing-child-command';
import { programOrderedExecutionRows } from './recurrence-order';

// 11/10 decision (sheet '추가' follow-up): a child task added from the sheet gets '- 날짜:' only when it would read another
// day without it. A child reads its own section's day, not its parent's; the readers (M.tasks, 오늘's query, 미루기, the
// F8 band) must give it its parent's day in every case.
function child(raw: string) {
  let data: ProgramData = createProgramData();
  const actor = data.activeActorId, made = createProgramDocument(data, { actorId: actor, requestId: 'child-date', expectedSpace: data.spaces[actor], title: '작성한 글' });
  assert(made.ok); data = programClone(made.data);
  const typed = M.editTextResult(data.spaces[actor].text, made.result, raw, { folderText: true });
  assert.equal(typed.reason, null);
  const parent = M.tasks(typed.state).find(task => task.title === '부모')!;
  const added = prepareWritingChild(typed.state, { docId: made.result, parentId: parent.id, kind: 'task', text: '자식', expectedRaw: M.raw(M.getDocument(typed.state, made.result)!) });
  assert(added.ok, added.ok ? '' : added.reason);
  data.spaces[actor] = { ...data.spaces[actor], text: added.workspace };
  const read = M.tasks(added.workspace).find(task => task.title === '자식')!;
  const today = programOrderedExecutionRows(data, { period: 'today', date: parent.date!, today: parent.date!, folderId: '', query: '', includeHeld: false, includeExcluded: false, page: 0 })
    .rows.flatMap(row => row.kind === 'text-task' && row.task.title === '자식' ? [row.date] : []);
  return { raw: M.raw(M.getDocument(added.workspace, made.result)!), parentDate: parent.date, read, today };
}

test('a parent of its own section (no date line): the child adds no date line and reads the section\'s day', () => {
  const result = child(['[2026-11-10]', '- [ ] 부모'].join('\n'));
  assert.equal(result.raw, ['[2026-11-10]', '- [ ] 부모', '  - [ ] 자식'].join('\n'));
  assert.equal(result.read.date, '2026-11-10');
  assert.equal(result.read.parentTaskId !== null, true);
  assert.deepEqual(result.today, ['2026-11-10']);
});

test('a parent moved to another day: the child keeps the parent\'s day by its own date line', () => {
  const result = child(['[2026-11-10]', '- [ ] 부모', '  - 날짜: 2026-11-12'].join('\n'));
  assert.equal(result.raw, ['[2026-11-10]', '- [ ] 부모', '  - 날짜: 2026-11-12', '  - [ ] 자식', '    - 날짜: 2026-11-12'].join('\n'));
  assert.equal(result.read.date, '2026-11-12');
  assert.deepEqual(result.today, ['2026-11-12']);
});

test('a parent dated in an undated part: the child keeps the parent\'s day by its own date line', () => {
  const result = child(['- [ ] 부모', '  - 날짜: 2026-11-12'].join('\n'));
  assert.equal(result.raw, ['- [ ] 부모', '  - 날짜: 2026-11-12', '  - [ ] 자식', '    - 날짜: 2026-11-12'].join('\n'));
  assert.equal(result.read.date, '2026-11-12');
  assert.deepEqual(result.today, ['2026-11-12']);
});
