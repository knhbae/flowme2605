import test from 'node:test';
import assert from 'node:assert/strict';
import { programClone } from './contract';
import { createProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { createProgramWritingEntry, programNewWritingRaw } from './writing-entry';
import { textWorkspaceModel as M } from './text-workspace';

test('W-TXT-10: a new writing starts at today; its first task appears on today with no raw rewrite', () => {
  const data = createProgramData(), actorId = data.activeActorId, today = '2026-11-13';
  const made = createProgramWritingEntry(data, { actorId, requestId: 'new-date', expectedSpace: data.spaces[actorId], today });
  assert(made.ok);
  const text = made.data.spaces[actorId].text;
  assert.equal(M.raw(M.getDocument(text, made.result)), `[${today}]\n`);
  assert.equal(made.data.spaces[actorId].position.start, 13);
  const edited = M.editTextResult(text, made.result, `[${today}]\n- [ ] 첫 할 일`).state;
  assert.equal(M.tasks(edited).find(row => row.title === '첫 할 일')?.date, today);
  const again = createProgramWritingEntry(made.data, { actorId, requestId: 'new-date', expectedSpace: data.spaces[actorId], today });
  assert(again.ok); assert.equal(again.result, made.result); assert.equal(again.changed, false);
});

test('W-TXT-10: deleting the heading, reopening or reusing an empty document never inserts it again', () => {
  const data = createProgramData(), actorId = data.activeActorId;
  const made = createProgramWritingEntry(data, { actorId, requestId: 'new-delete', expectedSpace: data.spaces[actorId], today: '2026-11-13' });
  assert(made.ok); const next = programClone(made.data);
  next.spaces[actorId].text = M.editTextResult(next.spaces[actorId].text, made.result, '').state;
  const reopened = createProgramWritingEntry(next, { actorId, requestId: 'reuse-delete', expectedSpace: next.spaces[actorId], reuseDocumentId: made.result, today: '2026-11-14' });
  assert(reopened.ok); assert.equal(reopened.result, made.result);
  assert.equal(M.raw(M.getDocument(reopened.data.spaces[actorId].text, made.result)), '');
  assert.equal(reopened.data.spaces[actorId].text.documents.length, next.spaces[actorId].text.documents.length);
});

test('W-TXT-10: existing nonempty raw is preserved, invalid day/CAS rejected, explicit raw imports remain unchanged', () => {
  const data = createProgramData(), actorId = data.activeActorId;
  const imported = createProgramDocument(data, { actorId, requestId: 'raw-create', expectedSpace: data.spaces[actorId], title: '목록', raw: '- [ ] 날짜 없는 일' });
  assert(imported.ok);
  const made = createProgramWritingEntry(imported.data, { actorId, requestId: 'new-after-list', expectedSpace: imported.data.spaces[actorId], reuseDocumentId: imported.result, today: '2026-11-13' });
  assert(made.ok); assert.notEqual(made.result, imported.result);
  assert.equal(M.raw(M.getDocument(made.data.spaces[actorId].text, imported.result)), '- [ ] 날짜 없는 일');
  const stale = createProgramWritingEntry(made.data, { actorId, requestId: 'stale-create', expectedSpace: imported.data.spaces[actorId], today: '2026-11-13' });
  assert(!stale.ok); assert.equal(stale.reason, 'conflict');
  assert.equal(programNewWritingRaw('2026-02-30'), '');
});
