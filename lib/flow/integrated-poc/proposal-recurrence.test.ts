import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramData, validateProgramData } from './program-data';
import { PROGRAM_STATE_KEY, programClone, type ProgramData, type ProgramProposal } from './contract';
import { compareProgramProposal, programProposalAcceptanceBlock, programProposalComparisonValue } from './proposal-comparison';
import { programRecurringScheduleFromDraft, type ProgramPublicRecurringScheduleV1 } from './public-recurrence-contract';
import { createProgramProposal, prepareProgramProposalVersion, publishProgramFlow, reviewProgramProposal } from './publication';
import { createProgramController } from './controller';

// Typed repository fixtures exercise review consumers, not a user publication.
const now = '2026-09-14T00:00:00.000Z';
function schedule(raw = '매주 화, 목', end = '8회'): ProgramPublicRecurringScheduleV1 {
  const result = programRecurringScheduleFromDraft({ version: 1, raw, end, startKind: 'fixed', startValue: '2026-12-01', time: '07:00', timeZone: 'Asia/Seoul' });
  assert(result); return result;
}
function fixture() {
  const data = createProgramData();
  data.public.flows.push({ id: 'recurring-review-flow', ownerId: 'local-user', currentVersionId: 'recurring-review-v2', category: '생활', situations: [], derivedFrom: null, archived: false });
  const first = { id: 'recurring-review-v1', flowId: 'recurring-review-flow', number: 1, parentVersionId: null,
    title: '반복 검토 가상 자료', summary: '', items: [{ id: 'exact-recurring-item', title: '원문 항목', description: '원문 설명', completionCriteria: '', sourceUrl: null,
      schedule: schedule(), subchecks: [] }], source: { kind: 'simulated-example' as const, label: '반복 검토 계약 fixture', url: null, checkedAt: null }, createdBy: 'local-user', createdAt: now };
  data.public.versions.push(first, { ...programClone(first), id: 'recurring-review-v2', number: 2, parentVersionId: first.id });
  const proposal: ProgramProposal = { id: 'recurring-review-proposal', authorId: 'participant-jihun', flowId: first.flowId,
    baseVersionId: first.id, itemId: first.items[0].id, reason: '반복 규칙 보완', patch: { schedule: schedule('매주 수, 금', '6회') }, status: 'submitted',
    reviewNote: '', reviewedBy: null, resultVersionId: null, createdAt: now, updatedAt: now };
  data.public.proposals.push(proposal); assert(validateProgramData(data));
  return { data, proposal };
}
const row = (data: ProgramData, proposal: ProgramProposal) => compareProgramProposal(data, proposal).rows.find(value => value.field === 'schedule')!;

test('PRP01 an unchanged recurring base is proposed, not a false conflict', () => {
  const { data, proposal } = fixture(), before = JSON.stringify(data);
  assert.equal(row(data, proposal).state, 'proposed');
  assert.equal(JSON.stringify(data), before);
});

test('PRP02 structurally reordered schedule keys have the same review meaning', () => {
  const { data, proposal } = fixture(), old = data.public.versions[0].items[0].schedule as ProgramPublicRecurringScheduleV1;
  data.public.versions[1].items[0].schedule = { timeZone: old.timeZone, start: programClone(old.start), rule: programClone(old.rule), time: old.time, version: 1, kind: 'recurring' };
  assert.equal(row(data, proposal).state, 'proposed');
  proposal.patch.schedule = programClone(old);
  assert.equal(row(data, proposal).state, 'unchanged');
});

