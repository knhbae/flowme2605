import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramController } from './controller';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramDocument, createProgramFolder, recordProgramTaskProgress } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { createProgramWritingEntry, PROGRAM_WRITING_ENTRY_TITLE } from './writing-entry';

const actorId = 'local-user';
const base = (data: ProgramData, requestId: string) => ({ actorId, requestId, expectedSpace: programClone(data.spaces[actorId]) });
function accept(result: ProgramTransition<string>) {
  assert(result.ok, result.ok ? '' : result.reason);
  assert(validateProgramData(result.data));
  return result;
}
function blank(title = '기존 빈 글') {
  const data = createProgramData();
  return accept(createProgramDocument(data, { ...base(data, 'existing-blank'), title }));
}

test('explicit entry creates one visible ordinary unfiled document without changing existing records', () => {
  const initial = createProgramData(), before = programClone(initial);
  const result = accept(createProgramWritingEntry(initial, base(initial, 'write-first')));
  const space = result.data.spaces[actorId], doc = M.getDocument(space.text, result.result)!;
  assert(result.changed); assert.equal(space.text.documents.length, 1);
  assert.equal(doc.title, PROGRAM_WRITING_ENTRY_TITLE); assert.equal(doc.folderId, 'folder-unfiled');
  assert.equal(M.raw(doc), ''); assert.deepEqual(space.position, { documentId: doc.id, lineId: null, start: 0, end: 0, scrollTop: 0 });
  const comparable = programClone(result.data); comparable.spaces[actorId].text.documents = []; comparable.receipts = [];
  comparable.spaces[actorId].position = before.spaces[actorId].position;
  assert.deepEqual(comparable, before); assert.deepEqual(initial, before);
});

test('same creation request replays its exact ID after typing and never creates another document', () => {
  const initial = createProgramData(), input = base(initial, 'write-replay');
  const first = accept(createProgramWritingEntry(initial, input));
  const data = programClone(first.data);
  data.spaces[actorId].text = M.editText(data.spaces[actorId].text, first.result, '추가로 쓴 내용');
  const replay = accept(createProgramWritingEntry(data, { ...input, reuseDocumentId: first.result }));
  assert.equal(replay.result, first.result); assert.equal(replay.changed, false); assert.equal(replay.data, data);
  assert.equal(data.spaces[actorId].text.documents.length, 1); assert.equal(data.receipts.length, 1);
});

test('a request already used for different document metadata or another mutation cannot create a writing entry', () => {
  for (const kind of ['other-document', 'folder'] as const) {
    const initial = createProgramData(), input = base(initial, 'used-request');
    const prior = accept(kind === 'other-document'
      ? createProgramDocument(initial, { ...input, title: '다른 이름' })
      : createProgramFolder(initial, { ...input, title: '업무' }));
    const before = programClone(prior.data), result = createProgramWritingEntry(prior.data, input);
    assert(!result.ok && result.reason === 'duplicate-request'); assert.equal(result.data, prior.data); assert.deepEqual(prior.data, before);
  }
});

test('two concurrent captured baselines allow one creation and reject the other through existing CAS', () => {
  const initial = createProgramData(), expected = base(initial, 'first-click');
  const first = accept(createProgramWritingEntry(initial, expected));
  const before = programClone(first.data);
  const second = createProgramWritingEntry(first.data, { ...expected, requestId: 'second-click' });
  assert(!second.ok && second.reason === 'conflict'); assert.equal(second.data, first.data);
  assert.deepEqual(first.data, before); assert.equal(first.data.spaces[actorId].text.documents.length, 1);
  const replay = accept(createProgramWritingEntry(first.data, expected)); assert.equal(replay.result, first.result); assert(!replay.changed);
});

test('only the exact displayed empty private document is reused with every byte and metadata preserved', () => {
  const first = blank('이름은 재사용 조건이 아님'), data = programClone(first.data), space = data.spaces[actorId];
  space.text = M.editText(space.text, first.result, ' \n');
  const folder = accept(createProgramFolder(data, { ...base(data, 'filing'), title: '업무' }));
  const filed = programClone(folder.data), doc = M.getDocument(filed.spaces[actorId].text, first.result)!;
  doc.folderId = folder.result; doc.folder = '업무';
  filed.spaces[actorId].position = { documentId: first.result, lineId: doc.lines[0].id, start: 1, end: 1, scrollTop: 23 };
  const before = programClone(filed), result = accept(createProgramWritingEntry(filed, { ...base(filed, 'reuse-empty'), reuseDocumentId: first.result }));
  assert.equal(result.result, first.result); assert.equal(result.changed, false); assert.equal(result.data, filed);
  assert.deepEqual(filed, before); assert.equal(result.data.receipts.length, before.receipts.length);
});

