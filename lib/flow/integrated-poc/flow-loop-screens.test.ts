import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// 실행 고리 1안: how the three screens use flow-loop.ts (source checks; flow-loop.test.ts covers the model).
const source = (name: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${name}`, import.meta.url), 'utf8');

test('the Flow detail says 내 진행 only for a copy I can open, read from my own space', () => {
  const discovery = source('ProgramDiscovery.tsx');
  assert(discovery.includes("const progress = existingCopy && !flow.archived && !privateSpace.archivedDocumentIds.includes(existingCopy.documentId) ? programFlowProgress(data, actorId, flow.id, today) : null;"));
  assert(discovery.includes("progressText || '이미 가져온 내 문서를 엽니다. 날짜·진행 기록은 그대로입니다.'"), 'a copy with nothing to count keeps the old line');
  assert(discovery.includes("'보관한 내 문서를 읽기 전용으로 엽니다.'") && discovery.includes("'공개가 철회된 Flow입니다. 가져간 사본은 그대로입니다.'"));
});

test('the host asks after a save of mine only, once per Flow in the tab, and [남기기] opens the review composer', () => {
  const host = source('AlphaWorkspace.tsx');
  const save = host.indexOf('const shownBefore = currentData.current;'), sent = host.indexOf('const outcome = await store.mutate(label, build, guardedOptions);');
  assert(save > 0 && save < sent, 'what was shown is taken before the save is sent');
  assert(host.includes('if (outcome.changed !== false && shownBefore?.spaces[owner]?.copies.length) { finishWatch.current = shownBefore; askIfFlowFinished(); }'));
  assert(host.includes('useEffect(() => { askIfFlowFinished(); }, [data]);'), 'a result shown after the save settles is still compared');
  assert(host.includes('.filter(row => !triedAsked.current.has(row.flowId));'));
  assert(host.includes("useEffect(() => { if (destination.view !== 'space') setTried(null); }, [destination]);"));
  const start = host.slice(host.indexOf('async function startTriedReview()'), host.indexOf('async function returnFromReview()'));
  assert(start.indexOf('await editor.flushAll()') < start.indexOf('setReviewEntry('), 'the input is saved first, as 후기 쓰기 does');
  assert(start.includes('draft: programTriedDraft(asked.finish), tried: true'));
  const prompt = host.slice(host.indexOf('data-tried-prompt'), host.indexOf('data-tried-prompt') + 600);
  assert(prompt.includes('{PROGRAM_TRIED_ASK}') && prompt.includes('>남기기</button>') && prompt.includes('>괜찮아요</button>'));
  assert.equal(prompt.split('onPointerDown={event => event.preventDefault()}').length, 3, 'pressing it leaves the caret where it is');
});

test('the composer names the public post for ‘해 봤어요’, and the author sees 내 Flow에 남은 후기 and 후기 n', () => {
  const community = source('ProgramCommunity.tsx');
  assert(community.includes("{reviewEntry?.tried ? PROGRAM_TRIED_NOTE : '공개할 연결을 직접 선택해 주세요.'} 개인 원문·메모·진행 기록은 포함하지 않습니다."));
  assert(community.includes("{isReviewDraft && reviewEntry?.tried ? '이름과 함께 공개되는 글입니다. ' : ''}"));
  assert(community.includes('<h2>내 Flow에 남은 후기 · 해 봤어요 {flowReviews.posts.length}</h2>'));
  assert(community.includes("<p className={styles.empty}>아직 남은 후기가 없어요.</p>"));
  assert(community.includes("{flowReviews.byFlow[flow.id] ? ` · 후기 ${flowReviews.byFlow[flow.id]}` : ''}"));
});
