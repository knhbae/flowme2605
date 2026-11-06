import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProgramData, ProgramPublicItem, ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { completeProgramTask, importProgramPublicVersion, recordProgramTaskProgress } from './private-space';
import { completeProgramRepeat } from './repeat-commands';
import { programImportRepeatChoice, programImportRepeats } from './public-repeat-import';
import { saveProgramParticipationDraft, submitProgramParticipation } from './participation-editor';
import { programReviewPublicRelationValid } from './review-return';
import { PROGRAM_TRIED_EMPTY, programFlowProgress, programFlowProgressText, programFlowReviews, programFlowsJustFinished, programPendingFinish, programTriedAdd, programTriedDone,
  programTriedDraft, programTriedShow, programWeekStart } from './flow-loop';
import { textWorkspaceModel as M } from './text-workspace';
import { createProgramEnvelope } from './program-data';
import { captureAlphaAccount } from './alpha-persistence/program-adapter';
import { createAlphaFakeServer } from './alpha-persistence/fake-server';
import { createAlphaSyncController } from './alpha-sync/controller';
import type { AlphaRepository } from './alpha-persistence/contract';

// 실행 고리 1안 (B-EXECUTION-LOOP.md, 11/6): B takes A's Flow, checks its tasks, and on the last check may leave
// ‘해 봤어요’ through the existing review path; A sees it under 내 Flow에 남은 후기.
const B = 'local-user', A = 'creator-minji', NOW = '2026-11-05T00:00:00.000Z', TODAY = '2026-11-05';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: B, requestId: `loop-${++request}`, expectedSpace: data.spaces[B] });
const item = (id: string, title: string, description = ''): ProgramPublicItem => ({ id, title, description, completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] });
const FLOWS: Record<string, { title: string; items: ProgramPublicItem[] }> = {
  mixed: { title: '첫 달 기록 습관', items: [item('start', '기록 공책 고르기'), item('review', '첫 주 돌아보기'), item('water', '물 마시기 @매일', '아침에 한 잔 마십니다.')] },
  exercise: { title: '근력·유산소 운동 반복하기', items: [item('strength', '근력 운동 하기 @매주 월 목'), item('walk', '빠르게 걷기 30분 @매주 월 화 수 목 금')] },
};
function catalog(owner = A): ProgramData {
  const data = createProgramData();
  for (const [id, flow] of Object.entries(FLOWS)) {
    data.public.flows.push({ id, ownerId: owner, currentVersionId: `${id}-v1`, category: '생활', situations: [], derivedFrom: null, archived: false });
    data.public.versions.push({ id: `${id}-v1`, flowId: id, number: 1, parentVersionId: null, title: flow.title, summary: '합성', items: flow.items,
      source: { kind: 'user-text', label: '합성', url: null, checkedAt: null }, createdBy: owner, createdAt: NOW });
  }
  assert(validateProgramData(data));
  return data;
}
function take(data: ProgramData, flowId: string): ProgramData {
  const version = data.public.versions.find(row => row.flowId === flowId)!;
  const choice = programImportRepeatChoice(programImportRepeats(data.spaces[B], version), { starts: {}, months: {} }, TODAY)!;
  return ok(importProgramPublicVersion(data, { ...base(data), versionId: version.id, itemIds: version.items.map(row => row.id), anchor: null, ...choice })).data;
}
const task = (data: ProgramData, title: string) => M.tasks(data.spaces[B].text).find(row => row.title === title)!;
const check = (data: ProgramData, title: string) => ok(completeProgramTask(data, { ...base(data), taskId: task(data, title).id, date: TODAY, done: true })).data;
const repeat = (data: ProgramData, title: string) => ok(completeProgramRepeat(data, { ...base(data), taskId: task(data, title).id, today: TODAY, expected: task(data, title).date! })).data;
const raw = (data: ProgramData) => [...data.spaces[B].text.documents, ...data.spaces[B].text.flows].map(doc => `${doc.id}\n${M.raw(doc)}`).join('\n\n');

