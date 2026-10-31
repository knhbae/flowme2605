import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, programId, type ProgramData, type ProgramPublicationDraft } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { textWorkspaceModel as M } from './text-workspace';
import { archiveProgramPublication, canRepublishProgramDocument, createProgramPublicationDraft, createProgramRepublishDraft, publicationDraftAt, programPublicationInput, publishProgramDocument, resolveProgramPrivatePublicationDraft, saveProgramPublicationDraft } from './publication-editor';
import { createProgramProposal, publishProgramFlow } from './publication';
import { importProgramPublicVersion } from './private-space';
import { readProgramPublishingActivity } from './publishing-activity';
import { isAlphaSocialIntent } from './alpha-social/contract';

const NOW = '2026-10-31T00:00:00.000Z';
function accept<T extends { ok: boolean; data: ProgramData }>(value: T): ProgramData {
  assert(value.ok, JSON.stringify(value.ok ? null : (value as { reason?: string }).reason)); return value.data;
}
function storeAndPublish(data: ProgramData, draft: ProgramPublicationDraft) {
  const actor = data.activeActorId;
  const stored = accept(saveProgramPublicationDraft(data, actor, draft, publicationDraftAt(data, actor, draft.documentId)));
  const result = publishProgramDocument(stored, actor, draft, NOW); assert(result.ok, result.ok ? '' : result.reason);
  const version = result.data.public.versions.find(row => row.id === result.result)!;
  return { data: result.data, draft, flowId: version.flowId, version };
}
function fixture(options: { derived?: boolean; simulated?: boolean } = {}) {
  let data = createProgramData(); const actor = data.activeActorId;
  let text = M.addDocument(data.spaces[actor].text, { title: 'C9 합성 개인 원문' });
  const documentId = text.documents.at(-1)!.id;
  const edited = M.editTextResult(text, documentId, '- [ ] 개인 A\n- [ ] 개인 B\n공개하지 않은 개인 메모', { folderText: true });
  assert.equal(edited.reason, null); text = edited.state; data.spaces[actor].text = text;
  let parent: { flowId: string; versionId: string } | null = null;
  if (options.derived) {
    const p = publishProgramFlow(data, { actorId: actor, requestId: programId('parent-request'), title: '파생 원본', summary: '', category: '합성', situations: [],
      source: { kind: 'user-text', label: '합성 원본', url: null, checkedAt: null }, items: [{ id: 'parent-item', title: '원본 항목', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] }] }, NOW);
    data = accept(p); assert(p.ok); const version = data.public.versions.find(row => row.id === p.result)!; parent = { flowId: version.flowId, versionId: version.id };
  }
  let last: ReturnType<typeof storeAndPublish> | undefined;
  for (let number = 1; number <= 3; number++) {
    const draft = createProgramPublicationDraft(data, documentId, NOW)!;
    draft.title = `C9 공개 ${number}판`; draft.summary = `보관할 공개 본문 ${number}`;
    draft.sourceKind = options.simulated ? 'simulated-example' : 'user-text'; draft.derivedFrom = parent;
    // Deliberately differs from the live private row order and excludes its memo.
    draft.rows = draft.rows.filter(row => row.origin === 'task').reverse().map(row => ({ ...row, selected: true }));
    last = storeAndPublish(data, draft); data = last.data;
  }
  const flowId = last!.flowId, version = last!.version, other = 'participant-jihun';
  data.activeActorId = other;
  data = accept(importProgramPublicVersion(data, { actorId: other, requestId: 'c9-copy-before-withdrawal', expectedSpace: data.spaces[other], versionId: version.id, itemIds: version.items.map(row => row.id), anchor: null }));
  data = accept(createProgramProposal(data, { actorId: other, requestId: 'c9-proposal-before-withdrawal', flowId, baseVersionId: version.id, itemId: version.items[0].id, reason: '합성 검토', patch: { description: '남겨 둘 제안' } }, NOW));
  data.activeActorId = actor;
  data = accept(archiveProgramPublication(data, actor, documentId, flowId, version.id));
  assert(validateProgramData(data));
  return { data, actor, other, documentId, flowId, version };
}

