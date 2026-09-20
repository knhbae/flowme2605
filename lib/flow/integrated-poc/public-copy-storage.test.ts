import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_STATE_KEY, programClone, type ProgramData, type ProgramPublicItem, type ProgramTransition } from './contract';
import { createProgramData, createProgramEnvelope, validateProgramData, validateProgramEnvelope, canPublishProgramSchedule } from './program-data';
import { createProgramController } from './controller';
import { loadProgramStore } from './program-store';
import { createProgramDocument, importProgramPublicVersion, linkProgramCopySeries, unlinkProgramCopySeries, setProgramCopySeriesStart, previewProgramCopyAnchor, setProgramCopyAnchor } from './private-space';
import { prepareProgramRecurrencePlan, applyProgramRecurrencePlanTransition } from './program-recurrence-plan-state';
import { resolveProgramRecurrencePlanTarget, previewProgramRecurrencePlan } from './program-recurrence-plan';
import { programOrderedExecutionRows } from './recurrence-order';
import { programRecurringScheduleFromDraft } from './public-recurrence-contract';
import { publishProgramFlow, createProgramProposal, reviewProgramProposal } from './publication';
import { textWorkspaceModel as M } from './text-workspace';
import { programPublicCopyExecutionRef, readProgramPublicCopyRecurrenceSource } from './public-copy-recurrence';
import { readProgramExecutionOccurrences, readProgramOccurrencePeriod, updateProgramOccurrenceExecution } from './recurrence-state';
import { programSeriesMetadata, programSeriesVisibleInDocument, programPreservesSeriesMetadata } from './recurrence-target';
import { inspectPrivateOutputOccurrences } from './private-output-occurrences';
import { inspectProgramPrivateOutput, makeProgramPrivateOutput } from './private-output';
import { readProgramOutputReturnTarget } from './output-return-target';
import { programOutputReturnUrl } from './output-return';
import { parseProgramLocation } from './navigation';
import { readProgramOccurrenceRecovery } from './recurrence-recovery';