test('내 진행 counts the copy\'s tasks by their checks and my repeat line by its days this week; a [50%] is not finished', () => {
  let data = take(catalog(), 'mixed');
  assert.deepEqual(programFlowProgress(data, B, 'mixed', TODAY), { tasks: 2, done: 0, repeats: 1, started: 0, week: 0, finished: false });
  assert.equal(programFlowProgressText(programFlowProgress(data, B, 'mixed', TODAY)!), '내 진행: 할 일 2개 중 0개 끝 · 반복 1줄, 이번 주 0번 체크');
  data = check(data, '기록 공책 고르기');
  data = ok(recordProgramTaskProgress(data, { ...base(data), taskId: task(data, '첫 주 돌아보기').id, date: TODAY, percent: 50 })).data;
  data = repeat(data, '물 마시기 @매일');
  assert.deepEqual(programFlowProgress(data, B, 'mixed', TODAY), { tasks: 2, done: 1, repeats: 1, started: 1, week: 1, finished: false });
  assert.equal(programFlowProgressText(programFlowProgress(data, B, 'mixed', TODAY)!), '내 진행: 할 일 2개 중 1개 끝 · 반복 1줄, 이번 주 1번 체크');
  assert.equal(programFlowProgress(data, B, 'mixed', '2026-11-09')!.week, 0, 'the next week starts again');
  assert.equal(programFlowProgress(data, B, 'exercise', TODAY), null, 'a Flow not taken has none');
  assert.deepEqual(['2026-11-02', '2026-11-05', '2026-11-08', '2026-11-09'].map(programWeekStart), ['2026-11-02', '2026-11-02', '2026-11-02', '2026-11-09']);
});

test('a repeat-only Flow: 반복 줄만, and a memo taken away leaves its line out', () => {
  let data = take(catalog(), 'exercise');
  assert.equal(programFlowProgressText(programFlowProgress(data, B, 'exercise', TODAY)!), '내 진행: 반복 2줄, 이번 주 0번 체크');
  const copy = data.spaces[B].copies.find(row => row.flowId === 'exercise')!, doc = M.getDocument(data.spaces[B].text, copy.documentId)!;
  const edited = M.editText(data.spaces[B].text, doc.id, M.raw(doc).replace(/\n {2}- 메모: ‘근력·유산소 운동 반복하기’에서[^\n]*(?=\n- \[ \] 빠르게)/, ''));
  const changed = { ...data, spaces: { ...data.spaces, [B]: { ...data.spaces[B], text: edited } } };
  assert.equal(programFlowProgress(changed, B, 'exercise', TODAY)!.repeats, 1);
});

test('the last check is the moment: once per crossing, by a check, never for a line taken away, my own or a taken-back Flow', () => {
  let data = take(catalog(), 'mixed');
  const first = check(data, '기록 공책 고르기');
  assert.deepEqual(programFlowsJustFinished(data, first, B, TODAY), [], 'one task left');
  const last = check(first, '첫 주 돌아보기');
  assert.deepEqual(programFlowsJustFinished(first, last, B, TODAY), [{ flowId: 'mixed', versionId: 'mixed-v1', title: '첫 달 기록 습관' }]);
  assert.deepEqual(programFlowsJustFinished(last, repeat(last, '물 마시기 @매일'), B, TODAY), [], 'already finished: the repeat line does not ask again');
  // The unfinished task's line taken away finishes nothing by a check.
  const removed = { ...first, spaces: { ...first.spaces, [B]: { ...first.spaces[B], text: M.removeTask(first.spaces[B].text, task(first, '첫 주 돌아보기').id) } } };
  assert(programFlowProgress(removed, B, 'mixed', TODAY)!.finished);
  assert.deepEqual(programFlowsJustFinished(first, removed, B, TODAY), []);
  // Repeat only: each line finished once.
  data = take(catalog(), 'exercise');
  const one = repeat(data, '근력 운동 하기 @매주 월 목');
  assert.deepEqual(programFlowsJustFinished(data, one, B, TODAY), []);
  assert.deepEqual(programFlowsJustFinished(one, repeat(one, '빠르게 걷기 30분 @매주 월 화 수 목 금'), B, TODAY).map(row => row.flowId), ['exercise']);
  const mine = check(take(catalog(B), 'mixed'), '기록 공책 고르기');
  assert.deepEqual(programFlowsJustFinished(mine, check(mine, '첫 주 돌아보기'), B, TODAY), [], 'my own Flow');
  const taken = check(take(catalog(), 'mixed'), '기록 공책 고르기'), back = check(taken, '첫 주 돌아보기');
  back.public.flows.find(flow => flow.id === 'mixed')!.archived = true;
  assert.deepEqual(programFlowsJustFinished(taken, back, B, TODAY), [], 'a Flow taken back');
});