test('C9 seeds the selected last public version in public order, without live private additions', () => {
  const f = fixture(), before = programClone(f.data), draft = createProgramRepublishDraft(f.data, f.documentId, f.flowId, NOW)!;
  assert(draft); assert.equal(draft.flowId, f.flowId); assert.equal(draft.expectedVersionId, f.version.id);
  assert.equal(draft.title, f.version.title); assert.equal(draft.summary, f.version.summary);
  assert.deepEqual(draft.rows.map(row => row.itemId), f.version.items.map(row => row.id));
  assert.deepEqual(draft.rows.map(row => row.title), f.version.items.map(row => row.title));
  assert(!JSON.stringify(draft.rows).includes('공개하지 않은 개인 메모'));
  assert.deepEqual(f.data, before);
  const input = programPublicationInput(draft, f.actor, { newFlow: true })!;
  assert(!Object.hasOwn(input, 'flowId')); assert(!Object.hasOwn(input, 'expectedVersionId'));
});

test('C9 creates a new Flow v1 and leaves old versions, copies, proposals and native history intact', () => {
  const f = fixture(), before = programClone(f.data), republish = createProgramRepublishDraft(f.data, f.documentId, f.flowId, NOW)!;
  const next = storeAndPublish(f.data, republish);
  assert.notEqual(next.flowId, f.flowId); assert.equal(next.version.number, 1); assert.equal(next.version.parentVersionId, null);
  assert.deepEqual(next.data.public.flows.find(row => row.id === f.flowId), before.public.flows.find(row => row.id === f.flowId));
  assert.deepEqual(next.data.public.versions.filter(row => row.flowId === f.flowId), before.public.versions.filter(row => row.flowId === f.flowId));
  assert.deepEqual(next.data.public.proposals, before.public.proposals);
  assert.deepEqual(next.data.spaces[f.other], before.spaces[f.other]);
  assert.deepEqual(next.data.spaces[f.actor].text, before.spaces[f.actor].text);
  assert.equal(next.data.spaces[f.actor].publicationDrafts.length, 0);
  assert(next.data.spaces[f.actor].publications.some(link => link.flowId === f.flowId));
  assert(validateProgramData(next.data));
});

test('C9 old version import remains blocked after the new link is published', () => {
  const f = fixture(), next = storeAndPublish(f.data, createProgramRepublishDraft(f.data, f.documentId, f.flowId, NOW)!).data;
  next.activeActorId = f.other;
  const result = importProgramPublicVersion(next, { actorId: f.other, requestId: 'c9-old-link-again', expectedSpace: next.spaces[f.other], versionId: f.version.id, itemIds: [f.version.items[0].id], anchor: null });
  assert(!result.ok); assert.equal(result.reason, 'missing'); assert.deepEqual(result.data, next);
});

test('C9 retains draft text, selection and item order and keeps the exact baseline wire shape', () => {
  const f = fixture(), retained = createProgramRepublishDraft(f.data, f.documentId, f.flowId, NOW)!;
  retained.title = '저장해 둔 초안'; retained.summary = '아직 공개하지 않은 입력'; retained.rows.reverse(); retained.rows[0].selected = false;
  retained.rows[0].description = '미완성 본문';
  const stored = accept(saveProgramPublicationDraft(f.data, f.actor, retained, null));
  const next = createProgramRepublishDraft(stored, f.documentId, f.flowId, NOW)!;
  assert.deepEqual(next, retained);
  assert.deepEqual(Object.keys(next).sort(), Object.keys(retained).sort());
  assert(isAlphaSocialIntent({ type: 'publication-save', draft: next, expected: retained }));
  assert(validateProgramData(JSON.parse(JSON.stringify(stored))));
  assert.deepEqual(createProgramPublicationDraft(stored, f.documentId, NOW), retained);
});

