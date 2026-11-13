import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { programDueSoonTasks } from './due-soon';
import { textWorkspaceModel as M } from './text-workspace';

function fixture(raw: string) {
  const data = createProgramData(), actorId = data.activeActorId;
  const made = createProgramDocument(data, { actorId, requestId: 'due-fixture', expectedSpace: data.spaces[actorId], title: '일정 글', raw });
  assert(made.ok); return { space: made.data.spaces[actorId], id: made.result };
}
test('W-TXT-11: D-3 inclusive and overdue, regardless of source day; only open valid deadlines, exact RAW/IDs/records unchanged', () => {
  const { space, id } = fixture('[2026-11-30]\n- [ ] 앞날 구획 일\n  - 마감: 2026-11-16\n- [x] 끝낸 일\n  - 마감: 2026-11-13\n- [ ] 먼 마감\n  - 마감: 2026-11-17\n[2026-11-01]\n- [ ] 지난 마감\n  - 마감: 2026-11-10\n[미정]\n- [ ] 미정의 오늘 마감\n  - 마감: 2026-11-13\n- [ ] 해석 안 되는 마감\n  - 마감: 언젠가\n- [ ] 마감 없음');
  const before = JSON.stringify(space), raw = M.raw(M.getDocument(space.text, id));
  assert.deepEqual(programDueSoonTasks(space, '2026-11-13').map(({ task, deadline }) => [task.title, task.date, deadline.days]),
    [['지난 마감', '2026-11-01', -3], ['미정의 오늘 마감', null, 0], ['앞날 구획 일', '2026-11-30', 3]]);
  assert.equal(JSON.stringify(space), before); assert.equal(M.raw(M.getDocument(space.text, id)), raw);
  assert.deepEqual(programDueSoonTasks(space, 'invalid'), []);
});
test('W-TXT-11: a headless document, month/year/leap boundary, and completed progress records', () => {
  const { space } = fixture('- [ ] 연말 마감\n  - 마감: 2027-01-02\n- [ ] 진행으로 끝낸 일\n  - 마감: 2026-12-30');
  const done = M.tasks(space.text).find(task => task.title === '진행으로 끝낸 일')!;
  space.text = M.recordProgress(space.text, done.id, '2026-12-30', 100);
  assert(M.validate(space.text));
  assert.deepEqual(programDueSoonTasks(space, '2026-12-30').map(row => [row.task.title, row.deadline.days]), [['연말 마감', 3]]);
  const leap = fixture('- [ ] 윤년\n  - 마감: 2028-03-01');
  assert.equal(programDueSoonTasks(leap.space, '2028-02-27')[0].deadline.days, 3);
});
test('W-TXT-11: archives, trash, retained originals and excluded rows are not resurfaced; a normal update is reflected', () => {
  const { space, id } = fixture('[2026-11-13]\n- [ ] 열려 있는 마감\n  - 마감: 2026-11-13');
  assert.equal(programDueSoonTasks(space, '2026-11-13').length, 1);
  space.archivedDocumentIds.push(id); assert.equal(programDueSoonTasks(space, '2026-11-13').length, 0); space.archivedDocumentIds = [];
  space.documentTrash = { [id]: { trashedAt: '2026-11-13T00:00:00Z', wasArchived: false } };
  assert.equal(programDueSoonTasks(space, '2026-11-13').length, 0); delete space.documentTrash;
  space.retentionDocuments = { 'original-source': id }; assert.equal(programDueSoonTasks(space, '2026-11-13').length, 0); delete space.retentionDocuments;
  const task = M.tasks(space.text)[0]; space.legacyTimelinePolicies[task.id] = 'excluded';
  assert.equal(programDueSoonTasks(space, '2026-11-13').length, 0); delete space.legacyTimelinePolicies[task.id];
  space.text = M.editTextResult(space.text, id, '[2026-11-13]\n- [ ] 수정한 일\n  - 마감: 2026-11-15').state;
  assert.deepEqual(programDueSoonTasks(space, '2026-11-13').map(row => [row.task.title, row.deadline.days]), [['수정한 일', 2]]);
});