test('explicit reuse remembers only that document while a later replay never resets a newer position', () => {
  const first = blank(), before = programClone(first.data);
  const reused = accept(createProgramWritingEntry(first.data, { ...base(first.data, 'remember-empty'), reuseDocumentId: first.result }));
  assert(reused.changed); assert.equal(reused.data.spaces[actorId].position.documentId, first.result);
  const comparable = programClone(reused.data); comparable.spaces[actorId].position = before.spaces[actorId].position;
  assert.deepEqual(comparable, before);

  const initial = createProgramData(), input = base(initial, 'fresh-position-replay');
  const created = accept(createProgramWritingEntry(initial, input)), typed = programClone(created.data);
  typed.spaces[actorId].text = M.editText(typed.spaces[actorId].text, created.result, '계속 쓰기');
  typed.spaces[actorId].position = { documentId: created.result, lineId: M.getDocument(typed.spaces[actorId].text, created.result)!.lines[0].id,
    start: 3, end: 4, scrollTop: 37 };
  const replay = accept(createProgramWritingEntry(typed, input)); assert(!replay.changed); assert.equal(replay.data, typed);
});

test('other empty documents and identical titles are never selected by a writing entry', () => {
  const first = blank(PROGRAM_WRITING_ENTRY_TITLE);
  for (const reuseDocumentId of [undefined, 'missing-current-document']) {
    const before = programClone(first.data);
    const result = accept(createProgramWritingEntry(first.data, { ...base(first.data, `explicit-${reuseDocumentId ?? 'none'}`), reuseDocumentId }));
    assert.notEqual(result.result, first.result); assert.equal(result.data.spaces[actorId].text.documents.length, 2);
    assert.deepEqual(result.data.spaces[actorId].text.documents[0], before.spaces[actorId].text.documents[0]);
    assert.deepEqual(first.data, before);
  }
});

test('a new explicit entry after mixed text preserves existing Item identities, dates, scope and progress', () => {
  const first = blank(PROGRAM_WRITING_ENTRY_TITLE), data = programClone(first.data);
  data.spaces[actorId].text = M.editText(data.spaces[actorId].text, first.result,
    '[2026-10-07]\n- [ ] 견적 보내기\n  - 메모: 기존 문맥\n자유 메모\n[2026-10-08]\n- [ ] 세탁물 정리');
  const task = M.tasks(data.spaces[actorId].text)[0];
  const progress = accept(recordProgramTaskProgress(data, { ...base(data, 'existing-progress'), taskId: task.id, date: '2026-10-07', percent: 40 }));
  const before = programClone(progress.data), result = accept(createProgramWritingEntry(progress.data,
    { ...base(progress.data, 'new-after-text'), reuseDocumentId: first.result }));
  assert.notEqual(result.result, first.result); assert.equal(result.data.spaces[actorId].text.documents.length, 2);
  const comparable = programClone(result.data); comparable.spaces[actorId].text.documents.pop(); comparable.receipts.pop();
  comparable.spaces[actorId].position = before.spaces[actorId].position;
  assert.deepEqual(comparable, before); assert.deepEqual(progress.data, before);
});

