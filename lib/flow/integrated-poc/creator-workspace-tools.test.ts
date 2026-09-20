import test from 'node:test';
import assert from 'node:assert/strict';
import { planProgramCreatorStructure, listPersonalWorkspacePocStructureTemplatePreviews } from './creator-workspace-tools';
import { fingerprintPersonalWorkspacePocAuthoringSource as fp, parsePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { planPersonalWorkspacePocAuthoringPropertyEdit } from '../personal-workspace-poc-authoring-properties';
import { createProgramData, validateProgramData } from './program-data';
import { applyProgramCreatorAction, setProgramCreatorWorking, previewProgramCreatorSource, handoffProgramCreatorDraft } from './creator-workspace';
import type { ProgramData, ProgramTransition } from './contract';
import { textWorkspaceModel as M } from './text-workspace';

const NOW = '2026-09-12T11:00:00.000Z', DAY = '2026-09-12';
function ok(transition: ProgramTransition<string>) { if (!transition.ok) assert.fail(transition.reason); assert(validateProgramData(transition.data)); return transition; }
function save(rawText: string, data = createProgramData()) {
  const actorId = data.activeActorId, existing = data.spaces[actorId].creatorWorkspace?.working ?? null;
  const changed = ok(setProgramCreatorWorking(data, { actorId, expectedWorking: existing, working: { draftId: 'creator-tools', title: '제작 자료', rawText, baseRecordRevision: existing?.baseRecordRevision ?? null } }, NOW)).data;
  const library = changed.spaces[actorId].creatorWorkspace!.library;
  return ok(applyProgramCreatorAction(changed, { actorId, requestId: `save-${library.revision}`, action: { type: 'save', draftId: 'creator-tools', title: '제작 자료', rawText,
    sourceFingerprint: fp(rawText), expectedLibraryRevision: library.revision, ...(existing?.baseRecordRevision ? { expectedRecordRevision: existing.baseRecordRevision } : {}), now: NOW } }, NOW)).data;
}
function handoff(data: ProgramData) { return handoffProgramCreatorDraft(data, { actorId: data.activeActorId, requestId: `handoff-${data.spaces[data.activeActorId].creatorWorkspace!.library.revision}`,
  draftId: 'creator-tools', expectedRecordRevision: data.spaces[data.activeActorId].creatorWorkspace!.library.records['creator-tools'].recordRevision, today: DAY }, NOW); }

const entries = listPersonalWorkspacePocStructureTemplatePreviews();
test('the Program exposes the same six verified pinned structure templates, not freshly invented samples', () => { assert.equal(entries.length, 6); });
for (const entry of entries) test(`structure ${entry.templateId}: exact compiler bytes, original result and explicit same-document execution handoff`, () => {
  const input = { draftId: 'creator-tools', expectedDraftId: 'creator-tools', templateId: entry.templateId, catalogVersion: entry.catalogVersion,
    contractVersion: entry.contractVersion, rawText: '', expectedSourceFingerprint: fp(''), confirmed: true };
  const before = JSON.stringify({ input, entry }), plan = planProgramCreatorStructure(input);
  assert.equal(plan.status, 'applied'); assert.equal(plan.nextRawText, entry.expectedRawText); assert.equal(plan.sourceMutationCount, 1);
  assert.equal(plan.workspaceMutationCount, 0); assert.equal(plan.operatingMutationCount, 0); assert.equal(JSON.stringify({ input, entry }), before);
  const parsed = parsePersonalWorkspacePocAuthoring(plan.nextRawText); assert.equal(parsed.items.length, entry.expectedItemCount);
  const data = save(plan.nextRawText), working = data.spaces[data.activeActorId].creatorWorkspace!.working!;
  const preview = previewProgramCreatorSource(working, DAY, NOW); assert(preview.materialized?.ok); assert(preview.result?.ok);
  const result = ok(handoff(data)); assert.equal(result.data.spaces[data.activeActorId].text.documents.filter(doc => doc.id === result.result).length, 1);
  const repeated = ok(handoff(result.data)); assert.equal(repeated.changed, false); assert.equal(repeated.result, result.result);
  const owner = result.data.spaces[data.activeActorId].creatorWorkspace!.executionSources!['creator-tools'];
  assert.equal(owner.revisions.length, 1); assert.equal(owner.revisions[0].raw, entry.expectedRawText);
  assert.equal(owner.revisions[0].rows.filter(row => row.kind === 'series').length, parsed.items.filter(item => item.recurrence).length);
  assert.deepEqual(owner.revisions[0].flow, preview.materialized.flow);
  assert.equal(data.spaces[data.activeActorId].creatorWorkspace!.library.records['creator-tools'].rawText, entry.expectedRawText);
});

test('structure cancel, IME, changed document/source, nonempty source and version mismatch keep exact source with zero mutations', () => {
  const entry = entries[0], input = { draftId: 'creator-tools', expectedDraftId: 'creator-tools', templateId: entry.templateId, catalogVersion: entry.catalogVersion,
    contractVersion: entry.contractVersion, rawText: '', expectedSourceFingerprint: fp(''), confirmed: true };
  for (const [patch, reason] of [
    [{ confirmed: false }, 'cancelled'], [{ composing: true }, 'composing'], [{ draftId: 'another-document' }, 'stale-document'],
    [{ rawText: '개인 원문' }, 'stale-source'], [{ rawText: '개인 원문', expectedSourceFingerprint: fp('개인 원문') }, 'nonempty-source'],
    [{ catalogVersion: 'unknown' }, 'version-mismatch'], [{ templateId: 'unknown' }, 'unknown-template'],
  ] as const) {
    const request = { ...input, ...patch }, plan = planProgramCreatorStructure(request);
    assert.equal(plan.reason, reason); assert.equal(plan.nextRawText, request.rawText); assert.equal(plan.sourceMutationCount, 0);
    assert.equal(plan.workspaceMutationCount, 0); assert.equal(plan.operatingMutationCount, 0);
  }
});

test('original resource property planner preserves URL/label in source, result and same-document handoff updates', () => {
  const raw = '# 자료 준비\n\n## 출발\n- [ ] 준비 확인\n  - 날짜: 2026-09-15\n  - 설명: 기존 설명';
  const edit = planPersonalWorkspacePocAuthoringPropertyEdit({ intent: 'apply', rawText: raw, expectedSourceFingerprint: fp(raw), itemSourceLine: 4,
    key: 'resource', value: '[준비 영상](https://example.com/preparation)', beforeSelection: { start: 0, end: 0 } });
  assert.equal(edit.status, 'applied'); if (edit.status !== 'applied') return;
  const source = edit.nextRawText, data = save(source), preview = previewProgramCreatorSource(data.spaces[data.activeActorId].creatorWorkspace!.working!, DAY, NOW);
  assert(preview.materialized);
  assert.equal(preview.materialized.parseResult.items[0].resourceUrl, 'https://example.com/preparation');
  assert.equal(preview.materialized.parseResult.items[0].resourceLabel, '준비 영상'); assert(preview.result?.ok);
  assert(JSON.stringify(preview.result).includes('https://example.com/preparation'));
  const first = ok(handoff(data)), doc = M.getDocument(first.data.spaces[data.activeActorId].text, first.result)!;
  assert.equal(M.raw(doc), source); const itemId = M.tasks(first.data.spaces[data.activeActorId].text).find(task => task.docId === first.result)!.id;
  const updatedSource = source.replace('기존 설명', '원문에서 고친 설명'), updated = save(updatedSource, first.data), second = ok(handoff(updated));
  assert.equal(second.result, first.result); assert.equal(M.raw(M.getDocument(second.data.spaces[data.activeActorId].text, first.result)), updatedSource);
  assert.equal(M.tasks(second.data.spaces[data.activeActorId].text).find(task => task.docId === first.result)!.id, itemId);
  assert.deepEqual(second.data.spaces[data.activeActorId].text.progressRecords, first.data.spaces[data.activeActorId].text.progressRecords);
  assert.deepEqual(second.data.public, data.public);
});
