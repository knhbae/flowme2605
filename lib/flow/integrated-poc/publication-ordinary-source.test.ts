import test from 'node:test';
import assert from 'node:assert/strict';
import { programClone, type ProgramPublicationDraft } from './contract';
import { validateProgramData } from './program-data';
import { textWorkspaceModel as M } from './text-workspace';
import { listPersonalWorkspacePocStructureTemplatePreviews } from './creator-workspace-tools';
import { readProgramOrdinaryPublicationSources, inspectProgramPublicationSource, applyProgramPublicationSource, PROGRAM_PUBLICATION_SOURCE_FIELDS } from './publication-ordinary-source';
import { ordinaryPublicationSourceFixture as fixture, ORDINARY_SOURCE_NOW as now } from './publication-ordinary-source.fixture';

function withDraft(kind: 'creator' | 'native') {
  const f = fixture(kind), read = readProgramOrdinaryPublicationSources(f.data.spaces[f.actorId], f.documentId); assert(read.ok);
  const source = read.sources[0];
  const draft: ProgramPublicationDraft = { id: 'publication-draft', documentId: f.documentId, requestId: 'publication-request', flowId: null, expectedVersionId: null,
    sourceDocumentFingerprint: JSON.stringify(M.getDocument(f.data.spaces[f.actorId].text, f.documentId)), title: '공개', summary: '', category: '경험', situationsText: '', sourceKind: 'user-text', sourceLabel: '직접 작성', sourceUrl: '', derivedFrom: null, updatedAt: now,
    rows: [{ itemId: 'publication-row', rowId: source.lineId, origin: 'task', selected: true, title: '공개용 제목', description: '유지할 공개 설명', completionCriteria: '', sourceUrl: '', scheduleKind: 'fixed', scheduleValue: '2027-01-01', subchecks: [{ id: 'public-check', title: '공개 체크' }] }] };
  return { ...f, source, draft };
}
for (const kind of ['creator', 'native'] as const) {
  test(`ordinary publication ${kind}: exact source explanation, resources and safety survive; private text never enters`, () => {
    const f = fixture(kind), space = f.data.spaces[f.actorId], doc = M.getDocument(space.text, f.documentId)!;
    const initial = readProgramOrdinaryPublicationSources(space, f.documentId); assert(initial.ok); assert.equal(initial.sources.length, 2);
    doc.lines.find(line => line.id === initial.sources[0].lineId)!.text = '- [50] PRIVATE-TITLE';
    doc.lines.push({ id: 'private-note', text: 'PRIVATE-NOTE-AND-DATE-2099-12-31' });
    const before = JSON.stringify(f.data), read = readProgramOrdinaryPublicationSources(space, f.documentId); assert(read.ok);
    assert.equal(read.sources[0].values.title, '계약 확인');
    for (const expected of ['통화 조건과 계약서를 함께 본다.', 'https://example.com/reference', 'https://example.com/source', '서명 전에 읽는다', '개인 번호를 공개하지 않는다']) assert(read.sources[0].values.description.includes(expected), expected);
    assert.equal(read.sources[0].values.completionCriteria, '계약서 금액 확인');
    assert.equal(read.sources[0].values.sourceUrl, 'https://example.com/source');
    assert(!JSON.stringify(read).includes('PRIVATE-')); assert(!JSON.stringify(read).includes('completedAt')); assert.equal(JSON.stringify(f.data), before);
    read.sources[0].values.description = 'changed'; assert.equal(JSON.stringify(f.data), before);
  });
  test(`ordinary publication ${kind}: selected fields only; schedules/subchecks/public/private stay exact`, () => {
    const f = withDraft(kind), before = JSON.stringify(f.data), draftBefore = JSON.stringify(f.draft);
    const review = inspectProgramPublicationSource(f.data, f.actorId, f.draft, 'publication-row'); assert(review.ok);
    const result = applyProgramPublicationSource(f.data, f.actorId, f.draft, review.review, ['description', 'sourceUrl'], now); assert(result.ok && result.changed);
    assert.equal(result.draft.rows[0].description, f.source.values.description); assert.equal(result.draft.rows[0].sourceUrl, f.source.values.sourceUrl);
    assert.equal(result.draft.rows[0].title, '공개용 제목'); assert.equal(result.draft.rows[0].completionCriteria, '');
    assert.equal(result.draft.rows[0].scheduleValue, '2027-01-01'); assert.deepEqual(result.draft.rows[0].subchecks, f.draft.rows[0].subchecks);
    assert.equal(JSON.stringify(f.data), before); assert.equal(JSON.stringify(f.draft), draftBefore);
  });
  test(`ordinary publication ${kind}: no selection and repeated same selection produce identical draft`, () => {
    const f = withDraft(kind), read = inspectProgramPublicationSource(f.data, f.actorId, f.draft, 'publication-row'); assert(read.ok);
    const no = applyProgramPublicationSource(f.data, f.actorId, f.draft, read.review, [], now); assert(no.ok && !no.changed); assert.equal(no.draft, f.draft);
    const once = applyProgramPublicationSource(f.data, f.actorId, f.draft, read.review, PROGRAM_PUBLICATION_SOURCE_FIELDS, now); assert(once.ok);
    const again = inspectProgramPublicationSource(f.data, f.actorId, once.draft, 'publication-row'); assert(again.ok);
    const result = applyProgramPublicationSource(f.data, f.actorId, once.draft, again.review, PROGRAM_PUBLICATION_SOURCE_FIELDS, '2026-09-15T00:00:00.000Z'); assert(result.ok && !result.changed); assert.equal(result.draft, once.draft);
  });
  test(`ordinary publication ${kind}: stale input/source, forged field and actor fail closed`, () => {
    const f = withDraft(kind), read = inspectProgramPublicationSource(f.data, f.actorId, f.draft, 'publication-row'); assert(read.ok);
    const changed = programClone(f.draft); changed.rows[0].description = 'new unsaved';
    assert.deepEqual(applyProgramPublicationSource(f.data, f.actorId, changed, read.review, ['description'], now), { ok: false, reason: 'conflict' });
    const forged = programClone(read.review); forged.source.values.description = 'PRIVATE-FORGED';
    assert.deepEqual(applyProgramPublicationSource(f.data, f.actorId, f.draft, forged, ['description'], now), { ok: false, reason: 'conflict' });
    assert(!applyProgramPublicationSource(f.data, 'other', f.draft, read.review, ['description'], now).ok);
    assert(!applyProgramPublicationSource(f.data, f.actorId, f.draft, read.review, ['scheduleValue'] as never, now).ok);
    assert(!applyProgramPublicationSource(f.data, f.actorId, f.draft, read.review, ['description', 'description'], now).ok);
  });
  test(`ordinary publication ${kind}: corrupt and inactive owners do not fall back to personal rows`, () => {
    const f = fixture(kind), space = f.data.spaces[f.actorId];
    space.archivedDocumentIds.push(f.documentId); assert(!readProgramOrdinaryPublicationSources(space, f.documentId).ok); space.archivedDocumentIds.pop();
    space.documentTrash = { [f.documentId]: { trashedAt: now, wasArchived: false } }; assert(!readProgramOrdinaryPublicationSources(space, f.documentId).ok); delete space.documentTrash;
    if (kind === 'native') space.creatorWorkspace!.nativeExecutionSources![f.draftId].revisions[0].rows[0].itemId = 'foreign';
    else (space.creatorWorkspace!.executionSources![f.draftId].revisions[0].flow.items[0] as { title: string }).title = 'tampered-source';
    const before = JSON.stringify(f.data); assert(!readProgramOrdinaryPublicationSources(space, f.documentId).ok); assert.equal(JSON.stringify(f.data), before);
  });
  for (const template of listPersonalWorkspacePocStructureTemplatePreviews()) test(`ordinary publication ${kind}/${template.templateId}: genuine catalog item count and source immutable`, () => {
    const f = fixture(kind, template.expectedRawText), space = f.data.spaces[f.actorId], before = JSON.stringify(f.data);
    assert(validateProgramData(f.data));
    const expected = kind === 'creator' ? space.creatorWorkspace!.executionSources![f.draftId].revisions[0].rows.filter(row => row.kind === 'ordinary').length
      : space.creatorWorkspace!.nativeExecutionSources![f.draftId].revisions[0].rows.filter(row => row.kind === 'ordinary').length;
    const read = readProgramOrdinaryPublicationSources(space, f.documentId); assert(read.ok); assert.equal(read.sources.length, expected); assert.equal(JSON.stringify(f.data), before);
  });
}
test('ordinary publication read has no storage access and does not invent a source for private documents', () => {
  const f = fixture('creator'), space = f.data.spaces[f.actorId]; space.text = M.addDocument(space.text, { title: 'private only' });
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'); let calls = 0;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { calls++; throw new Error('forbidden'); } });
  try { assert.deepEqual(readProgramOrdinaryPublicationSources(space, space.text.documents.at(-1)!.id), { ok: true, sources: [] }); assert(readProgramOrdinaryPublicationSources(space, f.documentId).ok); assert.equal(calls, 0); }
  finally { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else Reflect.deleteProperty(globalThis, 'localStorage'); }
});
