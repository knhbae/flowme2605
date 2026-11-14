import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// 실행 고리 1안: how the three screens use flow-loop.ts (source checks; flow-loop.test.ts covers the model).
const source = (name: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${name}`, import.meta.url), 'utf8');

test('the Flow detail says 내 진행 only for a copy I can open, read from my own space', () => {
  const discovery = source('ProgramDiscovery.tsx');
  assert(discovery.includes("const progress = active && existingCopy && !flow.archived && !privateSpace.archivedDocumentIds.includes(existingCopy.documentId) ? programFlowProgress(data, actorId, flow.id, today) : null;"));
  assert(discovery.includes("progressText || '이미 가져온 내 문서를 엽니다. 날짜·진행 기록은 그대로입니다.'"), 'a copy with nothing to count keeps the old line');
  assert(discovery.includes("'보관한 내 문서를 읽기 전용으로 엽니다.'") && discovery.includes("'공개가 철회된 Flow입니다. 가져간 사본은 그대로입니다.'"));
});

test('the host asks after a save of mine only, once per Flow in the tab, and [남기기] opens the review composer', () => {
  const host = source('AlphaWorkspace.tsx');
  const save = host.indexOf('const shownBefore = currentData.current, pendingBefore = store.snapshot().pending?.requestId;'), sent = host.indexOf('const outcome = await store.mutate(label, build, guardedOptions);');
  assert(save > 0 && save < sent, 'what was shown is taken before the save is sent');
  assert(host.includes('if (outcome.changed !== false && shownBefore?.spaces[owner]?.copies.length) { finishWatch.current = shownBefore; askIfFlowFinished(); }'));
  const start = host.slice(host.indexOf('async function startTriedReview()'), host.indexOf('async function returnFromReview()'));
  assert(start.indexOf('await editor.flushAll()') < start.indexOf('setReviewEntry('), 'the input is saved first, as 후기 쓰기 does');
  assert(start.includes('const asked = tried?.epoch === epoch ? tried.queue.shown : null;') && start.includes('draft: programTriedDraft(asked), tried: true'));
  const prompt = host.slice(host.indexOf('data-tried-prompt'), host.indexOf('data-tried-prompt') + 700);
  assert(prompt.includes('{PROGRAM_TRIED_ASK}') && prompt.includes('>남기기</button>') && prompt.includes('>괜찮아요</button>'));
  assert.equal(prompt.split('onPointerDown={event => event.preventDefault()}').length, 3, 'pressing it leaves the caret where it is');
});

test('QA F1: the host keeps one question up and the rest waiting; only what it shows is asked', () => {
  const host = source('AlphaWorkspace.tsx');
  assert(!host.includes('triedAsked'), 'no set marking Flows asked before they are shown');
  const ask = host.slice(host.indexOf('function askIfFlowFinished()'), host.indexOf('async function startTriedReview()'));
  assert(ask.includes('queue: programTriedAdd(current?.epoch === epoch ? current.queue : PROGRAM_TRIED_EMPTY, finished, visible)'), 'added to the queue, the one up kept');
  assert(host.includes("const visible = destination.view === 'space';")
    && host.includes('queue: visible ? programTriedShow(current.queue) : programTriedDone(current.queue, false)'), 'the next comes up only in the space');
  assert(host.includes('{tried?.epoch === sessionEpoch && tried.queue.shown && <div key={tried.queue.shown.flowId}'));
  assert(host.includes("onClick={() => setTried(current => current && { ...current, queue: programTriedDone(current.queue, true) })}>괜찮아요</button>"));
  const start = host.slice(host.indexOf('async function startTriedReview()'), host.indexOf('async function returnFromReview()'));
  assert(start.indexOf('queue: programTriedDone(current.queue, false)') < start.indexOf('await navigate(next);'), '남기기 answers it; the next waits for the space');
});

test('QA F2: a lost reply\'s own request, once confirmed, is compared from what was shown when it started', () => {
  const host = source('AlphaWorkspace.tsx');
  const failed = host.slice(host.indexOf('if (!outcome.ok) {'), host.indexOf("if (outcome.reason !== 'busy' && !reviewOwnsMessage) {"));
  assert(failed.includes('const unresolved = store.snapshot().pending;')
    && failed.includes('if (unresolved && unresolved.requestId !== pendingBefore && shownBefore?.spaces[owner]?.copies.length) pendingFinish.current = { epoch, requestId: unresolved.requestId, before: shownBefore };'),
    'only a request this save left unresolved, not one that was already waiting');
  const watch = host.slice(host.indexOf('const waiting = pendingFinish.current, live = controller.current?.snapshot();'), host.indexOf('}, [data, snapshot]);'));
  assert(watch.includes('const state = programPendingFinish(waiting.requestId, live);') && watch.includes("if (state === 'ask') finishWatch.current = waiting.before;")
    && watch.includes("if (state !== 'wait') pendingFinish.current = null;") && watch.includes('askIfFlowFinished();'));
  assert(host.includes('useEffect(() => { setTried(null); finishWatch.current = null; pendingFinish.current = null; }, [sessionEpoch]);'));
});

test('the composer names the public post for ‘해 봤어요’, and the author sees 내 Flow에 남은 후기 and 후기 n', () => {
  const community = source('ProgramCommunity.tsx');
  assert(community.includes("{reviewEntry?.tried ? PROGRAM_TRIED_NOTE : '공개할 연결을 직접 선택해 주세요.'} 개인 원문·메모·진행 기록은 포함하지 않습니다."));
  assert(community.includes(`{isReviewDraft && reviewEntry?.tried ? "'해 봤어요' 후기도 공개한 글입니다. " : ''}`));
  assert(community.includes('<h2>내 Flow에 남은 후기 · 해 봤어요 {flowReviews.posts.length}</h2>'));
  assert(community.includes("<p className={styles.empty}>아직 남은 후기가 없어요.</p>"));
  assert(community.includes('후기 {flowReviews.byFlow[flow.id] ?? 0}'), 'the author sees the count even when no review exists');
});
