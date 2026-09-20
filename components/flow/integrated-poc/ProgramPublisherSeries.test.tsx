import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PROGRAM_STATE_KEY, programClone, type ProgramTransition } from '../../../lib/flow/integrated-poc/contract';
import { createProgramData, createProgramEnvelope, validateProgramData, validateProgramEnvelope, validateProgramSchedule, canPublishProgramSchedule } from '../../../lib/flow/integrated-poc/program-data';
import { commitProgramEnvelope, loadProgramStore, makeProgramEnvelope } from '../../../lib/flow/integrated-poc/program-store';
import { setProgramCreatorWorking, applyProgramCreatorAction, handoffProgramCreatorDraft } from '../../../lib/flow/integrated-poc/creator-workspace';
import { fingerprintPersonalWorkspacePocAuthoringSource as fp } from '../../../lib/flow/personal-workspace-poc-authoring';
import { createTextAuthoringDocument } from '../../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/parser';
import { createNativeCreatorDocumentOwner } from '../../../lib/flow/integrated-poc/native-creator-document';
import { inspectProgramNativeCreatorHandoff, applyProgramNativeCreatorHandoff } from '../../../lib/flow/integrated-poc/creator-native-execution-adapter';
import { inspectProgramPublicationSeries, applyProgramPublicationSeriesReview, programPublicationSeriesSourcesCurrent } from '../../../lib/flow/integrated-poc/publication-series-draft';
import { programRecurringScheduleFromDraft } from '../../../lib/flow/integrated-poc/public-recurrence-contract';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import type * as Publisher from './ProgramPublisher';
import { ProgramPublicationRecurrence } from './ProgramPublicationRecurrence';
import { createProgramController } from '../../../lib/flow/integrated-poc/controller';
import { importProgramPublicVersion, applyProgramCopyVersion, compareProgramCopyVersion } from '../../../lib/flow/integrated-poc/private-space';
import { createProgramProposal, reviewProgramProposal, programProposalReviewToken } from '../../../lib/flow/integrated-poc/publication';
import { readProgramExecutionOccurrences, updateProgramOccurrenceExecution } from '../../../lib/flow/integrated-poc/recurrence-state';
import { programPublicCopyExecutionRef } from '../../../lib/flow/integrated-poc/public-copy-recurrence';
import { makeProgramOutput } from '../../../lib/flow/integrated-poc/output';
import { defaultProgramOutputRecurrenceWindow } from '../../../lib/flow/integrated-poc/public-output-recurrence';

