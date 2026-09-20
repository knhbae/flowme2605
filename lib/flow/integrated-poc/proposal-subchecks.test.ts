import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, PROGRAM_STATE_KEY, type ProgramData, type ProgramItemPatch } from './contract';
import { createProgramData, validateProgramData, validateProgramProposalChecks } from './program-data';
import { publishProgramFlow, reviewProgramProposal, prepareProgramProposalVersion } from './publication';
import { applyProgramCopyVersion, importProgramPublicVersion } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { programCopyProposalPreviousChecks, submitProgramCopyProposal } from './copy-proposal';
import { compareProgramProposal, programProposalComparisonValue } from './proposal-comparison';
import { createProgramController } from './controller';
import { programRecurringScheduleFromDraft } from './public-recurrence-contract';

const now = '2026-09-14T05:00:00.000Z';
const checks = [{ id: 'check-a', title: '같은 문구' }, { id: 'check-b', title: '같은 문구' }];
// Contract fixture through real transitions, not browser or human-publication evidence.
function fixture(recurring = false) {
  const schedule = recurring ? programRecurringScheduleFromDraft({ version: 1, raw: '매일', end: '3회', startKind: 'fixed', startValue: '2026-12-01', time: '', timeZone: '' })! : { kind: 'undated' as const };
  const first = publishProgramFlow(createProgramData(), { actorId: 'local-user', requestId: 'publish-initial', title: '가상 체크 자료', summary: '', category: '생활', situations: [],
    source: { kind: 'simulated-example', label: '계약 fixture', url: null, checkedAt: null }, items: [{ id: 'item', title: '확인', description: '', completionCriteria: '',
      sourceUrl: null, schedule, subchecks: checks }] }, now); assert(first.ok);
  const imported = importProgramPublicVersion(first.data, { actorId: 'local-user', requestId: 'import-fixture', expectedSpace: first.data.spaces['local-user'], versionId: first.result, itemIds: ['item'], anchor: null }); assert(imported.ok);
  return { data: imported.data, copyId: imported.result };
}
function input(data: ProgramData, copyId: string, patch: ProgramItemPatch, requestId = 'propose-checks') {
  const flow = data.public.flows[0], version = data.public.versions.find(v => v.id === flow.currentVersionId)!;
  return { context: { actorId: 'local-user', copyId, flowId: flow.id, baseVersionId: version.id, item: programClone(version.items[0]) }, requestId, reason: '가상 체크 변경', patch };
}
function accept(data: ProgramData, proposalId: string) {
  const r = reviewProgramProposal(data, { actorId: 'local-user', proposalId, decision: 'accept', expectedVersionId: data.public.flows[0].currentVersionId }, now); assert(r.ok); return r;
}
test('PSC01 check proposal and read-only comparison preserve private records and all public source versions', () => {
  const { data, copyId } = fixture(), before = JSON.stringify(data), patch = { subchecks: [{ ...checks[1], title: '새 문구' }, checks[0]] };
  const result = submitProgramCopyProposal(data, input(data, copyId, patch), now); assert(result.ok); assert(validateProgramData(result.data));
  assert.equal(JSON.stringify(data), before); assert.deepEqual(result.data.spaces, data.spaces); assert.deepEqual(result.data.public.versions, data.public.versions);
  const row = compareProgramProposal(result.data, result.data.public.proposals[0]).rows.find(row => row.field === 'subchecks')!;
  assert.equal(row.state, 'proposed'); assert.deepEqual(row.base, checks); assert.deepEqual(row.proposal, patch.subchecks);
  assert.equal(programProposalComparisonValue(row.proposal), '1. 새 문구\n2. 같은 문구'); assert.equal(programProposalComparisonValue([]), '하위 체크 없음');
});
test('PSC02 delete then explicitly restore the same ID through proposal, candidate and immutable publication', () => {
  let { data, copyId } = fixture(); const original = programClone(data.public.versions), spaces = programClone(data.spaces);
  const proposal = submitProgramCopyProposal(data, input(data, copyId, { subchecks: [checks[0]] }), now); assert(proposal.ok);
  const previewBefore = JSON.stringify(proposal.data), candidate = prepareProgramProposalVersion(proposal.data, proposal.result); assert(candidate.ok);
  assert.equal(JSON.stringify(proposal.data), previewBefore); assert.deepEqual(candidate.candidate.items[0].subchecks, [checks[0]]);
  data = accept(proposal.data, proposal.result).data;
  const restore = programCopyProposalPreviousChecks(data, input(data, copyId, {}).context).find(c => c.id === checks[1].id)!;
  assert.equal(restore.versionNumber, 1); assert.equal(restore.title, checks[1].title);
  const again = submitProgramCopyProposal(data, input(data, copyId, { subchecks: [checks[0], { id: restore.id, title: '수정해서 복원' }] }, 'restore-request'), now); assert(again.ok);
  data = accept(again.data, again.result).data;
  assert.equal(data.public.versions.length, 3); assert.equal(data.public.versions[2].items[0].subchecks[1].id, checks[1].id);
  assert.deepEqual(data.public.versions[0], original[0]); assert.deepEqual(data.spaces, spaces); assert(validateProgramData(data));
});
test('PSC03 changed upstream check or order conflicts rather than silently overwriting the latest version', () => {
  const { data, copyId } = fixture(); const pending = submitProgramCopyProposal(data, input(data, copyId, { subchecks: [] }), now); assert(pending.ok);
  const other = submitProgramCopyProposal(pending.data, input(pending.data, copyId, { subchecks: [...checks].reverse() }, 'other'), now); assert(other.ok);
  const changed = accept(other.data, other.result), snapshot = JSON.stringify(changed.data);
  assert.equal(compareProgramProposal(changed.data, changed.data.public.proposals[0]).rows.find(r => r.field === 'subchecks')!.state, 'conflict');
  assert.equal(prepareProgramProposalVersion(changed.data, pending.result).ok, false);
  const failed = reviewProgramProposal(changed.data, { actorId: 'local-user', proposalId: pending.result, decision: 'accept', expectedVersionId: changed.result }, now);
  assert(!failed.ok); assert.equal(JSON.stringify(changed.data), snapshot);
});
test('PSC04 malformed or private check fields are rejected at submit and stored-repository boundaries', () => {
  const cases: unknown[] = [null, {}, [{ id: 'a', title: '' }], [{ id: 'a', title: ' ' }], [{ id: 'a', title: 'a\nb' }],
    [{ id: 'a', title: 'a\rb' }], [{ id: 'a', title: 'x'.repeat(501) }], [checks[0], checks[0]], [{ id: '', title: 'a' }],
    [{ id: 'a', title: 'private', completed: true }], [{ id: 'a', title: 'private', note: 'SECRET' }], Array.from({ length: 501 }, (_, i) => ({ id: `c-${i}`, title: 'a' }))];
  for (const value of cases) {
    const { data, copyId } = fixture(), before = JSON.stringify(data);
    assert.equal(validateProgramProposalChecks(value), false);
    assert.equal(submitProgramCopyProposal(data, input(data, copyId, { subchecks: value } as ProgramItemPatch), now).ok, false);
    assert.equal(JSON.stringify(data), before);
    const valid = submitProgramCopyProposal(data, input(data, copyId, { subchecks: [] }), now); assert(valid.ok);
    valid.data.public.proposals[0].patch.subchecks = value as typeof checks; assert.equal(validateProgramData(valid.data), false);
  }
});
test('PSC05 history choices use exact flow/item/ID and never future versions or private text', () => {
  let { data, copyId } = fixture(); const context = input(data, copyId, {}).context;
  const proposal = submitProgramCopyProposal(data, input(data, copyId, { subchecks: [{ id: 'future', title: 'future' }] }), now); assert(proposal.ok); data = accept(proposal.data, proposal.result).data;
  const before = JSON.stringify(data), choices = programCopyProposalPreviousChecks(data, context);
  assert.deepEqual(choices.map(c => c.id), ['check-a', 'check-b']); assert.equal(choices.length, 2); assert.equal(JSON.stringify(data), before);
  assert.deepEqual(programCopyProposalPreviousChecks(data, { ...context, item: { ...context.item, id: 'foreign-item' } }), []);
  assert.deepEqual(programCopyProposalPreviousChecks(data, { ...context, flowId: 'foreign-flow' }), []);
  assert.deepEqual(programCopyProposalPreviousChecks(data, { ...context, actorId: 'creator-minji' }), []);
});
test('PSC06 unchanged content and exact replay have no extra mutation; ID replacement is an explicit different proposal', () => {
  const { data, copyId } = fixture(), before = JSON.stringify(data), same = submitProgramCopyProposal(data, input(data, copyId, { subchecks: checks }), now); assert(!same.ok); assert.equal(JSON.stringify(data), before);
  const value = input(data, copyId, { subchecks: checks.map(c => ({ ...c, id: `new-${c.id}` })) });
  const sent = submitProgramCopyProposal(data, value, now); assert(sent.ok); assert(sent.changed);
  const again = submitProgramCopyProposal(sent.data, value, now); assert(again.ok); assert.equal(again.changed, false);
  assert.equal(submitProgramCopyProposal(sent.data, { ...value, patch: { subchecks: [] } }, now).ok, false);
});
test('PSC07 storage error, exact retry, Undo/Redo and reload preserve a populated operating sentinel', async () => {
  const { data, copyId } = fixture(), sentinel = '{ "untouched": [1,2] }', bytes = new Map([['flow:operating', sentinel]]), calls: string[] = []; let fail = true;
  const storage = { get length() { return bytes.size; }, key: (n: number) => [...bytes.keys()][n] ?? null, getItem: (key: string) => bytes.get(key) ?? null,
    setItem: (key: string, value: string) => { calls.push(key); if (fail) throw new DOMException('full', 'QuotaExceededError'); bytes.set(key, value); },
    removeItem: (key: string) => { calls.push(`remove:${key}`); bytes.delete(key); }, clear: () => { calls.push('clear'); } };
  const controller = createProgramController({ storage, initialData: data, exclusive: work => Promise.resolve(work()) }); assert(controller.ok);
  const request = input(data, copyId, { subchecks: [] }), send = () => controller.mutate('체크 제안', current => submitProgramCopyProposal(current, request, now), { actorId: 'local-user' });
  assert(!(await send()).ok); assert.equal(controller.snapshot().raw, null); fail = false; assert((await send()).ok);
  const count = calls.length; assert((await send()).ok); assert.equal(calls.length, count);
  // Personal Undo cannot retract a submitted public proposal.
  assert((await controller.undo('local-user')).ok); assert.equal(controller.snapshot().envelope.data.public.proposals.length, 1);
  assert.deepEqual(controller.snapshot().envelope.data.spaces, data.spaces);
  assert((await controller.redo('local-user')).ok);
  const reload = createProgramController({ storage, initialData: data, exclusive: work => Promise.resolve(work()) }); assert(reload.ok);
  assert.equal(reload.snapshot().envelope.data.public.proposals.length, 1); assert.equal(bytes.get('flow:operating'), sentinel); assert(calls.every(key => key === PROGRAM_STATE_KEY));
});
for (const recurring of [false, true]) test(`PSC08 ${recurring ? 'series' : 'ordinary'} reordered checks preserve stable subtree IDs and private notes`, () => {
  const { data, copyId } = fixture(recurring), originalCopy = data.spaces['local-user'].copies[0], originalDoc = M.getDocument(data.spaces['local-user'].text, originalCopy.documentId)!;
  const firstId = originalCopy.subcheckLines.item[checks[0].id], index = originalDoc.lines.findIndex(l => l.id === firstId);
  originalDoc.lines.splice(index + 1, 0, { id: 'private-child-note', text: '    메모: 개인 기록을 유지' });
  assert(validateProgramData(data));
  const proposed = submitProgramCopyProposal(data, input(data, copyId, { subchecks: [...checks].reverse() }), now); assert(proposed.ok);
  const published = accept(proposed.data, proposed.result), copy = data.spaces['local-user'].copies[0];
  const applied = applyProgramCopyVersion(published.data, { actorId: 'local-user', copyId, requestId: 'apply-order', expectedSpace: published.data.spaces['local-user'],
    versionId: published.result, expectedBaseVersionId: copy.baseVersionId, itemIds: ['item'], fields: ['subchecks'] }); assert(applied.ok);
  const ids = checks.map(c => copy.subcheckLines.item[c.id]);
  const resultDoc = M.getDocument(applied.data.spaces['local-user'].text, copy.documentId)!;
  assert.deepEqual(resultDoc.lines.filter(l => ids.includes(l.id)).map(l => l.id), ids.reverse());
  assert.deepEqual(resultDoc.lines[resultDoc.lines.findIndex(l => l.id === firstId) + 1], { id: 'private-child-note', text: '    메모: 개인 기록을 유지' });
  assert.deepEqual(applied.data.public, published.data.public);
});