test('PRP03 each source schedule change stays a conflict, even if latest equals the proposal', () => {
  const changes: ((value: ProgramPublicRecurringScheduleV1) => void)[] = [
    value => { value.rule.interval = 2; }, value => { value.rule.weekdays = ['MO']; },
    value => { value.rule.end = { mode: 'count', count: 5 }; }, value => { value.rule.end = { mode: 'until', date: '2027-01-01' }; },
    value => { value.start = { kind: 'undated' }; }, value => { value.start = { kind: 'relative', days: -3 }; },
    value => { value.time = '09:00'; }, value => { value.timeZone = 'UTC'; },
  ];
  for (const change of changes) {
    const { data, proposal } = fixture(); change(data.public.versions[1].items[0].schedule as ProgramPublicRecurringScheduleV1);
    assert(validateProgramData(data)); assert.equal(row(data, proposal).state, 'conflict');
    proposal.patch.schedule = programClone(data.public.versions[1].items[0].schedule);
    assert.equal(row(data, proposal).state, 'conflict');
  }
});

test('PRP04 recurrence labels preserve start, rule, end, time and timezone instead of saying undated', () => {
  const value = schedule(), label = programProposalComparisonValue(value);
  for (const fact of ['매주 화, 목', '8회', '2026-12-01 시작', '07:00', 'Asia/Seoul']) assert(label.includes(fact), fact);
  assert.notEqual(label, '날짜 미정');
  assert(programProposalComparisonValue({ ...value, start: { kind: 'undated' } }).includes('시작일 미정'));
  assert(programProposalComparisonValue({ ...value, start: { kind: 'relative', days: -3 } }).includes('기준일 -3일 시작'));
});

test('PRP05 changed monthly recurrence never loses its day-of-month or open ending', () => {
  const { data, proposal } = fixture();
  data.public.versions[0].items[0].schedule = schedule('매월 31일', '');
  data.public.versions[1].items[0].schedule = programClone(data.public.versions[0].items[0].schedule);
  proposal.patch.schedule = schedule('2개월마다 15일', '4회');
  assert.equal(row(data, proposal).state, 'proposed');
  const comparison = compareProgramProposal(data, proposal);
  assert(programProposalComparisonValue(comparison.rows[3].base).includes('매월 31일 · 종료 미정'));
  assert(programProposalComparisonValue(comparison.rows[3].proposal).includes('2개월마다 15일 · 4회'));
});

test('PRP06 removed or foreign recurring identities remain unavailable instead of guessed replacements', () => {
  for (const corrupt of ['removed', 'duplicate-item', 'foreign-version'] as const) {
    const { data, proposal } = fixture(), latest = data.public.versions[1];
    if (corrupt === 'removed') latest.items[0].id = 'same-title-different-item';
    if (corrupt === 'duplicate-item') latest.items.push(programClone(latest.items[0]));
    if (corrupt === 'foreign-version') latest.flowId = 'foreign-flow';
    const before = JSON.stringify(data), comparison = compareProgramProposal(data, proposal);
    assert(comparison.issue); assert(comparison.rows.every(value => value.state === 'unavailable')); assert.equal(JSON.stringify(data), before);
  }
});

test('PRP07 preparation retains latest unrelated fields and does not create or mutate a version', () => {
  const { data, proposal } = fixture(); data.public.versions[1].items[0].description = '먼저 바뀐 최신 설명';
  data.public.versions[1].summary = '최신 요약';
  const before = JSON.stringify(data), prepared = prepareProgramProposalVersion(data, proposal.id); assert(prepared.ok);
  assert.deepEqual(Object.keys(prepared.candidate).sort(), ['flowId', 'items', 'number', 'parentVersionId', 'source', 'summary', 'title']);
  assert.equal(prepared.candidate.parentVersionId, 'recurring-review-v2'); assert.equal(prepared.candidate.number, 3);
  assert.equal(prepared.candidate.items[0].description, '먼저 바뀐 최신 설명'); assert.equal(prepared.candidate.summary, '최신 요약');
  assert.deepEqual(prepared.candidate.items[0].schedule, proposal.patch.schedule);
  assert.equal(prepared.candidate.items[0].id, proposal.itemId); assert.deepEqual(prepared.candidate.source, data.public.versions[1].source);
  assert.equal(JSON.stringify(data), before);
  prepared.candidate.items[0].title = '화면에서 바꾼 후보';
  (prepared.candidate.items[0].schedule as ProgramPublicRecurringScheduleV1).rule.weekdays!.push('SU');
  prepared.candidate.source.label = '화면 편집'; assert.equal(JSON.stringify(data), before, 'candidate has no aliases into source or patch');
});