test('남기기 → 공개: one experience post on the Flow, the author\'s 내 Flow에 남은 후기 lists it, and my writing is untouched', () => {
  let data = take(catalog(), 'mixed');
  data = check(data, '기록 공책 고르기');
  const before = raw(data);
  data = check(data, '첫 주 돌아보기');
  const after = raw(data);
  // Only the checked line changed in the RAW (criterion 3).
  assert.equal(after, before.replace('- [ ] 첫 주 돌아보기', '- [x] 첫 주 돌아보기'));
  const [finish] = programFlowsJustFinished(check(take(catalog(), 'mixed'), '기록 공책 고르기'), data, B, TODAY);
  const draft = programTriedDraft(finish);
  assert.deepEqual([draft.kind, draft.flowId, draft.versionId, draft.itemId, draft.title, draft.body], ['experience', 'mixed', 'mixed-v1', null, '해 봤어요 · 첫 달 기록 습관', '']);
  assert(programReviewPublicRelationValid(data, draft));
  const written = { ...draft, body: '두 주 해 봤어요.' };
  const saved = ok(saveProgramParticipationDraft(data, B, written, { expected: null })).data;
  const posted = ok(submitProgramParticipation(saved, B, written, NOW, { expected: written }));
  assert.equal(raw(posted.data), after, 'the review writes nothing into my documents');
  assert.deepEqual(posted.data.public.posts.map(post => [post.kind, post.flowId, post.authorId, post.title]), [['experience', 'mixed', B, '해 봤어요 · 첫 달 기록 습관']]);
  const reviews = programFlowReviews(posted.data, A);
  assert.deepEqual([reviews.posts.map(post => post.id), reviews.byFlow], [[posted.result], { mixed: 1 }]);
  assert.deepEqual(programFlowReviews(posted.data, B).posts, [], 'not the reviewer\'s');
  const own = posted.data.public.posts.map(post => ({ ...post, authorId: A })), gone = posted.data.public.posts.map(post => ({ ...post, deleted: true }));
  for (const posts of [own, gone]) assert.deepEqual(programFlowReviews({ ...posted.data, public: { ...posted.data.public, posts } }, A).posts, [], 'my own or a deleted one is not listed');
});
// QA NO_GO 11/6 F1: two Flows finished by one save were both marked asked and only the first shown; a Flow finished
// while a question was up replaced it unanswered.
const ONE = { title: '아침 루틴', items: [item('stretch', '스트레칭 하기')] }, TWO = { title: '저녁 루틴', items: [item('diary', '일기 쓰기')] };
function pair(): ProgramData {
  const data = catalog();
  for (const [id, flow] of Object.entries({ morning: ONE, evening: TWO })) {
    data.public.flows.push({ id, ownerId: A, currentVersionId: `${id}-v1`, category: '생활', situations: [], derivedFrom: null, archived: false });
    data.public.versions.push({ id: `${id}-v1`, flowId: id, number: 1, parentVersionId: null, title: flow.title, summary: '합성', items: flow.items,
      source: { kind: 'user-text', label: '합성', url: null, checkedAt: null }, createdBy: A, createdAt: NOW });
  }
  return take(take(data, 'morning'), 'evening');
}

test('QA F1: two Flows finished by one save are asked one after the other; only the one shown counts as asked', () => {
  const before = pair(), text = M.updateTask(M.updateTask(before.spaces[B].text, task(before, '스트레칭 하기').id, { done: true }), task(before, '일기 쓰기').id, { done: true });
  const after = { ...before, spaces: { ...before.spaces, [B]: { ...before.spaces[B], text } } };
  const finished = programFlowsJustFinished(before, after, B, TODAY);
  assert.deepEqual(finished.map(row => row.flowId), ['morning', 'evening'], 'one save, two Flows');
  let queue = programTriedAdd(PROGRAM_TRIED_EMPTY, finished, true);
  assert.deepEqual([queue.shown?.flowId, queue.waiting.map(row => row.flowId), queue.asked], ['morning', ['evening'], ['morning']]);
  queue = programTriedDone(queue, true);
  assert.deepEqual([queue.shown?.flowId, queue.waiting, queue.asked], ['evening', [], ['morning', 'evening']], 'answered: the next comes up');
  queue = programTriedAdd(programTriedDone(queue, true), finished, true);
  assert.deepEqual([queue.shown, queue.waiting], [null, []], 'both asked: never again in this tab');
});

