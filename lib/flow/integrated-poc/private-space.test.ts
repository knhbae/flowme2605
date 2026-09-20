import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramPrivateSpace, type ProgramPublicItem, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { textWorkspaceModel as M } from './text-workspace';
import {
  createProgramDocument, renameProgramDocument, archiveProgramDocument,
  createProgramFolder, renameProgramFolder, moveProgramFolder, deleteProgramFolder, setProgramDocumentFolder,
  updateProgramTask, recordProgramTaskProgress, completeProgramTask, addProgramQuickTask, linkProgramTask,
  importProgramPublicVersion, resolveProgramItemDate,
  compareProgramCopyVersion, applyProgramCopyVersion,
  previewProgramCopyAnchor, setProgramCopyAnchor, setProgramCopyInclusion,
} from './private-space';

const actorId = 'local-user';
let request = 0;
const base = (data: ProgramData, id = actorId) => ({ actorId: id, requestId: `private-test-${++request}`, expectedSpace: programClone(data.spaces[id]) });
function accept(transition: ProgramTransition<string>) {
  if (!transition.ok) assert.fail(`Transition failed: ${transition.reason}`);
  assert(validateProgramData(transition.data)); return transition;
}
function fixture() {
  const data = createProgramData();
  const item: ProgramPublicItem = { id: 'pack', title: '짐 정리', description: '책과 옷을 구분한다.\n상자마다 표시한다.', completionCriteria: '빠진 물건을 확인했다.', sourceUrl: 'https://example.org/move', schedule: { kind: 'relative', days: -3 }, subchecks: [{ id: 'books', title: '책 담기' }, { id: 'clothes', title: '옷 담기' }] };
  data.public.flows.push({ id: 'public-moving', ownerId: 'creator-minji', currentVersionId: 'moving-v1', category: '이사', situations: ['짐 정리'], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'moving-v1', flowId: 'public-moving', number: 1, parentVersionId: null, title: '이사 준비', summary: '개인 상황에 맞춰 준비한다.', items: [item,
    { ...programClone(item), id: 'reservation', title: '예약 확인', schedule: { kind: 'fixed', date: '2026-09-22' }, subchecks: [] },
    { ...programClone(item), id: 'memo', title: '확인 메모', schedule: { kind: 'undated' }, subchecks: [] }],
    source: { kind: 'simulated-example', label: '로컬 검증 예시', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: '2026-09-12T00:00:00.000Z' });
  assert(validateProgramData(data)); return data;
}

test('document creation, rename, archive and restore preserve raw, IDs and other actors', () => {
  const initial = createProgramData(), beforeOther = programClone(initial.spaces['creator-minji']);
  const added = accept(createProgramDocument(initial, { ...base(initial), title: '내 메모', raw: '평범한 메모\n- [ ] 예약' }));
  const id = added.result, doc = M.getDocument(added.data.spaces[actorId].text, id)!;
  const renamed = accept(renameProgramDocument(added.data, { ...base(added.data), documentId: id, title: '이사 메모' }));
  const archived = accept(archiveProgramDocument(renamed.data, { ...base(renamed.data), documentId: id }));
  assert(archived.data.spaces[actorId].archivedDocumentIds.includes(id));
  const restored = accept(archiveProgramDocument(archived.data, { ...base(archived.data), documentId: id, archived: false }));
  assert.deepEqual(M.getDocument(restored.data.spaces[actorId].text, id)?.lines, doc.lines);
  assert.deepEqual(restored.data.spaces['creator-minji'], beforeOther);
  assert.deepEqual(initial.spaces[actorId].text.documents, []);
});

test('requests replay once, reject changed payloads, and compare canonical key order', () => {
  const data = createProgramData(), input = { ...base(data), title: '메모' };
  const first = accept(createProgramDocument(data, input));
  const replay = accept(createProgramDocument(first.data, input));
  assert.equal(replay.changed, false); assert.equal(replay.data, first.data);
  const duplicate = createProgramDocument(first.data, { ...input, title: '다른 메모' });
  assert(!duplicate.ok && duplicate.reason === 'duplicate-request');
  const reversed = Object.fromEntries(Object.entries(first.data.spaces[actorId]).reverse()) as ProgramPrivateSpace;
  const renamed = accept(renameProgramDocument(first.data, { ...base(first.data), expectedSpace: reversed, documentId: first.result, title: '이름 변경' }));
  assert(renamed.changed);
});

test('stale same-actor changes conflict while another actor change is preserved', () => {
  const data = createProgramData(), savedBase = base(data);
  const other = accept(createProgramDocument(data, { ...base(data, 'creator-minji'), title: '제작자 메모' }));
  const own = accept(createProgramDocument(other.data, { ...savedBase, title: '내 메모' }));
  assert.equal(own.data.spaces['creator-minji'].text.documents.length, 1);
  const conflict = createProgramDocument(own.data, { ...savedBase, requestId: 'new-stale', title: '새 메모' });
  assert(!conflict.ok && conflict.reason === 'conflict');
});

test('deep folders support real catalog movement but refuse cycles', () => {
  let data = createProgramData(), parentId: string | null = null;
  const ids: string[] = [];
  for (let index = 0; index < 6; index++) {
    const created = accept(createProgramFolder(data, { ...base(data), title: `폴더 ${index}`, parentId }));
    data = created.data; parentId = created.result; ids.push(parentId);
  }
  const cycle = moveProgramFolder(data, { ...base(data), folderId: ids[0], parentId: ids[5] });
  assert(!cycle.ok && cycle.reason === 'invalid');
  const moved = accept(moveProgramFolder(data, { ...base(data), folderId: ids[4], parentId: null }));
  assert.equal(moved.data.spaces[actorId].text.folders.find(folder => folder.id === ids[4])?.parentId, null);
});

test('folder rename and delete preserve content, source IDs, records and child folders', () => {
  let data = createProgramData();
  const created = accept(createProgramFolder(data, { ...base(data), title: '이사' })); data = created.data;
  const child = accept(createProgramFolder(data, { ...base(data), title: '상자', parentId: created.result })); data = child.data;
  const doc = accept(createProgramDocument(data, { ...base(data), title: '체크', folderId: created.result, raw: '- [ ] 준비' })); data = doc.data;
  const taskId = M.tasks(data.spaces[actorId].text)[0].id;
  data = accept(recordProgramTaskProgress(data, { ...base(data), taskId, date: '2026-09-12', percent: 20 })).data;
  data = accept(renameProgramFolder(data, { ...base(data), folderId: created.result, title: '새집 준비' })).data;
  const beforeLines = programClone(M.getDocument(data.spaces[actorId].text, doc.result)!.lines);
  const deleted = accept(deleteProgramFolder(data, { ...base(data), folderId: created.result }));
  assert.deepEqual(M.getDocument(deleted.data.spaces[actorId].text, doc.result)?.lines, beforeLines);
  assert.equal(deleted.data.spaces[actorId].text.itemScopes[taskId], 'folder-unfiled');
  assert.equal(M.latestProgress(deleted.data.spaces[actorId].text, taskId)?.percent, 20);
  assert.equal(deleted.data.spaces[actorId].text.folders.find(folder => folder.id === child.result)?.parentId, null);
});

test('document filing does not silently change creation-time item owners', () => {
  let data = createProgramData();
  const doc = accept(createProgramDocument(data, { ...base(data), title: '메모', raw: '- [ ] 준비' })); data = doc.data;
  const folder = accept(createProgramFolder(data, { ...base(data), title: '보관' })); data = folder.data;
  const owners = programClone(data.spaces[actorId].text.itemScopes);
  data = accept(setProgramDocumentFolder(data, { ...base(data), documentId: doc.result, folderId: folder.result })).data;
  assert.equal(M.getDocument(data.spaces[actorId].text, doc.result)?.folderId, folder.result);
  assert.deepEqual(data.spaces[actorId].text.itemScopes, owners);
});

test('quick tasks, title/date edits and cumulative completion keep one stable item', () => {
  let data = createProgramData();
  const doc = accept(createProgramDocument(data, { ...base(data), title: '오늘' })); data = doc.data;
  const task = accept(addProgramQuickTask(data, { ...base(data), documentId: doc.result, title: '예약', date: '2026-09-12' })); data = task.data;
  data = accept(updateProgramTask(data, { ...base(data), taskId: task.result, patch: { title: '예약 확인', date: '2026-09-13', note: '개인 연락처' } })).data;
  data = accept(recordProgramTaskProgress(data, { ...base(data), taskId: task.result, date: '2026-09-12', percent: 10 })).data;
  data = accept(recordProgramTaskProgress(data, { ...base(data), taskId: task.result, date: '2026-09-13', percent: 20 })).data;
  data = accept(completeProgramTask(data, { ...base(data), taskId: task.result, date: '2026-09-14', done: true })).data;
  const current = M.tasks(data.spaces[actorId].text)[0];
  assert.equal(current.id, task.result); assert.equal(current.title, '예약 확인'); assert.equal(current.note, '개인 연락처');
  assert.equal(current.date, '2026-09-13'); assert.equal(current.done, true);
  assert.deepEqual(M.progressHistory(data.spaces[actorId].text, task.result).map(row => row.percent), [10, 20, 100]);
});

test('public import retains source fields, relative/fixed/undated schedules and original immutable data', () => {
  const initial = fixture(), publicBefore = programClone(initial.public);
  const imported = accept(importProgramPublicVersion(initial, { ...base(initial), versionId: 'moving-v1', itemIds: ['pack', 'reservation', 'memo'], anchor: '2026-09-20' }));
  const space = imported.data.spaces[actorId], copy = space.copies[0], raw = M.raw(M.getDocument(space.text, copy.documentId));
  assert.match(raw, /책과 옷을 구분한다\./); assert.match(raw, /상자마다 표시한다\./); assert.match(raw, /빠진 물건을 확인했다\./); assert.match(raw, /https:\/\/example.org\/move/);
  assert.match(raw, /책 담기/); assert.match(raw, /옷 담기/);
  const tasks = new Map(M.tasks(space.text).map(task => [task.id, task]));
  assert.equal(tasks.get(copy.itemLines.pack)?.date, '2026-09-17');
  assert.equal(tasks.get(copy.itemLines.reservation)?.date, '2026-09-22');
  assert.equal(tasks.get(copy.itemLines.memo)?.date, null);
  assert.deepEqual(imported.data.public, publicBefore); assert.equal(initial.spaces[actorId].copies.length, 0);
});

test('reimport and multiple document links keep one same-actor copy and one canonical item', () => {
  let data = fixture();
  const first = accept(importProgramPublicVersion(data, { ...base(data), versionId: 'moving-v1', itemIds: ['pack'], anchor: null })); data = first.data;
  const lineId = data.spaces[actorId].copies[0].itemLines.pack;
  const repeat = accept(importProgramPublicVersion(data, { ...base(data), versionId: 'moving-v1', itemIds: ['pack'], anchor: null }));
  assert.equal(repeat.changed, false); assert.equal(repeat.result, first.result);
  for (const title of ['첫 메모', '다른 메모']) {
    const doc = accept(createProgramDocument(data, { ...base(data), title })); data = doc.data;
    data = accept(linkProgramTask(data, { ...base(data), documentId: doc.result, taskId: lineId })).data;
  }
  assert.equal(data.spaces[actorId].copies.length, 1);
  assert.equal(M.tasks(data.spaces[actorId].text).filter(task => task.id === lineId).length, 1);
  assert.equal(data.spaces[actorId].text.bindings.filter(binding => binding.kind === 'task').length, 2);
});

test('missing anchors remain explicitly undated and unsupported titles reject atomically', () => {
  const data = fixture(), item = data.public.versions[0].items[0];
  assert.equal(resolveProgramItemDate(item, null), null);
  const initial = programClone(data);
  data.public.versions[0].items[0].title = '여러 줄\n제목';
  const unsupported = importProgramPublicVersion(data, { ...base(data), versionId: 'moving-v1', itemIds: ['pack'], anchor: null });
  assert(!unsupported.ok && unsupported.reason === 'unresolved');
  assert.deepEqual(data.spaces, initial.spaces);
});

function newVersion(data: ProgramData, change: (items: ProgramPublicItem[]) => void) {
  const next = programClone(data), original = next.public.versions.at(-1)!;
  const version = { ...programClone(original), id: `moving-v${original.number + 1}`, number: original.number + 1,
    parentVersionId: original.id, createdAt: '2026-09-13T00:00:00.000Z' };
  change(version.items); next.public.versions.push(version); next.public.flows[0].currentVersionId = version.id;
  assert(validateProgramData(next)); return next;
}

test('partial source updates track each field version and preserve private dates, notes, time and progress', () => {
  let data = fixture();
  const imported = accept(importProgramPublicVersion(data, { ...base(data), versionId: 'moving-v1', itemIds: ['pack', 'reservation'], anchor: '2026-09-20' })); data = imported.data;
  const copy = data.spaces[actorId].copies[0], lineId = copy.itemLines.pack;
  data = accept(updateProgramTask(data, { ...base(data), taskId: lineId, patch: { date: '2026-10-01', note: '개인 연락처와 계획', time: '15:30' } })).data;
  data = accept(recordProgramTaskProgress(data, { ...base(data), taskId: lineId, date: '2026-09-12', percent: 20 })).data;
  const privateBefore = M.tasks(data.spaces[actorId].text).find(task => task.id === lineId)!;
  data = newVersion(data, items => { items[0].title = '짐 정리와 표시'; items[0].description = '새 설명\n새 주의점'; items[0].schedule = { kind: 'relative', days: -7 }; items[1].description = '선택하지 않은 변경'; });
  const publicBefore = programClone(data.public);
  const applied = accept(applyProgramCopyVersion(data, { ...base(data), copyId: copy.id, versionId: 'moving-v2', expectedBaseVersionId: 'moving-v1', itemIds: ['pack'], fields: ['description', 'schedule'] }));
  const space = applied.data.spaces[actorId], updated = space.copies[0];
  assert.equal(updated.baseVersionId, 'moving-v1'); assert.equal(updated.appliedFields.pack.description, 'moving-v2');
  assert.equal(updated.appliedFields.pack.title, undefined); assert.equal(updated.appliedFields.reservation, undefined);
  const current = M.tasks(space.text).find(task => task.id === lineId)!;
  for (const key of ['date', 'note', 'time', 'done', 'title'] as const) assert.equal(current[key], privateBefore[key]);
  assert.deepEqual(space.text.progressRecords, data.spaces[actorId].text.progressRecords);
  assert.deepEqual(applied.data.public, publicBefore);
  assert.match(M.raw(M.getDocument(space.text, copy.documentId)), /새 설명\n  설명: 새 주의점/);
  const compared = compareProgramCopyVersion(applied.data, { actorId, copyId: copy.id, versionId: 'moving-v2' });
  assert(compared.ok);
  const row = compared.result.items.find(item => item.itemId === 'pack')!;
  assert.equal(row.fields.find(field => field.field === 'description')?.baseVersionId, 'moving-v2');
  assert.equal(row.fields.find(field => field.field === 'title')?.sourceChanged, true);
});

test('a private title conflict rejects the selected update atomically while other fields remain applicable', () => {
  let data = fixture();
  data = accept(importProgramPublicVersion(data, { ...base(data), versionId: 'moving-v1', itemIds: ['pack'], anchor: null })).data;
  const copy = data.spaces[actorId].copies[0];
  data = accept(updateProgramTask(data, { ...base(data), taskId: copy.itemLines.pack, patch: { title: '내 상황의 제목' } })).data;
  data = newVersion(data, items => { items[0].title = '새 원문 제목'; items[0].description = '보완 설명'; });
  const before = programClone(data);
  const conflict = applyProgramCopyVersion(data, { ...base(data), copyId: copy.id, versionId: 'moving-v2', expectedBaseVersionId: 'moving-v1', itemIds: ['pack'], fields: ['title', 'description'] });
  assert(!conflict.ok && conflict.reason === 'conflict'); assert.deepEqual(data, before);
  const kept = accept(applyProgramCopyVersion(data, { ...base(data), copyId: copy.id, versionId: 'moving-v2', expectedBaseVersionId: 'moving-v1', itemIds: ['pack'], fields: ['description'] }));
  assert.equal(M.tasks(kept.data.spaces[actorId].text)[0].title, '내 상황의 제목');
});

test('subcheck updates retain stable IDs, removed checks, private child progress and user-added children', () => {
  let data = fixture();
  data = accept(importProgramPublicVersion(data, { ...base(data), versionId: 'moving-v1', itemIds: ['pack'], anchor: '2026-09-20' })).data;
  const copy = data.spaces[actorId].copies[0], oldChildren = programClone(copy.subcheckLines.pack);
  data = accept(recordProgramTaskProgress(data, { ...base(data), taskId: oldChildren.clothes, date: '2026-09-12', percent: 50 })).data;
  const text = data.spaces[actorId].text, doc = M.getDocument(text, copy.documentId)!;
  data.spaces[actorId].text = M.editText(text, doc.id, `${M.raw(doc)}\n  - [ ] 개인 하위 체크`);
  assert(validateProgramData(data));
  data = newVersion(data, items => { items[0].subchecks = [{ id: 'books', title: '책을 종류별로 담기' }, { id: 'labels', title: '상자 표시' }]; });
  const updated = accept(applyProgramCopyVersion(data, { ...base(data), copyId: copy.id, versionId: 'moving-v2', expectedBaseVersionId: 'moving-v1', itemIds: ['pack'], fields: ['subchecks'] }));
  const space = updated.data.spaces[actorId], mapped = space.copies[0].subcheckLines.pack;
  assert.equal(mapped.books, oldChildren.books); assert.equal(mapped.clothes, oldChildren.clothes); assert(mapped.labels);
  assert.equal(M.latestProgress(space.text, oldChildren.clothes)?.percent, 50);
  const raw = M.raw(M.getDocument(space.text, copy.documentId));
  assert.match(raw, /개인 하위 체크/); assert.match(raw, /옷 담기/); assert.match(raw, /원문에서 제외된 체크/);
  assert.doesNotMatch(raw, /원문 체크 ID/);
  const compared = compareProgramCopyVersion(updated.data, { actorId, copyId: copy.id, versionId: 'moving-v2' });
  assert(compared.ok); assert.equal(compared.result.items.find(item => item.itemId === 'pack')?.fields.find(field => field.field === 'subchecks')?.alreadyApplied, true);
});

test('removed historical items stay unchanged and new source items get stable sidecars', () => {
  let data = fixture();
  data = accept(importProgramPublicVersion(data, { ...base(data), versionId: 'moving-v1', itemIds: ['pack', 'reservation'], anchor: null })).data;
  const copy = data.spaces[actorId].copies[0], oldLine = copy.itemLines.reservation;
  data = accept(completeProgramTask(data, { ...base(data), taskId: oldLine, date: '2026-09-12', done: true })).data;
  data = newVersion(data, items => { items.splice(1, 1); items.push({ ...programClone(items[0]), id: 'new-step', title: '새 준비' }); });
  const compared = compareProgramCopyVersion(data, { actorId, copyId: copy.id, versionId: 'moving-v2' });
  assert(compared.ok); assert.equal(compared.result.items.find(item => item.itemId === 'reservation')?.state, 'removed');
  const updated = accept(applyProgramCopyVersion(data, { ...base(data), copyId: copy.id, versionId: 'moving-v2', expectedBaseVersionId: 'moving-v1', itemIds: ['new-step'], fields: ['title'] }));
  const space = updated.data.spaces[actorId];
  assert.equal(space.copies[0].itemLines.reservation, oldLine); assert.equal(M.latestProgress(space.text, oldLine)?.percent, 100);
  assert(space.copies[0].itemLines['new-step']); assert.equal(space.copies[0].appliedFields['new-step'].subchecks, 'moving-v2');
  const undo = programClone(updated.data); undo.spaces[actorId] = programClone(data.spaces[actorId]);
  assert(validateProgramData(undo)); assert.deepEqual(undo.spaces[actorId], data.spaces[actorId]);
});

test('same-source application and same-value task updates make no mutation', () => {
  let data = fixture();
  data = accept(importProgramPublicVersion(data, { ...base(data), versionId: 'moving-v1', itemIds: ['pack'], anchor: null })).data;
  const copy = data.spaces[actorId].copies[0];
  const sameVersion = accept(applyProgramCopyVersion(data, { ...base(data), copyId: copy.id, versionId: 'moving-v1', expectedBaseVersionId: 'moving-v1', itemIds: ['pack'], fields: ['title', 'description'] }));
  assert.equal(sameVersion.changed, false); assert.equal(sameVersion.data, data);
  const sameTitle = accept(updateProgramTask(data, { ...base(data), taskId: copy.itemLines.pack, patch: { title: '짐 정리' } }));
  assert.equal(sameTitle.changed, false); assert.equal(sameTitle.data, data);
});

test('anchor preview separates fixed source dates and relative execution dates without today fallback', () => {
  let data = fixture();
  data = accept(importProgramPublicVersion(data, { ...base(data), versionId: 'moving-v1', itemIds: ['pack', 'reservation', 'memo'], anchor: null })).data;
  const copy = data.spaces[actorId].copies[0], publicBefore = programClone(data.public);
  const preview = previewProgramCopyAnchor(data, { actorId, copyId: copy.id, anchor: '2026-10-01' });
  assert(preview.ok);
  assert.equal(preview.result.items[0].beforeDate, null); assert.equal(preview.result.items[0].afterDate, '2026-09-28');
  assert.equal(preview.result.items[1].afterDate, '2026-09-22'); assert.equal(preview.result.items[2].afterDate, null);
  data = accept(setProgramCopyAnchor(data, { ...base(data), copyId: copy.id, anchor: '2026-10-01' })).data;
  assert.equal(M.tasks(data.spaces[actorId].text).find(row => row.id === copy.itemLines.pack)?.date, '2026-09-28');
  data = accept(setProgramCopyAnchor(data, { ...base(data), copyId: copy.id, anchor: null })).data;
  assert.equal(M.tasks(data.spaces[actorId].text).find(row => row.id === copy.itemLines.pack)?.date, null);
  assert.deepEqual(data.public, publicBefore);
});

test('anchor changes preserve raw-edited private dates and cumulative records even after source schedule updates', () => {
  let data = fixture();
  data = accept(importProgramPublicVersion(data, { ...base(data), versionId: 'moving-v1', itemIds: ['pack'], anchor: '2026-09-20' })).data;
  const copy = data.spaces[actorId].copies[0];
  const doc = M.getDocument(data.spaces[actorId].text, copy.documentId)!;
  data.spaces[actorId].text = M.editText(data.spaces[actorId].text, doc.id, M.raw(doc).replace('날짜: 2026-09-17', '날짜: 2026-10-10'));
  assert.equal(data.spaces[actorId].copies[0].itemOverrides.pack, undefined);
  data = accept(recordProgramTaskProgress(data, { ...base(data), taskId: copy.itemLines.pack, date: '2026-09-12', percent: 20 })).data;
  data = newVersion(data, items => { items[0].schedule = { kind: 'relative', days: -7 }; });
  data = accept(applyProgramCopyVersion(data, { ...base(data), copyId: copy.id, versionId: 'moving-v2', expectedBaseVersionId: 'moving-v1', itemIds: ['pack'], fields: ['schedule'] })).data;
  const before = programClone(data.spaces[actorId].text.progressRecords);
  const preview = previewProgramCopyAnchor(data, { actorId, copyId: copy.id, anchor: '2026-11-01' });
  assert(preview.ok && preview.result.items[0].inferredOverride);
  data = accept(setProgramCopyAnchor(data, { ...base(data), copyId: copy.id, anchor: '2026-11-01' })).data;
  assert.equal(data.spaces[actorId].copies[0].itemOverrides.pack.date, '2026-10-10');
  assert.equal(M.tasks(data.spaces[actorId].text).find(row => row.id === copy.itemLines.pack)?.date, '2026-10-10');
  assert.deepEqual(data.spaces[actorId].text.progressRecords, before);
  assert.match(M.raw(M.getDocument(data.spaces[actorId].text, copy.documentId)), /원문 일정: 기준일 -7일/);
});

test('source schedule metadata update does not falsely mark an untouched execution date as a private edit', () => {
  let data = fixture();
  data = accept(importProgramPublicVersion(data, { ...base(data), versionId: 'moving-v1', itemIds: ['pack'], anchor: '2026-09-20' })).data;
  const copy = data.spaces[actorId].copies[0];
  data = newVersion(data, items => { items[0].schedule = { kind: 'relative', days: -7 }; });
  data = accept(applyProgramCopyVersion(data, { ...base(data), copyId: copy.id, versionId: 'moving-v2', expectedBaseVersionId: 'moving-v1', itemIds: ['pack'], fields: ['schedule'] })).data;
  const preview = previewProgramCopyAnchor(data, { actorId, copyId: copy.id, anchor: '2026-10-01' });
  assert(preview.ok); assert.equal(preview.result.items[0].privateOverride, false);
  assert.equal(preview.result.items[0].afterDate, '2026-09-24');
});

test('inclusion restores full original catalog and preserves canonical IDs, references, raw and progress', () => {
  let data = fixture();
  data = accept(importProgramPublicVersion(data, { ...base(data), versionId: 'moving-v1', itemIds: ['pack'], anchor: null })).data;
  const copy = data.spaces[actorId].copies[0];
  data = accept(recordProgramTaskProgress(data, { ...base(data), taskId: copy.itemLines.pack, date: '2026-09-12', percent: 60 })).data;
  const raw = M.raw(M.getDocument(data.spaces[actorId].text, copy.documentId));
  data = accept(setProgramCopyInclusion(data, { ...base(data), copyId: copy.id, itemId: 'pack', included: false })).data;
  assert.equal(data.spaces[actorId].copies[0].includedItemIds.length, 0);
  assert.equal(M.raw(M.getDocument(data.spaces[actorId].text, copy.documentId)), raw);
  data = accept(setProgramCopyInclusion(data, { ...base(data), copyId: copy.id, itemId: 'pack', included: true })).data;
  assert.equal(data.spaces[actorId].copies[0].itemLines.pack, copy.itemLines.pack);
  assert.equal(M.latestProgress(data.spaces[actorId].text, copy.itemLines.pack)?.percent, 60);
  data = accept(setProgramCopyInclusion(data, { ...base(data), copyId: copy.id, itemId: 'reservation', included: true })).data;
  const newId = data.spaces[actorId].copies[0].itemLines.reservation;
  assert(newId); assert.equal(M.tasks(data.spaces[actorId].text).find(row => row.id === newId)?.date, '2026-09-22');
  data = accept(setProgramCopyInclusion(data, { ...base(data), copyId: copy.id, itemId: 'reservation', included: false })).data;
  data = accept(setProgramCopyInclusion(data, { ...base(data), copyId: copy.id, itemId: 'reservation', included: true })).data;
  assert.equal(data.spaces[actorId].copies[0].itemLines.reservation, newId);
});