test('PRP08 preparation uses the same conflict rule as the review comparison', () => {
  const { data, proposal } = fixture(); data.public.versions[1].items[0].schedule = programClone(proposal.patch.schedule!);
  assert.equal(programProposalAcceptanceBlock(compareProgramProposal(data, proposal)), 'conflict');
  assert.deepEqual(prepareProgramProposalVersion(data, proposal.id), { ok: false, reason: 'conflict' });
});

test('PRP09 unsupported or private fields cannot enter a prepared public version', () => {
  for (const corrupt of ['private-field', 'unknown-rule', 'malformed-start', 'invalid-time', 'invalid-zone', 'foreign-version', 'duplicate-item'] as const) {
    const { data, proposal } = fixture(), patch = proposal.patch.schedule as ProgramPublicRecurringScheduleV1;
    if (corrupt === 'private-field') Object.assign(patch, { privateMemo: 'PRIVATE-NOTE' });
    if (corrupt === 'unknown-rule') Object.assign(patch.rule, { semantics: 'rrule' });
    if (corrupt === 'malformed-start') patch.start = { kind: 'fixed', date: '2026-02-30' };
    if (corrupt === 'invalid-time') patch.time = '24:00';
    if (corrupt === 'invalid-zone') patch.timeZone = 'Unknown/Zone';
    if (corrupt === 'foreign-version') data.public.versions[1].flowId = 'foreign-flow';
    if (corrupt === 'duplicate-item') data.public.versions[1].items.push(programClone(data.public.versions[1].items[0]));
    const before = JSON.stringify(data); assert.deepEqual(prepareProgramProposalVersion(data, proposal.id), { ok: false, reason: 'invalid' }, corrupt);
    assert.equal(JSON.stringify(data), before);
  }
});

test('PRP10 unchanged supported recurring siblings remain intact in metadata-only acceptance', () => {
  const { data, proposal } = fixture(); proposal.patch = { description: '보완 설명' };
  assert.equal(programProposalAcceptanceBlock(compareProgramProposal(data, proposal)), null);
  for (const version of data.public.versions) {
    version.items.push({ ...programClone(version.items[0]), id: 'ordinary-item', schedule: { kind: 'undated' } });
  }
  proposal.itemId = 'ordinary-item'; assert(validateProgramData(data));
  assert.equal(programProposalAcceptanceBlock(compareProgramProposal(data, proposal)), null);
  const prepared = prepareProgramProposalVersion(data, proposal.id); assert(prepared.ok);
  assert.deepEqual(prepared.candidate.items[0], data.public.versions[1].items[0]);
  assert.equal(prepared.candidate.items[1].description, '보완 설명');
});

test('PRP11 recurring suggestions and acceptance append immutable versions without modifying private copies', () => {
  const { data, proposal } = fixture(), before = JSON.stringify(data), current = data.public.versions[1];
  assert(prepareProgramProposalVersion(data, proposal.id).ok);
  const create = createProgramProposal(data, { actorId: proposal.authorId, requestId: 'new-recurring-proposal', flowId: proposal.flowId,
    baseVersionId: proposal.baseVersionId, itemId: proposal.itemId, reason: proposal.reason, patch: proposal.patch }, now);
  assert(create.ok); assert.equal(create.data.public.proposals.length, data.public.proposals.length + 1);
  assert.deepEqual(create.data.public.versions, data.public.versions); assert.deepEqual(create.data.spaces, data.spaces);
  const publish = publishProgramFlow(data, { actorId: 'local-user', requestId: 'new-recurring-version', title: current.title, summary: current.summary,
    category: '생활', situations: [], items: current.items, source: current.source }, now);
  assert(publish.ok); assert.deepEqual(publish.data.spaces, data.spaces); assert.deepEqual(publish.data.public.versions.slice(0, -1), data.public.versions);
  const accepted = reviewProgramProposal(data, { actorId: 'local-user', proposalId: proposal.id, expectedVersionId: current.id, decision: 'accept' }, now);
  assert(accepted.ok); assert.equal(accepted.data.public.versions.at(-1)!.parentVersionId, current.id);
  assert.deepEqual(accepted.data.public.versions.at(-1)!.items[0].schedule, proposal.patch.schedule);
  assert.deepEqual(accepted.data.spaces, data.spaces); assert.deepEqual(accepted.data.public.versions.slice(0, -1), data.public.versions); assert.equal(JSON.stringify(data), before);
});