const componentUrl = new URL('./ProgramPublisher.tsx', import.meta.url), require = createRequire(componentUrl);
const root = resolve(dirname(fileURLToPath(componentUrl)), '../../..');
const compiled = ts.transpileModule(readFileSync(componentUrl, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
const loaded = { exports: {} as typeof Publisher };
vm.runInThisContext(`(function(module,exports,require){${compiled.outputText}\n})`, { filename: 'ProgramPublisherSeries.compiled.cjs' })(loaded, loaded.exports, (id: string) => {
  if (id.endsWith('.module.css')) return { __esModule: true, default: {} };
  return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
});
const { ProgramPublisher, createProgramPublicationDraft, saveProgramPublicationDraft, programPublicationInput, publishProgramDocument,
  captureProgramPublicationInput, programPublicationRecoveryText } = loaded.exports;
const NOW = '2026-09-14T00:15:00.000Z', draftId = 'publication-series-draft-test';
const RAW = '# 겨울 운동\n\n- 기준일: 2026-12-01\n\n## 주간\n- [ ] 걷기\n  - 날짜: 2026-12-01\n  - 시간: 09:30\n  - 시간대: Asia/Seoul\n  - 반복: 매주 월, 수\n  - 반복 종료: 8회\n  - 설명: 천천히 걷는다\n  - 주의: 무리하지 않는다\n  - [x] 운동화 확인\n\n- [ ] 스트레칭\n  - 날짜: 2026-12-02\n  - 반복: 매주 금\n  - 반복 종료: 8회\n\n## 준비\n- [ ] 가방 준비\n  - 날짜: 2026-12-03';
function accept(result: ProgramTransition<string>) { assert(result.ok, result.ok ? '' : result.reason); assert(validateProgramData(result.data)); return result; }
function fixture(kind: 'creator' | 'native') {
  let data = createProgramData(); const actorId = data.activeActorId; let nativeFields = {};
  if (kind === 'native') {
    const doc = createTextAuthoringDocument(RAW, { documentId: 'original-native-doc', ownership: 'creator', now: NOW });
    const source = { storageKey: 'flow:text-authoring:drafts:v1' as const, draftId: 'original-native', versionId: 'native-v1', revisionId: doc.revision.revisionId, documentJson: JSON.stringify(doc) };
    const owner = createNativeCreatorDocumentOwner({ id: draftId, source }, NOW); assert(owner.ok);
    nativeFields = { nativeDocument: owner.owner, nativeSelection: source };
  }
  data = accept(setProgramCreatorWorking(data, { actorId, expectedWorking: null, working: { draftId, title: '겨울 운동', rawText: RAW, baseRecordRevision: null, ...nativeFields } }, NOW)).data;
  const workspace = data.spaces[actorId].creatorWorkspace!, working = workspace.working!;
  data = accept(applyProgramCreatorAction(data, { actorId, requestId: 'save-fixture', expectedNativeDocument: working.nativeDocument ?? null, expectedNativeSelection: working.nativeSelection ?? null,
    action: { type: 'save', draftId, rawText: RAW, title: '겨울 운동', sourceFingerprint: fp(RAW), expectedLibraryRevision: workspace.library.revision, now: NOW } }, NOW)).data;
  let result: ProgramTransition<string>;
  if (kind === 'native') {
    const preview = inspectProgramNativeCreatorHandoff(data, { actorId, draftId }, NOW); assert(preview.ok, preview.ok ? '' : preview.reason);
    const choices = Object.fromEntries(preview.preview.rows.map(row => [row.itemId, { source: 'incoming' as const, date: 'keep' as const, time: 'keep' as const, children: 'keep' as const }]));
    result = applyProgramNativeCreatorHandoff(data, { actorId, requestId: 'handoff-fixture', preview: preview.preview, choices }, NOW);
  } else result = handoffProgramCreatorDraft(data, { actorId, requestId: 'handoff-fixture', draftId, expectedRecordRevision: 1, today: '2026-12-01' }, NOW);
  const handoff = accept(result); data = handoff.data;
  const draft = createProgramPublicationDraft(data, handoff.result, NOW)!; assert(draft);
  const freshDraft = programClone(draft);
  // Reproduce the genuine old publisher's row projection, not a hand-authored easier source.
  draft.rows = M.rowMeta(data.spaces[actorId].text, handoff.result).flatMap(row =>
    row.kind !== 'task' && row.kind !== 'note' || row.kind === 'note' && !row.text.trim() ? [] : [{ rowId: row.id, origin: row.kind, itemId: `publication-${row.id}`,
      selected: false, title: row.kind === 'task' ? row.title ?? '' : '', description: '', completionCriteria: '', sourceUrl: '', scheduleKind: 'undated' as const, scheduleValue: '', subchecks: [] }]);
  draft.title = '저장한 공개 초안'; draft.summary = '이 입력을 보존';
  data = accept(saveProgramPublicationDraft(data, actorId, draft, null)).data;
  return { data, actorId, documentId: handoff.result, draft, freshDraft };
}
function review(f: ReturnType<typeof fixture>, draft = f.draft) {
  const result = inspectProgramPublicationSeries(f.data, f.actorId, draft); assert(result.ok, result.ok ? '' : result.reason); return result.review;
}
function group(f: ReturnType<typeof fixture>, draft = f.draft) {
  const inspected = review(f, draft);
  const result = applyProgramPublicationSeriesReview(f.data, f.actorId, draft, inspected, inspected.candidates.map(candidate => candidate.sourceKey), NOW);
  assert(result.ok, result.ok ? '' : result.reason); return result.draft;
}
for (const kind of ['creator', 'native'] as const) test(`PRL ${kind}: real authoring to selected publication, execution, proposal acceptance and explicit adoption with storage recovery`, async () => {
  const f = fixture(kind), draft = group(f), selected = draft.rows.find(row => row.origin === 'series')!;
  selected.selected = true;
  const initial = accept(saveProgramPublicationDraft(f.data, f.actorId, draft, f.draft)).data;
  const values = new Map([['flow:operating-example', '  {"raw":"개인 원문\\n"}  ']]), calls: string[] = [];
  let fail = false;
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, raw: string) => { calls.push(key); assert.equal(key, PROGRAM_STATE_KEY); if (fail) throw new DOMException('full', 'QuotaExceededError'); values.set(key, raw); },
    removeItem: (key: string) => { assert.equal(key, PROGRAM_STATE_KEY); calls.push(key); values.delete(key); }, clear: () => assert.fail('clear forbidden') };
  const controller = createProgramController({ storage, initialData: initial, exclusive: work => Promise.resolve(work()) }); assert(controller.ok);
  const data = () => controller.snapshot().envelope.data;
  const commit = async (label: string, change: (current: typeof initial) => ProgramTransition<string>) => {
    const result = await controller.mutate(label, change, { actorId: f.actorId }); assert(result.ok, result.ok ? '' : result.reason); return result;
  };
  fail = true;
  const failed = await controller.mutate('선택 공개', current => publishProgramDocument(current, f.actorId, draft, NOW), { actorId: f.actorId });
  assert(!failed.ok); assert.equal(controller.snapshot().raw, null); assert.deepEqual(data(), initial);
  fail = false;
  const publication = await commit('선택 공개 재시도', current => publishProgramDocument(current, f.actorId, draft, NOW));
  const version1 = data().public.versions.find(version => version.id === publication.result)!; assert(version1);
  assert.equal(version1.items.length, 1); assert.equal(version1.items[0].id, selected.itemId); assert.equal(version1.items[0].schedule.kind, 'recurring');
  assert.deepEqual(data().spaces[f.actorId].creatorWorkspace, initial.spaces[f.actorId].creatorWorkspace);
  assert.deepEqual(data().spaces[f.actorId].text, initial.spaces[f.actorId].text);
  assert.deepEqual(data().spaces[f.actorId].recurrenceExecution, initial.spaces[f.actorId].recurrenceExecution);
  const count = calls.length, publishedRaw = controller.snapshot().raw;
  const replay = await commit('같은 공개 요청', current => publishProgramDocument(current, f.actorId, draft, NOW));
  assert.equal(replay.changed, false); assert.equal(calls.length, count); assert.equal(controller.snapshot().raw, publishedRaw);
  for (const format of ['txt', 'csv', 'ics'] as const) {
    const output = makeProgramOutput(version1, { selectedItemIds: [selected.itemId], format, recurrenceWindow: defaultProgramOutputRecurrenceWindow() }, NOW);
    assert(output.ok, output.ok ? '' : output.reason); assert(output.payload.includes('걷기')); assert(!output.payload.includes('seriesSource'));
  }
  const imported = await commit('개인 사본', current => importProgramPublicVersion(current, { actorId: f.actorId, expectedSpace: current.spaces[f.actorId], requestId: 'prl-copy', versionId: version1.id, itemIds: [selected.itemId], anchor: null }));
  const copyId = imported.result!, flowRef = programPublicCopyExecutionRef(copyId);
  const occurrences = readProgramExecutionOccurrences(data(), { actorId: f.actorId, flowRef, localToday: '2026-12-01' }); assert(occurrences.ok); assert.equal(occurrences.rows.length, 8);
  const first = occurrences.rows[0];
  await commit('첫 회차 완료', current => updateProgramOccurrenceExecution(current, { actorId: f.actorId, flowRef, localToday: '2026-12-01', identity: first.identity, expected: null, changes: { completion: { status: 'completed', completedAt: NOW } } }));
  const privateBeforeProposal = programClone(data().spaces), originalPublic = programClone(data().public.versions);
  const changedSchedule = programRecurringScheduleFromDraft({ version: 1, raw: '매주 화, 목', end: '6회', startKind: 'fixed', startValue: '2026-12-02', time: '10:00', timeZone: 'Asia/Seoul' }); assert(changedSchedule);
  const proposal = await commit('반복 제안', current => createProgramProposal(current, { actorId: 'participant-jihun', requestId: 'prl-proposal', flowId: version1.flowId, baseVersionId: version1.id, itemId: selected.itemId, reason: '검증용 일정 보완', patch: { schedule: changedSchedule } }, NOW));
  const reviewInput = { actorId: f.actorId, proposalId: proposal.result!, expectedVersionId: version1.id, expectedProposalToken: programProposalReviewToken(data(), proposal.result!)!, decision: 'accept' as const };
  const beforeAccept = controller.snapshot().raw;
  fail = true;
  const rejected = await controller.mutate('채택 저장 실패', current => reviewProgramProposal(current, reviewInput, NOW), { actorId: f.actorId });
  assert(!rejected.ok); assert.equal(controller.snapshot().raw, beforeAccept); assert.deepEqual(data().public.versions, originalPublic);
  fail = false;
  const accepted = await commit('같은 제안 채택 재시도', current => reviewProgramProposal(current, reviewInput, NOW));
  const version2 = data().public.versions.find(version => version.id === accepted.result)!;
  assert.equal(version2.parentVersionId, version1.id); assert.deepEqual(version2.items[0].schedule, changedSchedule);
  assert.deepEqual(data().public.versions.slice(0, -1), originalPublic); assert.deepEqual(data().spaces, privateBeforeProposal);
  const comparison = compareProgramCopyVersion(data(), { actorId: f.actorId, copyId, versionId: version2.id }); assert(comparison.ok);
  assert(comparison.result.items[0].fields.find(field => field.field === 'schedule')?.canApply);
  const beforeAdoption = programClone(data().spaces[f.actorId]);
  await commit('선택한 일정만 수용', current => applyProgramCopyVersion(current, { actorId: f.actorId, expectedSpace: current.spaces[f.actorId], requestId: 'prl-adopt', copyId, versionId: version2.id, expectedBaseVersionId: version1.id, itemIds: [selected.itemId], fields: ['schedule'] }));
  assert.deepEqual(data().spaces[f.actorId].recurrenceExecution, beforeAdoption.recurrenceExecution);
  const nextOccurrences = readProgramExecutionOccurrences(data(), { actorId: f.actorId, flowRef, localToday: '2026-12-01' }); assert(nextOccurrences.ok);
  assert.equal(nextOccurrences.rows.length, 6); assert(nextOccurrences.sourceConflictKeys.includes(first.key));
  assert.equal(nextOccurrences.rows[0].time, '10:00');
  const undo = await controller.undo(f.actorId); assert(undo.ok); assert.deepEqual(data().spaces[f.actorId], beforeAdoption);
  assert.equal(data().public.versions.at(-1)!.id, version2.id); assert.equal(data().public.proposals.find(row => row.id === proposal.result)?.status, 'accepted');
  const reload = createProgramController({ storage, initialData: createProgramData(), exclusive: work => Promise.resolve(work()) }); assert(reload.ok);
  assert.deepEqual(reload.snapshot().envelope.data, data()); assert.equal(reload.snapshot().raw, controller.snapshot().raw);
  assert.equal(values.get('flow:operating-example'), '  {"raw":"개인 원문\\n"}  '); assert(calls.every(key => key === PROGRAM_STATE_KEY));
});
for (const kind of ['creator', 'native'] as const) {
  test(`PSD ${kind}: old saved draft is byte-identical until explicit two-series grouping`, () => {
    const f = fixture(kind), before = JSON.stringify(f.data), inspected = review(f);
    assert.equal(f.freshDraft.rows.filter(row => row.origin === 'series').length, 2);
    assert.equal(inspected.candidates.length, 2); assert(inspected.candidates.every(candidate => !candidate.row.selected));
    assert.deepEqual(createProgramPublicationDraft(f.data, f.documentId, '2027-01-01T00:00:00.000Z'), f.draft);
    assert.equal(JSON.stringify(f.data), before);
    const next = group(f); assert.equal(next.rows.filter(row => row.origin === 'series').length, 2);
    assert.equal(next.title, f.draft.title); assert.equal(next.summary, f.draft.summary);
    assert(next.rows.some(row => row.origin === 'task' && row.title === '가방 준비'));
    assert(next.rows.filter(row => row.origin === 'series').every(row => !row.selected && !row.subchecks.length));
    assert.equal(JSON.stringify(f.data), before);
  });
  test(`PSD ${kind}: selecting one source preserves edited metadata and every other source`, () => {
    const f = fixture(kind), first = review(f).candidates[0], edited = programClone(f.draft);
    const metadata = edited.rows.find(row => first.removableRowIds.includes(row.itemId)); assert(metadata);
    metadata.description = '내가 따로 작성한 공개 설명'; metadata.selected = true;
    const inspected = review(f, edited), candidate = inspected.candidates[0]; assert(candidate.preservedRowIds.includes(metadata.itemId));
    const result = applyProgramPublicationSeriesReview(f.data, f.actorId, edited, inspected, [candidate.sourceKey], NOW); assert(result.ok);
    assert.deepEqual(result.draft.rows.find(row => row.itemId === metadata.itemId), metadata);
    assert.equal(result.draft.rows.filter(row => row.origin === 'series').length, 1);
    for (const other of inspected.candidates[1].removableRowIds) assert(result.draft.rows.some(row => row.itemId === other));
  });
  test(`PSD ${kind}: stable private binding, no-op review, cancellation and arbitrary preview deletion rejected`, () => {
    const f = fixture(kind), draft = group(f), inspected = review(f, draft);
    const again = applyProgramPublicationSeriesReview(f.data, f.actorId, draft, inspected, inspected.candidates.map(row => row.sourceKey), NOW);
    assert(again.ok); assert.equal(again.changed, false); assert.equal(again.draft, draft);
    const cancel = applyProgramPublicationSeriesReview(f.data, f.actorId, draft, inspected, [], NOW); assert(cancel.ok); assert.equal(cancel.draft, draft);
    const tampered = programClone(inspected); tampered.candidates[0].removableRowIds.push(draft.rows.at(-1)!.itemId);
    assert.equal(applyProgramPublicationSeriesReview(f.data, f.actorId, draft, tampered, [inspected.candidates[0].sourceKey], NOW).ok, false);
    assert.equal(applyProgramPublicationSeriesReview(f.data, f.actorId, draft, inspected, ['unknown'], NOW).ok, false);
    assert.equal(applyProgramPublicationSeriesReview(f.data, f.actorId, draft, inspected, [inspected.candidates[0].sourceKey, inspected.candidates[0].sourceKey], NOW).ok, false);
  });
  test(`PSD ${kind}: one selected rule stays structured and private source pointers never enter public input`, () => {
    const f = fixture(kind), draft = group(f), row = draft.rows.find(row => row.origin === 'series')!;
    row.selected = true;
    const input = programPublicationInput(draft, f.actorId); assert(input); assert.equal(input.items.length, 1);
    const schedule = input.items[0].schedule; assert.equal(schedule.kind, 'recurring');
    if (schedule.kind === 'recurring') { assert.deepEqual(schedule.rule.end, { mode: 'count', count: 8 }); assert.equal(schedule.time, '09:30'); assert.equal(schedule.timeZone, 'Asia/Seoul'); }
    assert(input.items[0].description.includes('무리하지 않는다'));
    for (const privateValue of [row.seriesSource!.key, row.seriesSource!.revisionId, draft.sourceDocumentFingerprint, 'completedAt', 'seriesSource', 'sourceDocumentFingerprint']) assert(!JSON.stringify(input).includes(privateValue));
    // The same strict authoring-v1 contract is used by publication and every consumer.
    assert.equal(validateProgramSchedule(schedule), true); assert.equal(canPublishProgramSchedule(schedule), true);
    const saved = accept(saveProgramPublicationDraft(f.data, f.actorId, draft, f.draft)).data;
    const before = JSON.stringify(saved), published = publishProgramDocument(saved, f.actorId, draft, NOW);
    assert(published.ok); assert.equal(JSON.stringify(saved), before);
    assert.deepEqual(published.data.public.versions.at(-1)!.items, input.items);
    assert.deepEqual(published.data.spaces[f.actorId].text, saved.spaces[f.actorId].text);
  });
  test(`PSD ${kind}: changed draft/source and another actor cannot consume an old preview`, () => {
    const f = fixture(kind), inspected = review(f), before = JSON.stringify(f.data);
    assert.equal(applyProgramPublicationSeriesReview(f.data, f.actorId, { ...f.draft, title: 'changed' }, inspected, [inspected.candidates[0].sourceKey], NOW).ok, false);
    const archived = programClone(f.data); archived.spaces[f.actorId].archivedDocumentIds.push(f.documentId);
    assert.equal(applyProgramPublicationSeriesReview(archived, f.actorId, f.draft, inspected, [inspected.candidates[0].sourceKey], NOW).ok, false);
    assert.equal(applyProgramPublicationSeriesReview(f.data, 'different-actor', f.draft, inspected, [inspected.candidates[0].sourceKey], NOW).ok, false);
    const selected = group(f); selected.rows.find(row => row.origin === 'series')!.selected = true;
    assert(programPublicationSeriesSourcesCurrent(f.data, f.actorId, selected));
    selected.rows.find(row => row.origin === 'series')!.seriesSource!.fingerprint += 'stale';
    assert.equal(programPublicationSeriesSourcesCurrent(f.data, f.actorId, selected), false);
    assert.equal(JSON.stringify(f.data), before);
  });
}
test('PSD incomplete native input survives private save/reload and recovery without source snapshot leakage', () => {
  const f = fixture('creator'), draft = group(f), row = draft.rows.find(row => row.origin === 'series')!; row.selected = true;
  const next = captureProgramPublicationInput(draft, [{ itemId: row.itemId, field: 'recurrence:raw', value: '매주 ㅎ' },
    { itemId: row.itemId, field: 'recurrence:end', value: '종료 입력 중' }, { itemId: row.itemId, field: 'recurrence:timeZone', value: 'Asia/Seou' }]);
  const invalid = next.rows.find(entry => entry.itemId === row.itemId)!;
  assert.equal(programRecurringScheduleFromDraft(invalid.recurrence!), null); assert.equal(programPublicationInput(next, f.actorId), null);
  const saved = accept(saveProgramPublicationDraft(f.data, f.actorId, next, f.draft)).data;
  assert.deepEqual(createProgramPublicationDraft(saved, f.documentId, NOW), next);
  const recovery = programPublicationRecoveryText(next); assert(recovery.includes('매주 ㅎ')); assert(!recovery.includes('seriesSource')); assert(!recovery.includes(invalid.seriesSource!.key));
  assert(!recovery.includes(next.sourceDocumentFingerprint));
});
test('PSD corrupted private recurrence contracts fail closed without rejecting incomplete text', () => {
  const f = fixture('creator'), draft = group(f), saved = accept(saveProgramPublicationDraft(f.data, f.actorId, draft, f.draft)).data;
  for (const change of [(row: any) => row.recurrence.version = 2, (row: any) => row.recurrence.startKind = 'guess-today',
    (row: any) => row.recurrence.completedAt = NOW, (row: any) => row.seriesSource.version = 2, (row: any) => row.seriesSource.raw = RAW,
    (row: any) => row.seriesSource.key = '["guessed","owner","row"]', (row: any) => row.seriesSource.fingerprint = '{}',
    (row: any) => delete row.recurrence, (row: any) => delete row.seriesSource]) {
    const bad = programClone(saved); change(bad.spaces[f.actorId].publicationDrafts[0].rows.find(row => row.origin === 'series'));
    assert.equal(validateProgramData(bad), false);
  }
});
test('PSD repeated selection SSR shows editable rule, original start/timezone, preview boundary and no private pointer', () => {
  const f = fixture('native'), draft = group(f); draft.rows.find(row => row.origin === 'series')!.selected = true;
  const data = accept(saveProgramPublicationDraft(f.data, f.actorId, draft, f.draft)).data, before = JSON.stringify(data);
  const html = renderToStaticMarkup(<ProgramPublisher data={data} documentId={f.documentId} today="2026-12-01"
    mutate={async () => assert.fail('SSR cannot write')} navigate={() => assert.fail('SSR cannot navigate')} onClose={() => assert.fail('SSR cannot close')} />);
  for (const field of ['raw', 'end', 'startValue', 'time', 'timeZone']) assert(html.includes(`data-publication-field="recurrence:${field}"`));
  for (const label of ['공개할 반복 일정', 'Asia/Seoul', '반복 원본 확인', '첫 회차:']) assert(html.includes(label));
  assert(!html.includes('개인 사본과 출력 연결이 준비되기 전에는'));
  assert(!html.includes('seriesSource')); assert(!html.includes(draft.rows.find(row => row.origin === 'series')!.seriesSource!.key));
  assert.equal(JSON.stringify(data), before);
});
test('PSD recurrence fieldset does not disable composing text behind the existing native input lock', () => {
  const value = { version: 1 as const, raw: '매주 ㅎ', end: '', startKind: 'undated' as const, startValue: '', time: '', timeZone: '' };
  const html = renderToStaticMarkup(<ProgramPublicationRecurrence value={value} disabled styles={{}} onChange={() => assert.fail('SSR cannot edit')} />);
  assert.doesNotMatch(html, /<fieldset[^>]*disabled/); assert.match(html, /<select[^>]*disabled/);
  assert.doesNotMatch(html, /<input[^>]*disabled/); assert(html.includes('data-publication-field="recurrence:raw"'));
  assert(compiled.outputText.includes('!composing.current.has(element)'));
});
test('PSD real Program store commits grouped drafts once, reloads exact input, protects operating bytes and refuses stale/failed saves', () => {
  const f = fixture('native'), draft = group(f), transition = accept(saveProgramPublicationDraft(f.data, f.actorId, draft, f.draft));
  const before = createProgramEnvelope(f.data), raw = JSON.stringify(before);
  const values = new Map([[PROGRAM_STATE_KEY, raw], ['flow:saved-plans', ' [ { "value": "한글" } ]\r\n'], ['flow:execution', '{"x":1}']]);
  const operating = [...values].filter(([key]) => !key.startsWith('flow:poc:personal-workspace:v1:'));
  const writes: string[] = []; let failWrite = false;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => {
    assert.equal(key, PROGRAM_STATE_KEY); writes.push(key); if (failWrite) throw Error('quota'); values.set(key, value);
  }, removeItem: () => assert.fail('no removal'), clear: () => assert.fail('never clear') };
  const next = makeProgramEnvelope(before, transition.data, { actorId: f.actorId });
  const committed = commitProgramEnvelope(storage, { expectedRaw: raw, next, validate: validateProgramEnvelope }); assert(committed.ok); assert.equal(writes.length, 1);
  const loaded = loadProgramStore(storage, validateProgramEnvelope); assert.equal(loaded.kind, 'ready'); assert(loaded.envelope);
  assert.deepEqual(createProgramPublicationDraft(loaded.envelope.data, f.documentId, NOW), draft);
  const noop = commitProgramEnvelope(storage, { expectedRaw: committed.raw, next: committed.envelope, validate: validateProgramEnvelope }); assert(noop.ok); assert.equal(noop.changed, false); assert.equal(writes.length, 1);
  const edited = programClone(draft); edited.rows.find(row => row.origin === 'series')!.recurrence!.raw = '아직 입력 중';
  const changed = accept(saveProgramPublicationDraft(loaded.envelope.data, f.actorId, edited, draft));
  const candidate = makeProgramEnvelope(committed.envelope, changed.data, { actorId: f.actorId });
  assert.equal(commitProgramEnvelope(storage, { expectedRaw: raw, next: candidate, validate: validateProgramEnvelope }).ok, false); assert.equal(writes.length, 1);
  failWrite = true;
  assert.equal(commitProgramEnvelope(storage, { expectedRaw: committed.raw, next: candidate, validate: validateProgramEnvelope }).ok, false);
  assert.equal(writes.length, 2); assert.equal(values.get(PROGRAM_STATE_KEY), committed.raw);
  assert.deepEqual([...values].filter(([key]) => !key.startsWith('flow:poc:personal-workspace:v1:')), operating);
  const reloaded = loadProgramStore(storage, validateProgramEnvelope); assert.equal(reloaded.kind, 'ready'); assert(reloaded.envelope);
  assert.deepEqual(createProgramPublicationDraft(reloaded.envelope.data, f.documentId, NOW), draft);
  const corrupt = programClone(reloaded.envelope); corrupt.data.spaces[f.actorId].publicationDrafts[0].rows.find(row => row.origin === 'series')!.recurrence!.version = 2 as 1;
  const broken = { ...storage, getItem: (key: string) => key === PROGRAM_STATE_KEY ? JSON.stringify(corrupt) : values.get(key) ?? null };
  assert.equal(loadProgramStore(broken, validateProgramEnvelope).kind, 'corrupt'); assert.equal(writes.length, 2);
});