test('QA F1: a Flow finished while a question is up waits; nothing is asked off screen', () => {
  const data = pair(), morning = check(data, '스트레칭 하기'), evening = check(morning, '일기 쓰기');
  let queue = programTriedAdd(PROGRAM_TRIED_EMPTY, programFlowsJustFinished(data, morning, B, TODAY), true);
  queue = programTriedAdd(queue, programFlowsJustFinished(morning, evening, B, TODAY), true);
  assert.deepEqual([queue.shown?.flowId, queue.waiting.map(row => row.flowId), queue.asked], ['morning', ['evening'], ['morning']], 'the unanswered one stays');
  queue = programTriedAdd(queue, programFlowsJustFinished(morning, evening, B, TODAY), true);
  assert.equal(queue.waiting.length, 1, 'waiting once');
  const away = programTriedDone(queue, false);
  assert.deepEqual([away.shown, away.waiting.map(row => row.flowId), away.asked], [null, ['evening'], ['morning']], 'the space left: the next is not put up unseen');
  assert.equal(programTriedShow(away).shown?.flowId, 'evening', 'back in the space');
  const hidden = programTriedAdd(PROGRAM_TRIED_EMPTY, programFlowsJustFinished(data, morning, B, TODAY), false);
  assert.deepEqual([hidden.shown, hidden.asked], [null, []]);
});

// QA F2: the last check's reply was lost; 다시 확인 confirmed the same request, but nothing asked.
test('QA F2: a last check whose reply was lost is asked about when that same request is confirmed, not before', async () => {
  let data = take(catalog(), 'mixed');
  data = check(data, '기록 공책 고르기');
  const seed = captureAlphaAccount(createProgramEnvelope(data), B, B), server = createAlphaFakeServer([seed]), port = server.connect(server.issueSession(B));
  let saved: unknown = null, wire = 0, lose = false;
  // The public Flows come with the account, as the social read gives them; the reply of the next save is lost.
  const lossy: AlphaRepository = { ...port, references: () => seed.references,
    execute: async command => { const result = await port.execute(command); if (lose) { lose = false; throw Error('reply lost'); } return result; } };
  const controller = createAlphaSyncController({ recovery: { load: () => ({ ok: true, value: saved }), save: (value: unknown) => { saved = structuredClone(value); return true; } } as never,
    requestId: () => `loop-wire-${++wire}` });
  controller.bindSession(B, lossy);
  await controller.refresh();
  const shown = controller.snapshot().envelope!.data;
  lose = true;
  const last = await controller.mutate('완료', current => completeProgramTask(current, { ...base(current), taskId: task(current, '첫 주 돌아보기').id, date: TODAY, done: true }));
  assert(!last.ok, 'the reply was lost');
  const pending = controller.snapshot().pending;
  assert(pending, 'unresolved');
  assert.equal(programPendingFinish(pending.requestId, controller.snapshot()), 'wait');
  assert(await controller.resolvePending(true), '다시 확인');
  const live = controller.snapshot();
  assert.equal(programPendingFinish(pending.requestId, live), 'ask');
  assert.deepEqual(programFlowsJustFinished(shown, live.envelope!.data, B, TODAY).map(row => row.flowId), ['mixed']);
  assert.equal(programPendingFinish('loop-wire-other', live), 'drop', 'another request is not this one');
  assert.equal(programPendingFinish(pending.requestId, { pending: null, lastReceipt: null }), 'drop', 'no receipt: not asked');
  assert.equal(programPendingFinish(pending.requestId, { pending: { requestId: 'loop-wire-other' }, lastReceipt: null }), 'drop');
});