test('PRP12 actual controller rejects stale acceptance with zero writes, keeps hold/reject, and reloads the same proposal', async () => {
  const { data, proposal } = fixture(), protectedKey = 'flow:operating-sentinel';
  const bytes = new Map([[protectedKey, '  {"keep":true,"text":"원문\\n"}  ']]), calls: { kind: string; key?: string }[] = [];
  const storage = { getItem: (key: string) => bytes.get(key) ?? null,
    setItem: (key: string, raw: string) => { calls.push({ kind: 'set', key }); assert.equal(key, PROGRAM_STATE_KEY); bytes.set(key, raw); },
    removeItem: (key: string) => { calls.push({ kind: 'remove', key }); assert.equal(key, PROGRAM_STATE_KEY); bytes.delete(key); },
    clear: () => { calls.push({ kind: 'clear' }); assert.fail('clear forbidden'); } };
  const sentinel = bytes.get(protectedKey), controller = createProgramController({ storage, initialData: data, exclusive: work => Promise.resolve(work()) }); assert(controller.ok);
  const input = { actorId: 'local-user', proposalId: proposal.id, expectedVersionId: 'recurring-review-v2' };
  const rejected = await controller.mutate('지난 비교의 채택 거절', current => reviewProgramProposal(current, { ...input, expectedVersionId: 'recurring-review-v1', decision: 'accept' }, now), { actorId: 'local-user' });
  assert(!rejected.ok); assert.equal(rejected.reason, 'conflict'); assert.equal(calls.length, 0); assert.equal(controller.snapshot().raw, null);
  for (const actorId of ['participant-jihun', 'missing-actor']) {
    const denied = reviewProgramProposal(data, { ...input, actorId, decision: 'accept' }, now); assert(!denied.ok); assert.equal(denied.reason, 'forbidden');
  }
  const held = await controller.mutate('제안 보류', current => reviewProgramProposal(current, { ...input, decision: 'hold', note: '연결 후 다시 검토' }, now), { actorId: 'local-user' }); assert(held.ok);
  assert.equal(calls.length, 1); const raw = controller.snapshot().raw;
  const same = await controller.mutate('같은 보류', current => reviewProgramProposal(current, { ...input, decision: 'hold', note: '연결 후 다시 검토' }, now), { actorId: 'local-user' }); assert(same.ok); assert.equal(same.changed, false);
  assert.equal(calls.length, 1); assert.equal(controller.snapshot().raw, raw);
  const reload = createProgramController({ storage, initialData: createProgramData(), exclusive: work => Promise.resolve(work()) }); assert(reload.ok);
  assert.equal(reload.snapshot().envelope.data.public.proposals[0].status, 'held'); assert.equal(reload.snapshot().raw, raw);
  assert(prepareProgramProposalVersion(reload.snapshot().envelope.data, proposal.id).ok);
  const declined = await reload.mutate('반영하지 않기', current => reviewProgramProposal(current, { ...input, decision: 'reject' }, now), { actorId: 'local-user' }); assert(declined.ok);
  assert.equal(calls.length, 2); assert.deepEqual(reload.snapshot().envelope.data.public.versions, data.public.versions);
  assert.deepEqual(reload.snapshot().envelope.data.spaces, data.spaces); assert.equal(bytes.get(protectedKey), sentinel);
  assert(calls.every(call => call.kind === 'set' && call.key === PROGRAM_STATE_KEY));
});