test('archive, trash, retained source, retained value, saved binding and private Flow are never reused as blank personal writing', () => {
  for (const protection of ['archive', 'trash', 'retained-source', 'retained-value', 'saved-binding', 'flow'] as const) {
    const first = blank(), other = accept(createProgramDocument(first.data, { ...base(first.data, 'second-existing'), title: '복구 글' }));
    const data = programClone(other.data), space = data.spaces[actorId];
    if (protection === 'archive' || protection === 'trash') space.archivedDocumentIds.push(first.result);
    if (protection === 'trash') space.documentTrash = { [first.result]: { trashedAt: '2026-10-07T00:00:00Z', wasArchived: false } };
    if (protection === 'retained-source') { space.retentionDocuments = { [first.result]: other.result }; space.archivedDocumentIds.push(other.result); }
    if (protection === 'retained-value') { space.retentionDocuments = { [other.result]: first.result }; space.archivedDocumentIds.push(first.result); }
    if (protection === 'saved-binding') space.savedBindings.push({ savedCopyId: 'saved-empty', flowId: 'original-empty', flowRef: 'flow-empty',
      documentId: first.result, itemLines: {}, sourceRevision: 'original-version' });
    if (protection === 'flow') {
      const doc = space.text.documents.shift()!;
      space.text.flows.push({ ...doc, private: true, sourceVersion: 'private-flow-version' });
    }
    assert(validateProgramData(data), protection);
    const before = programClone(data), result = accept(createProgramWritingEntry(data,
      { ...base(data, `protected-${protection}`), reuseDocumentId: first.result }));
    assert.notEqual(result.result, first.result, protection);
    const comparable = programClone(result.data); comparable.spaces[actorId].text.documents.pop(); comparable.receipts.pop();
    comparable.spaces[actorId].position = before.spaces[actorId].position;
    assert.deepEqual(comparable, before, protection); assert.deepEqual(data, before, protection);
  }
});

test('actor changes and stale empty-document intent cannot reuse or create another actor document', () => {
  const first = blank(), captured = { ...base(first.data, 'actor-intent'), reuseDocumentId: first.result };
  const data = programClone(first.data); data.activeActorId = 'creator-minji';
  const before = programClone(data), switched = createProgramWritingEntry(data, captured);
  assert(!switched.ok && switched.reason === 'conflict'); assert.deepEqual(data, before);
  const changed = programClone(first.data); changed.spaces[actorId].position.scrollTop++;
  const stale = createProgramWritingEntry(changed, captured);
  assert(!stale.ok && stale.reason === 'conflict'); assert.equal(stale.data, changed);
});

test('document limit failure preserves the exact state while the displayed blank document can still be reused', () => {
  const first = blank(), data = programClone(first.data), template = data.spaces[actorId].text.documents[0];
  for (let index = 1; index < 100; index++) data.spaces[actorId].text.documents.push({ ...programClone(template), id: `existing-${index}` });
  data.spaces[actorId].position.documentId = first.result;
  assert(validateProgramData(data)); const before = programClone(data);
  const failed = createProgramWritingEntry(data, base(data, 'first-limit-failure'));
  assert(!failed.ok && failed.reason === 'limit'); assert.equal(failed.data, data); assert.deepEqual(data, before);
  const reuse = accept(createProgramWritingEntry(data, { ...base(data, 'reuse-at-limit'), reuseDocumentId: first.result }));
  assert.equal(reuse.result, first.result); assert.equal(reuse.changed, false); assert.deepEqual(data, before);
});

test('first storage failure leaves no document or Undo entry and explicit retry saves once through the existing controller', async () => {
  const initial = createProgramData(), values = new Map<string, string>(); let reject = true;
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { if (reject) throw Error('synthetic-write-failure'); values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
  const controller = createProgramController({ initialData: initial, storage, exclusive: async work => work() }); assert(controller.ok);
  const before = controller.snapshot(), input = base(before.envelope.data, 'storage-retry');
  const failed = await controller.mutate('바로 쓰기', current => createProgramWritingEntry(current, input), { actorId });
  assert(!failed.ok); assert.deepEqual(controller.snapshot(), before); assert.equal(values.size, 0);
  reject = false;
  const saved = await controller.mutate('바로 쓰기', current => createProgramWritingEntry(current, input), { actorId }); assert(saved.ok);
  const snapshot = controller.snapshot(); assert.equal(snapshot.envelope.data.spaces[actorId].text.documents.length, 1);
  assert.equal(snapshot.envelope.data.spaces[actorId].position.documentId, saved.result);
  const reloaded = createProgramController({ initialData: initial, storage, exclusive: async work => work() }); assert(reloaded.ok);
  assert.deepEqual(reloaded.snapshot(), snapshot);
  const replay = await controller.mutate('바로 쓰기', current => createProgramWritingEntry(current, input), { actorId }); assert(replay.ok);
  assert.equal(replay.result, saved.result); assert.equal(replay.changed, false); assert.deepEqual(controller.snapshot(), snapshot);
  const undone = await controller.undo(actorId); assert(undone.ok);
  assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId], initial.spaces[actorId]);
});