test('C9 rejects a second fresh request after another tab publishes, while replay remains idempotent', () => {
  const f = fixture(), draft = createProgramRepublishDraft(f.data, f.documentId, f.flowId, NOW)!;
  const saved = accept(saveProgramPublicationDraft(f.data, f.actor, draft, null));
  const first = publishProgramDocument(saved, f.actor, draft, NOW); assert(first.ok);
  const replay = publishProgramDocument(first.data, f.actor, draft, NOW); assert(replay.ok);
  assert.equal(replay.result, first.result); assert.equal(replay.changed, false); assert.deepEqual(replay.data, first.data);
  const stale = programClone(draft); stale.id = programId('draft'); stale.requestId = programId('request');
  assert.equal(saveProgramPublicationDraft(first.data, f.actor, stale, null).ok, false);
  const forged = programClone(first.data); forged.spaces[f.actor].publicationDrafts.push(stale);
  const second = publishProgramDocument(forged, f.actor, stale, NOW);
  assert.equal(second.ok, false); assert.deepEqual(second.data, forged);
  assert.equal(canRepublishProgramDocument(first.data, f.actor, f.documentId), false);
});

test('C9 preserves original provenance and rejects its removal or a simulated-source downgrade', () => {
  const f = fixture({ derived: true, simulated: true }), draft = createProgramRepublishDraft(f.data, f.documentId, f.flowId, NOW)!;
  assert(draft.derivedFrom); assert.equal(draft.sourceKind, 'simulated-example');
  for (const patch of [{ derivedFrom: null }, { sourceKind: 'user-text' as const }]) {
    const bad = { ...programClone(draft), ...patch }, stored = accept(saveProgramPublicationDraft(f.data, f.actor, bad, null));
    const result = publishProgramDocument(stored, f.actor, bad, NOW); assert.equal(result.ok, false); assert.deepEqual(result.data, stored);
  }
});

test('C9 anchors every withdrawn row independently across two republication cycles', () => {
  const f = fixture(), b = createProgramRepublishDraft(f.data, f.documentId, f.flowId, NOW)!;
  b.title = '두 번째 Flow 마지막 내용'; b.rows[0].title = '두 번째 Flow 항목';
  const second = storeAndPublish(f.data, b);
  const withdrawn = accept(archiveProgramPublication(second.data, f.actor, f.documentId, second.flowId, second.version.id));
  assert.equal(createProgramRepublishDraft(withdrawn, f.documentId, f.flowId, NOW)!.title, f.version.title);
  assert.equal(createProgramRepublishDraft(withdrawn, f.documentId, second.flowId, NOW)!.title, b.title);
  assert.equal(createProgramPublicationDraft(withdrawn, f.documentId, NOW)!.flowId, second.flowId);
  const stored = accept(saveProgramPublicationDraft(withdrawn, f.actor, createProgramRepublishDraft(withdrawn, f.documentId, second.flowId, NOW)!, null));
  assert.equal(createProgramRepublishDraft(stored, f.documentId, f.flowId, NOW), null);
  const third = storeAndPublish(withdrawn, createProgramRepublishDraft(withdrawn, f.documentId, f.flowId, NOW)!);
  const activity = readProgramPublishingActivity(third.data, f.actor);
  assert.equal(activity.flows[0].id, third.flowId); assert.equal(activity.flows[0].number, 1);
  assert(activity.flows.filter(flow => flow.archived).every(flow => flow.documents.every(doc => !doc.canEditPublication)));
});

test('C9 preserves document/actor/retained-draft conflict gates and archive restoration requirement', () => {
  const f = fixture(), draft = createProgramRepublishDraft(f.data, f.documentId, f.flowId, NOW)!;
  const archived = programClone(f.data); archived.spaces[f.actor].archivedDocumentIds.push(f.documentId);
  assert.equal(createProgramRepublishDraft(archived, f.documentId, f.flowId, NOW), null);
  const changed = programClone(f.data); changed.spaces[f.actor].text = M.editText(changed.spaces[f.actor].text, f.documentId, '바뀐 개인 원문');
  const saved = accept(saveProgramPublicationDraft(changed, f.actor, draft, null));
  assert.equal(publishProgramDocument(saved, f.actor, draft, NOW).ok, false);
  const foreign = programClone(f.data); foreign.activeActorId = f.other;
  assert.equal(createProgramRepublishDraft(foreign, f.documentId, f.flowId, NOW), null);
  assert.equal(resolveProgramPrivatePublicationDraft(f.data, f.actor, draft, { ...draft, title: '다른 초안' }, 'mine').ok, false);
});