const at = '2026-12-01T00:00:00.000Z', today = '2026-12-01';
function success<T>(value: ProgramTransition<T>) { assert(value.ok, value.ok ? '' : value.reason); return value; }
function base(data: ProgramData, requestId: string) { return { actorId: data.activeActorId, expectedSpace: data.spaces[data.activeActorId], requestId }; }
/** Only the immutable public catalog is seeded. Every personal copy/document/reference/record below uses real transitions. */
function fixture(description = '통증이 없을 때 실시') {
  let data = createProgramData();
  const schedule = programRecurringScheduleFromDraft({ version: 1, raw: '매주 화, 목', end: '8회', startKind: 'fixed', startValue: today, time: '07:00', timeZone: 'Asia/Seoul' }); assert(schedule);
  const fixed: ProgramPublicItem = { id: 'fixed-series', title: '주간 운동', description, completionCriteria: '마무리 확인', sourceUrl: 'https://example.org/source',
    schedule, subchecks: [{ id: 'child', title: '준비 확인' }] };
  const pending: ProgramPublicItem = { ...programClone(fixed), id: 'pending-series', title: '시작을 정할 운동', schedule: { ...schedule, start: { kind: 'undated' } } };
  const ordinary: ProgramPublicItem = { ...programClone(fixed), id: 'ordinary', title: '운동복 챙기기', schedule: { kind: 'fixed', date: today }, subchecks: [] };
  data.public.flows.push({ id: 'test-public-flow', ownerId: 'creator-minji', currentVersionId: 'test-version', category: '운동', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'test-version', flowId: 'test-public-flow', number: 1, parentVersionId: null, title: '혼합 공개 계약 fixture', summary: '원본 보존', items: [fixed, pending, ordinary],
    source: { kind: 'user-text', label: '명시 테스트 fixture', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: at });
  const first = success(createProgramDocument(data, { ...base(data, 'doc-a'), title: '운동 문서', raw: '자유 메모' })); data = first.data;
  const second = success(createProgramDocument(data, { ...base(data, 'doc-b'), title: '주간 문서', raw: 'PRIVATE-NOTE' })); data = second.data;
  assert(validateProgramData(data)); return { data, actorId: data.activeActorId, fixed, pending, ordinary, docA: first.result, docB: second.result };
}
function imported(f = fixture()) {
  const result = success(importProgramPublicVersion(f.data, { ...base(f.data, 'import'), versionId: 'test-version', itemIds: ['fixed-series', 'pending-series', 'ordinary'], anchor: null, targetDocumentId: f.docA }));
  const data = result.data, copy = data.spaces[f.actorId].copies.find(copy => copy.id === result.result)!;
  assert(validateProgramData(data)); return { ...f, data, copy, flowRef: programPublicCopyExecutionRef(copy.id) };
}
function read(f: ReturnType<typeof imported>, data = f.data) {
  const value = readProgramExecutionOccurrences(data, { actorId: f.actorId, flowRef: f.flowRef, localToday: today }); assert(value.ok, value.ok ? '' : value.reason); return value;
}

for (const repeated of [false, true]) for (const scope of ['source', 'whole_series', 'future_series'] as const) {
  test(`PCS output preserves authored prose without adding it twice: ${scope}, intentional repeat ${repeated}`, () => {
    const phrase = '동작 사이에 잠깐 쉰다.', description = repeated ? `${phrase}\n${phrase}\n소요 시간: 20분` : `${phrase}\n소요 시간: 20분`;
    const f = imported(fixture(description)); let data = f.data;
    if (scope !== 'source') {
      const source = read(f).rows[scope === 'whole_series' ? 0 : 1].identity;
      const prepared = prepareProgramRecurrencePlan(data, { actorId: f.actorId, flowRef: f.flowRef, sourceIdentity: source, ownerId: `output-${scope}`, localToday: today, now: at }); assert(prepared.ok);
      const owner = prepared.value.owner, target = resolveProgramRecurrencePlanTarget(owner, { originalDate: source.originalDate }); assert(target.ok);
      const preview = previewProgramRecurrencePlan(owner, { actorId: f.actorId, expected: programClone(owner), currentSource: source,
        operation: { scope, targetDate: scope === 'whole_series' ? '2026-12-03' : '2026-12-05', target: target.value, sourceCutover: source, at } }); assert(preview.ok);
      data = success(applyProgramRecurrencePlanTransition(data, { actorId: f.actorId, expectedSpace: prepared.value.expectedSpace, expectedOwner: null, preview: preview.value, localToday: today })).data;
    }
    const before = JSON.stringify(data), occurrenceRange = { from: today, to: '2027-01-01', includeUndated: true };
    const inspected = inspectProgramPrivateOutput(data, { actorId: f.actorId, documentId: f.docA, occurrenceRange }); assert(inspected.ok);
    const row = inspected.rows.find(row => row.kind === 'occurrence' && (scope === 'source' || row.title.includes('개인 회차'))); assert(row);
    const count = (text: string, value: string) => text.split(value).length - 1;
    assert.equal(count(row.note, phrase), repeated ? 2 : 1);
    assert.equal(count(row.note, '소요 시간: 20분'), 1);
    assert.equal(count(row.note, '완료 기준: 마무리 확인'), 1);
    assert.equal(count(row.note, '수용한 일정 판본: 1'), 1);
    for (const format of ['txt', 'csv', 'ics'] as const) {
      const out = makeProgramPrivateOutput(data, { actorId: f.actorId, documentId: f.docA, mode: 'tasks', selectedItemIds: [row.id], format, occurrenceRange,
        returnPageUrl: 'http://127.0.0.1:3641/my?personalWorkspacePoc=v1' }, at); assert(out.ok);
      const unfolded = format === 'ics' ? out.payload.replace(/\r\n[ \t]/g, '') : out.payload;
      assert.equal(count(unfolded, phrase), repeated ? 2 : 1, format);
      assert.equal(count(unfolded, '소요 시간: 20분'), 1, format);
      assert(unfolded.includes('수용한 일정 판본: 1')); assert(unfolded.includes('마무리 확인'));
      assert.equal(out.itemIds.length, 1); assert.equal(row.time, '07:00');
    }
    // Standalone private notes are raw-document content, not an invented per-occurrence memo field.
    const raw = makeProgramPrivateOutput(data, { actorId: f.actorId, documentId: f.docB, mode: 'raw', selectedItemIds: [], format: 'txt' }, at); assert(raw.ok);
    assert.equal(raw.payload, 'PRIVATE-NOTE'); assert.equal(JSON.stringify(data), before);
    assert.deepEqual(data.public, f.data.public);
    assert.equal(data.public.versions.find(v => v.id === 'test-version')!.items[0].description, description);
  });
}

test('PCS real mixed import retains immutable source and creates no checkbox owners for series or subchecks', () => {
  const initial = fixture(), before = JSON.stringify(initial.data), f = imported(initial), space = f.data.spaces[f.actorId];
  assert.equal(JSON.stringify(initial.data), before); assert.deepEqual(f.data.public, initial.data.public);
  for (const actor of f.data.actors.filter(actor => actor.id !== f.actorId)) assert.deepEqual(f.data.spaces[actor.id], initial.data.spaces[actor.id]);
  assert.deepEqual(f.copy.recurrence?.itemIds, ['fixed-series', 'pending-series']); assert.equal(f.copy.recurrence?.references?.length, 2);
  const tasks = M.tasks(space.text);
  for (const id of ['fixed-series', 'pending-series']) {
    assert(!tasks.some(task => task.id === f.copy.itemLines[id] || Object.values(f.copy.subcheckLines[id]).includes(task.id)));
  }
  assert(tasks.some(task => task.id === f.copy.itemLines.ordinary));
  assert.equal(read(f).rows.length, 8); assert.equal(read(f).pendingStarts?.length, 1);
  assert.equal(read(f).pendingStarts?.[0].reason, 'start-required');
  assert.equal(canPublishProgramSchedule(f.fixed.schedule), true);
  const attempt = publishProgramFlow(f.data, { actorId: f.actorId, requestId: 'still-closed', title: '반복', summary: '', category: '운동', situations: [], items: [f.fixed],
    source: { kind: 'user-text', label: '테스트', url: null, checkedAt: null } }, at);
  assert(attempt.ok); assert.deepEqual(attempt.data.spaces, f.data.spaces);
  assert.deepEqual(attempt.data.public.versions.at(-1)!.items, [f.fixed]);
});

test('PCS missing starts stay explicit in document/period/output without hiding the other series', () => {
  const f = imported(), before = JSON.stringify(f.data);
  for (const input of [{ from: today, to: '2026-12-10' }, { undatedOnly: true }]) {
    const period = readProgramOccurrencePeriod(f.data, { actorId: f.actorId, flowRef: f.flowRef, localToday: today, ...input }); assert(period.ok);
    assert.equal(period.pendingStarts?.length, 1); assert.equal(period.rows.length, 'from' in input ? 4 : 0);
  }
  const out = inspectPrivateOutputOccurrences(f.data, { actorId: f.actorId, documentId: f.docA, occurrenceRange: { from: today, to: '2026-12-10', includeUndated: true } }, new Set());
  assert(out.ok); assert.equal(out.rows.length, 4); assert(out.warnings.some(text => text.includes('시작일이 미정'))); assert.equal(JSON.stringify(f.data), before);
  const mixed = programOrderedExecutionRows(f.data, { period: 'today', date: today, today });
  assert.equal(mixed.pendingStarts.length, 1); assert.equal(mixed.rows.filter(row => row.kind === 'occurrence').length, 1);
});

test('PCS relative anchor preview and commit preserve public source and old completion without editing metadata tasks', () => {
  const initial = fixture(); initial.fixed.schedule = { ...initial.fixed.schedule as Extract<ProgramPublicItem['schedule'], { kind: 'recurring' }>, start: { kind: 'relative', days: -3 } };
  initial.data.public.versions.at(-1)!.items[0] = initial.fixed;
  const f = imported(initial), beforeText = programClone(f.data.spaces[f.actorId].text);
  assert.equal(read(f).pendingStarts?.length, 2);
  const preview = success(previewProgramCopyAnchor(f.data, { actorId: f.actorId, copyId: f.copy.id, anchor: '2026-12-04' }));
  assert.equal(preview.result.items.find(item => item.itemId === 'fixed-series')?.afterDate, today); assert(preview.result.items.find(item => item.itemId === 'fixed-series')?.recurring);
  let data = success(setProgramCopyAnchor(f.data, { ...base(f.data, 'anchor-first'), copyId: f.copy.id, anchor: '2026-12-04' })).data;
  const row = read(f, data).rows[0]; assert.equal(row.originalDate, today);
  data = success(updateProgramOccurrenceExecution(data, { actorId: f.actorId, flowRef: f.flowRef, localToday: today, identity: row.identity, expected: null, changes: { completion: { status: 'completed', completedAt: at } } })).data;
  const records = programClone(data.spaces[f.actorId].recurrenceExecution);
  data = success(setProgramCopyAnchor(data, { ...base(data, 'anchor-next'), copyId: f.copy.id, anchor: '2026-12-07' })).data;
  assert.equal(read(f, data).rows[0].originalDate, '2026-12-04'); assert(read(f, data).sourceConflictKeys.includes(row.key));
  assert.deepEqual(data.spaces[f.actorId].recurrenceExecution, records); assert.deepEqual(data.spaces[f.actorId].text, beforeText); assert.deepEqual(data.public, f.data.public);
});

for (const scope of ['whole_series', 'future_series'] as const) test(`PCS actual imported owner accepts ${scope} through the shared plan transaction`, () => {
  const f = imported(), source = read(f).rows[scope === 'whole_series' ? 0 : 1].identity;
  const prepared = prepareProgramRecurrencePlan(f.data, { actorId: f.actorId, flowRef: f.flowRef, sourceIdentity: source, ownerId: `actual-${scope}`, localToday: today, now: at }); assert(prepared.ok);
  const owner = prepared.value.owner, target = resolveProgramRecurrencePlanTarget(owner, { originalDate: source.originalDate }); assert(target.ok);
  const preview = previewProgramRecurrencePlan(owner, { actorId: f.actorId, expected: programClone(owner), currentSource: source,
    operation: { scope, targetDate: scope === 'whole_series' ? '2026-12-03' : '2026-12-05', target: target.value, sourceCutover: source, at } }); assert(preview.ok);
  const result = success(applyProgramRecurrencePlanTransition(f.data, { actorId: f.actorId, expectedSpace: prepared.value.expectedSpace, expectedOwner: null, preview: preview.value, localToday: today }));
  assert(validateProgramData(result.data)); assert.deepEqual(result.data.public, f.data.public);
  const period = readProgramOccurrencePeriod(result.data, { actorId: f.actorId, flowRef: f.flowRef, localToday: today, from: today, to: '2027-01-01' }); assert(period.ok);
  assert(period.rows.some(row => row.personalPlan)); assert.equal(new Set(period.rows.map(row => row.key)).size, period.rows.length);
  assert.equal(period.rows.filter(row => row.originalDate === today).length, scope === 'whole_series' ? 0 : 1);
});

test('PCS explicit start is private, reversible to pending, preserves old completion and never fabricates a new run', () => {
  const f = imported();
  let data = success(setProgramCopySeriesStart(f.data, { ...base(f.data, 'start'), copyId: f.copy.id, itemId: 'pending-series', start: today })).data;
  const row = read(f, data).rows.find(row => row.itemId === 'pending-series')!; assert(row); assert.equal(read(f, data).pendingStarts?.length, 0);
  data = success(updateProgramOccurrenceExecution(data, { actorId: f.actorId, flowRef: f.flowRef, localToday: today, identity: row.identity, expected: null,
    changes: { completion: { status: 'completed', completedAt: at } } })).data;
  const records = programClone(data.spaces[f.actorId].recurrenceExecution), reset = success(setProgramCopySeriesStart(data, { ...base(data, 'pending'), copyId: f.copy.id, itemId: 'pending-series', start: null }));
  assert.equal(read(f, reset.data).rows.length, 8); assert.equal(read(f, reset.data).pendingStarts?.length, 1);
  assert.deepEqual(reset.data.spaces[f.actorId].recurrenceExecution, records); assert(read(f, reset.data).sourceConflictKeys.includes(row.key));
  assert.equal(readProgramOccurrenceRecovery(reset.data, { actorId: f.actorId, localToday: today, flowRefs: [f.flowRef] }).length, 1);
  const restored = success(setProgramCopySeriesStart(reset.data, { ...base(reset.data, 'restore-start'), copyId: f.copy.id, itemId: 'pending-series', start: today }));
  assert.equal(read(f, restored.data).rows.find(r => r.key === row.key)?.completion, 'completed');
  assert.deepEqual(restored.data.public, f.data.public); assert.deepEqual(restored.data.spaces[f.actorId].recurrenceExecution, records);
});

test('PCS two documents reference the same series and removing one reference preserves records and source', () => {
  const f = imported(), linked = success(linkProgramCopySeries(f.data, { ...base(f.data, 'link-b'), copyId: f.copy.id, itemId: 'fixed-series', documentId: f.docB }));
  const space = linked.data.spaces[f.actorId], metadata = programSeriesMetadata(space).find(item => item.itemId === 'fixed-series')!;
  assert(programSeriesVisibleInDocument(space, metadata, f.docA)); assert(programSeriesVisibleInDocument(space, metadata, f.docB));
  assert.equal(programSeriesMetadata(space).filter(item => item.itemId === 'fixed-series').length, 1); assert.equal(read(f, linked.data).rows.length, 8);
  const same = success(linkProgramCopySeries(linked.data, { ...base(linked.data, 'link-b-again'), copyId: f.copy.id, itemId: 'fixed-series', documentId: f.docB })); assert(!same.changed);
  const reference = space.copies[0].recurrence!.references!.find(ref => ref.documentId === f.docB)!;
  const removed = success(unlinkProgramCopySeries(linked.data, { ...base(linked.data, 'unlink-b'), copyId: f.copy.id, documentId: f.docB, lineId: reference.lineId }));
  assert(!programSeriesVisibleInDocument(removed.data.spaces[f.actorId], metadata, f.docB)); assert(programSeriesVisibleInDocument(removed.data.spaces[f.actorId], metadata, f.docA));
  assert.equal(M.raw(M.getDocument(removed.data.spaces[f.actorId].text, f.docB)), 'PRIVATE-NOTE'); assert.deepEqual(read(f, removed.data).rows, read(f).rows);
});

test('PCS import retries and identical starts are noops while changed reimport starts require an explicit operation', () => {
  const f = imported(), started = success(setProgramCopySeriesStart(f.data, { ...base(f.data, 'start'), copyId: f.copy.id, itemId: 'pending-series', start: today }));
  const same = success(setProgramCopySeriesStart(started.data, { ...base(started.data, 'same'), copyId: f.copy.id, itemId: 'pending-series', start: today })); assert(!same.changed);
  const input = { ...base(started.data, 'import-again'), versionId: 'test-version', itemIds: ['pending-series'], anchor: null, recurrenceStarts: { 'pending-series': '2026-12-03' } };
  const conflict = importProgramPublicVersion(started.data, input); assert(!conflict.ok && conflict.reason === 'conflict'); assert.equal(conflict.data, started.data);
  const retry = success(importProgramPublicVersion(f.data, { ...base(f.data, 'import'), versionId: 'test-version', itemIds: ['fixed-series', 'pending-series', 'ordinary'], anchor: null, targetDocumentId: f.docA })); assert(!retry.changed);
});

test('PCS corrupt indices/references/checkbox metadata fail closed and ordinary notes remain editable', () => {
  const f = imported(), valid = f.data.spaces[f.actorId], before = JSON.stringify(f.data);
  const invalid = [
    (s: typeof valid) => { s.copies[0].recurrence!.itemIds.push('foreign'); },
    (s: typeof valid) => { s.copies[0].recurrence!.starts = { 'fixed-series': today }; },
    (s: typeof valid) => { s.copies[0].recurrence!.references![0].documentId = f.docB; },
    (s: typeof valid) => { s.copies[0].recurrence!.references!.push(programClone(s.copies[0].recurrence!.references![0])); },
    (s: typeof valid) => { M.getDocument(s.text, f.copy.documentId)!.lines.find(line => line.id === f.copy.itemLines['fixed-series'])!.text = '- [ ] 반복'; },
    (s: typeof valid) => { M.getDocument(s.text, f.docA)!.lines.find(line => line.id === s.copies[0].recurrence!.references![0].lineId)!.text = '- [ ] 참조'; },
  ];
  for (const change of invalid) { const next = programClone(f.data); change(next.spaces[f.actorId]); assert.equal(validateProgramData(next), false); }
  const note = programClone(valid.text); M.getDocument(note, f.docB)!.lines[0].text = '개인 메모 수정'; assert(programPreservesSeriesMetadata(valid, note));
  const edit = programClone(valid.text); M.getDocument(edit, f.docA)!.lines.find(line => line.id === valid.copies[0].recurrence!.references![0].lineId)!.text = '틀린 원본'; assert(!programPreservesSeriesMetadata(valid, edit));
  assert.equal(JSON.stringify(f.data), before);
});

test('PCS archived target, stale space, wrong item and other actor fail without personal changes', () => {
  const f = imported(), archived = programClone(f.data); archived.spaces[f.actorId].archivedDocumentIds.push(f.docB);
  const invalid = [
    linkProgramCopySeries(archived, { ...base(archived, 'archived'), copyId: f.copy.id, itemId: 'fixed-series', documentId: f.docB }),
    linkProgramCopySeries(f.data, { ...base(f.data, 'ordinary'), copyId: f.copy.id, itemId: 'ordinary', documentId: f.docB }),
    setProgramCopySeriesStart(f.data, { ...base(f.data, 'fixed-start'), copyId: f.copy.id, itemId: 'fixed-series', start: today }),
    setProgramCopySeriesStart(f.data, { ...base(f.data, 'bad-date'), copyId: f.copy.id, itemId: 'pending-series', start: '2026-02-30' }),
    setProgramCopySeriesStart(f.data, { ...base(f.data, 'stale'), expectedSpace: fixture().data.spaces[f.actorId], copyId: f.copy.id, itemId: 'pending-series', start: today }),
    setProgramCopySeriesStart(f.data, { ...base(f.data, 'actor'), actorId: 'creator-minji', copyId: f.copy.id, itemId: 'pending-series', start: today }),
  ];
  assert(invalid.every(result => !result.ok));
});

test('PCS inactive canonical copy cannot add a new active document reference', () => {
  const f = imported(), data = programClone(f.data); data.spaces[f.actorId].archivedDocumentIds.push(f.copy.documentId);
  const before = JSON.stringify(data), result = linkProgramCopySeries(data, { ...base(data, 'inactive-source'), copyId: f.copy.id, itemId: 'fixed-series', documentId: f.docB });
  assert(!result.ok); assert.equal(JSON.stringify(data), before);
});

test('PCS metadata proposal acceptance appends a recurring version without updating any existing private copy', () => {
  const f = imported(), proposed = success(createProgramProposal(f.data, { actorId: f.actorId, requestId: 'description-proposal', flowId: f.copy.flowId, baseVersionId: 'test-version',
    itemId: 'fixed-series', reason: '문구 검토', patch: { description: '검토할 설명' } }, at));
  const before = JSON.stringify(proposed.data), result = reviewProgramProposal(proposed.data, { actorId: 'creator-minji', proposalId: proposed.result, decision: 'accept', expectedVersionId: 'test-version' }, at);
  assert(result.ok); assert.equal(JSON.stringify(proposed.data), before);
  assert.deepEqual(result.data.spaces, proposed.data.spaces);
  assert.deepEqual(result.data.public.versions.slice(0, -1), proposed.data.public.versions);
  assert.equal(result.data.public.versions.at(-1)!.items[0].description, '검토할 설명');
  assert.deepEqual(result.data.public.versions.at(-1)!.items.map(item => item.schedule), proposed.data.public.versions[0].items.map(item => item.schedule));
  const held = reviewProgramProposal(proposed.data, { actorId: 'creator-minji', proposalId: proposed.result, decision: 'hold', expectedVersionId: 'test-version' }, at); assert(held.ok);
});

test('PCS real controller persists import/start/occurrence/Undo/reload only in the PoC namespace', async () => {
  const f = fixture(), protectedValue = '{ "exact": "보존\\r\\n" }', values = new Map([['flow:operating', protectedValue]]), writes: string[] = [];
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { writes.push(key); values.set(key, value); }, removeItem: (key: string) => { writes.push(key); values.delete(key); }, clear: () => { throw Error('clear forbidden'); } };
  const exclusive = async <T,>(work: () => T | Promise<T>) => work(), controller = createProgramController({ initialData: f.data, storage, exclusive }); assert(controller.ok);
  assert.equal(writes.length, 0);
  const result = await controller.mutate('혼합 가져오기', data => importProgramPublicVersion(data, { ...base(data, 'import-store'), versionId: 'test-version', itemIds: ['fixed-series', 'pending-series', 'ordinary'], anchor: null, targetDocumentId: f.docA }), { actorId: f.actorId }); assert(result.ok);
  const copy = controller.snapshot().envelope.data.spaces[f.actorId].copies[0], flowRef = programPublicCopyExecutionRef(copy.id);
  assert((await controller.mutate('시작', data => setProgramCopySeriesStart(data, { ...base(data, 'start-store'), copyId: copy.id, itemId: 'pending-series', start: today }), { actorId: f.actorId })).ok);
  const beforeCompletion = controller.snapshot().envelope.data, rows = readProgramExecutionOccurrences(beforeCompletion, { actorId: f.actorId, flowRef, localToday: today }); assert(rows.ok);
  const row = rows.rows.find(row => row.itemId === 'pending-series')!;
  assert((await controller.mutate('회차 완료', data => updateProgramOccurrenceExecution(data, { actorId: f.actorId, flowRef, localToday: today, identity: row.identity, expected: null, changes: { completion: { status: 'completed', completedAt: at }, schedule: { mode: 'fixed_date', date: '2026-12-10' } } }), { actorId: f.actorId })).ok);
  const done = controller.snapshot(); assert((await controller.undo(f.actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data.spaces[f.actorId], beforeCompletion.spaces[f.actorId]);
  assert((await controller.redo(f.actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data.spaces[f.actorId], done.envelope.data.spaces[f.actorId]);
  const latest = controller.snapshot().envelope.data, out = inspectPrivateOutputOccurrences(latest, { actorId: f.actorId, documentId: f.docA, occurrenceRange: { from: today, to: '2026-12-10', includeUndated: true } }, new Set()); assert(out.ok);
  const selected = out.rows.find(item => item.returnTarget && JSON.parse(item.returnTarget.executionKey).includes('pending-series') && item.date === '2026-12-10'); assert(selected?.returnTarget);
  const url = programOutputReturnUrl('http://127.0.0.1:3641/my?personalWorkspacePoc=v1', f.actorId, selected.returnTarget); assert(url);
  const target = readProgramOutputReturnTarget(latest, parseProgramLocation(new URL(url).hash), today); assert(target.kind === 'occurrence'); assert.equal(target.row.key, row.key); assert.equal(target.row.completion, 'completed');
  const loaded = loadProgramStore(storage, validateProgramEnvelope); assert.equal(loaded.kind, 'ready');
  const reloaded = createProgramController({ initialData: f.data, storage, exclusive }); assert(reloaded.ok); assert.deepEqual(reloaded.snapshot(), controller.snapshot());
  assert.deepEqual(latest.public, f.data.public); assert.equal(values.get('flow:operating'), protectedValue); assert(writes.length > 0 && writes.every(key => key === PROGRAM_STATE_KEY));
});

test('PCS quota and foreign revision reject import with zero committed changes; retry restores only successful state', async () => {
  const f = fixture(), values = new Map<string, string>(), writes: string[] = []; let quota = true;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { if (quota) throw Error('quota'); writes.push(key); values.set(key, value); }, removeItem: (key: string) => { writes.push(key); values.delete(key); } };
  const controller = createProgramController({ initialData: f.data, storage, exclusive: async work => work() }); assert(controller.ok);
  const operation = (data: ProgramData) => importProgramPublicVersion(data, { ...base(data, 'safe-import'), versionId: 'test-version', itemIds: ['fixed-series'], anchor: null });
  assert(!(await controller.mutate('실패', operation, { actorId: f.actorId })).ok); assert.equal(controller.snapshot().envelope.revision, 0); assert.equal(writes.length, 0);
  quota = false; assert((await controller.mutate('재시도', operation, { actorId: f.actorId })).ok); const count = writes.length;
  assert((await controller.mutate('동일 요청', operation, { actorId: f.actorId })).ok); assert.equal(writes.length, count);
  const foreign = createProgramEnvelope(controller.snapshot().envelope.data); foreign.revision = controller.snapshot().envelope.revision + 1;
  values.set(PROGRAM_STATE_KEY, JSON.stringify(foreign)); assert(!(await controller.mutate('다른 탭', operation, { actorId: f.actorId })).ok); assert.equal(writes.length, count);
});
