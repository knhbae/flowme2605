import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramData, validateProgramData } from './program-data';
import { programClone, PROGRAM_STATE_KEY } from './contract';
import { importProgramPublicVersion } from './private-space';
import { programCopyProposalContextMatches, submitProgramCopyProposal } from './copy-proposal';
import { programRecurringScheduleFromDraft } from './public-recurrence-contract';
import { createProgramController } from './controller';
const now = '2026-09-14T00:00:00.000Z';
function fixture() {
  const data = createProgramData(), schedule = programRecurringScheduleFromDraft({ version: 1, raw: '매주 화, 목', end: '8회', startKind: 'fixed', startValue: '2026-12-01', time: '07:00', timeZone: 'Asia/Seoul' }); assert(schedule);
  data.public.flows.push({ id: 'p-flow', ownerId: 'creator-minji', currentVersionId: 'p-v1', category: '생활', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'p-v1', flowId: 'p-flow', number: 1, parentVersionId: null, title: '가상 반복', summary: '',
    items: [{ id: 'p-item', title: '같은 이름', description: '설명', completionCriteria: '', sourceUrl: null, schedule, subchecks: [] }],
    source: { kind: 'simulated-example', label: '계약 검증 예시', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: now });
  const imported = importProgramPublicVersion(data, { actorId: 'local-user', expectedSpace: data.spaces['local-user'], requestId: 'p-import', versionId: 'p-v1', itemIds: ['p-item'], anchor: null }); assert(imported.ok);
  const context = { actorId: 'local-user', copyId: imported.result, flowId: 'p-flow', baseVersionId: 'p-v1', item: programClone(data.public.versions[0].items[0]) };
  return { data: imported.data, input: { context, requestId: 'p-request', reason: '가상 제안', patch: { schedule: { ...programClone(schedule), time: '09:00' } } } };
}
test('CPI01 pinned recurring suggestion changes only proposal and receipt, never private execution or original versions', () => {
  const { data, input } = fixture(), before = JSON.stringify(data), result = submitProgramCopyProposal(data, input, now); assert(result.ok); assert(validateProgramData(result.data));
  assert.deepEqual(result.data.spaces, data.spaces); assert.deepEqual(result.data.public.versions, data.public.versions); assert.deepEqual(result.data.public.flows, data.public.flows);
  assert.equal(result.data.public.proposals.length, 1); assert.equal(result.data.public.proposals[0].baseVersionId, input.context.baseVersionId);
  assert.deepEqual(result.data.public.proposals[0].patch, input.patch); assert.equal(JSON.stringify(data), before);
});
test('CPI02 exact actor copy flow version and item are required; same-title replacements or changed pinned source are rejected', () => {
  for (const change of ['actor', 'copy', 'flow', 'version', 'item', 'duplicate', 'changed', 'archived']) {
    const { data, input } = fixture();
    if (change === 'actor') data.activeActorId = 'creator-minji';
    if (change === 'copy') data.spaces['local-user'].copies[0].id = 'another-copy';
    if (change === 'flow') input.context.flowId = 'another-flow';
    if (change === 'version') input.context.baseVersionId = 'another-version';
    if (change === 'item') data.public.versions[0].items[0].id = 'same-title-replacement';
    if (change === 'duplicate') data.public.versions[0].items.push(programClone(data.public.versions[0].items[0]));
    if (change === 'changed') data.public.versions[0].items[0].description = 'changed pinned item';
    if (change === 'archived') data.public.flows[0].archived = true;
    const before = JSON.stringify(data); assert.equal(programCopyProposalContextMatches(data, input.context), false, change);
    const result = submitProgramCopyProposal(data, input, now); assert(!result.ok, change); assert.equal(JSON.stringify(data), before);
  }
});
test('CPI03 an unrelated newer version does not retarget a proposal pinned to the old version', () => {
  const { data, input } = fixture(), version = programClone(data.public.versions[0]);
  version.id = 'p-v2'; version.number = 2; version.parentVersionId = 'p-v1'; version.items[0].description = 'new description';
  data.public.versions.push(version); data.public.flows[0].currentVersionId = version.id;
  const result = submitProgramCopyProposal(data, input, now); assert(result.ok);
  assert.equal(result.data.public.proposals[0].baseVersionId, 'p-v1'); assert.deepEqual(result.data.public.versions, data.public.versions);
});
test('CPI04 unchanged, malformed or private-field recurring patches do not create a proposal', () => {
  for (const change of ['same', 'invalid-time', 'private', 'rule', 'date', 'reason']) {
    const { data, input } = fixture();
    if (change === 'same') input.patch.schedule = programClone(input.context.item.schedule) as typeof input.patch.schedule;
    if (change === 'invalid-time') input.patch.schedule.time = '29:00';
    if (change === 'private') Object.assign(input.patch.schedule, { privateMemo: 'secret' });
    if (change === 'rule') input.patch.schedule.rule.interval = 0;
    if (change === 'date') input.patch.schedule.start = { kind: 'fixed', date: '2026-02-30' };
    if (change === 'reason') input.reason = '';
    const before = JSON.stringify(data), result = submitProgramCopyProposal(data, input, now); assert(!result.ok, change); assert.equal(JSON.stringify(data), before);
  }
});
test('CPI05 duplicate request replay is idempotent and changed content cannot reuse its accepted receipt', () => {
  const { data, input } = fixture(), result = submitProgramCopyProposal(data, input, now); assert(result.ok);
  const replay = submitProgramCopyProposal(result.data, input, now); assert(replay.ok); assert.equal(replay.changed, false); assert.equal(replay.result, result.result);
  const changed = submitProgramCopyProposal(result.data, { ...input, reason: 'different request contents' }, now); assert(!changed.ok); assert.equal(changed.reason, 'duplicate-request');
});
test('CPI06 actual storage failure preserves exact input, retry commits once, reload and replay preserve all protected bytes', async () => {
  const { data, input } = fixture(), inputBefore = JSON.stringify(input), sentinel = '  {"keep":"원문\\n"}  ', bytes = new Map([['flow:operating-example', sentinel]]);
  const calls: { key: string; method: string }[] = []; let fail = true;
  const storage = { getItem: (key: string) => bytes.get(key) ?? null, setItem: (key: string, value: string) => {
    calls.push({ key, method: 'set' }); assert.equal(key, PROGRAM_STATE_KEY); if (fail) throw new DOMException('full', 'QuotaExceededError'); bytes.set(key, value);
  }, removeItem: (key: string) => { calls.push({ key, method: 'remove' }); assert.equal(key, PROGRAM_STATE_KEY); bytes.delete(key); }, clear: () => assert.fail('clear forbidden') };
  const controller = createProgramController({ storage, initialData: data, exclusive: work => Promise.resolve(work()) }); assert(controller.ok);
  const send = () => controller.mutate('제안', current => submitProgramCopyProposal(current, input, now), { actorId: 'local-user' });
  assert(!(await send()).ok); assert.equal(controller.snapshot().raw, null); assert.equal(JSON.stringify(input), inputBefore); assert.equal(bytes.get('flow:operating-example'), sentinel);
  fail = false; assert((await send()).ok); const after = bytes.get(PROGRAM_STATE_KEY), count = calls.length;
  const replay = await send(); assert(replay.ok); assert.equal(calls.length, count); assert.equal(bytes.get(PROGRAM_STATE_KEY), after);
  const reloaded = createProgramController({ storage, initialData: data, exclusive: work => Promise.resolve(work()) }); assert(reloaded.ok);
  assert.equal(reloaded.snapshot().envelope.data.public.proposals.length, 1); assert.deepEqual(reloaded.snapshot().envelope.data.spaces, data.spaces);
  assert.equal(bytes.get('flow:operating-example'), sentinel); assert(calls.every(call => call.key === PROGRAM_STATE_KEY));
});
