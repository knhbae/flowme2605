import assert from 'node:assert/strict';
import test from 'node:test';
import { koreanFlowContentCandidates } from './korean-flow-content-candidates';
import { koreanFlowContentUserReviewById } from './korean-flow-content-user-review';
import {
  applyKoreanFlowContentReviewRefresh,
} from './korean-flow-content-source-refresh';
import { koreanFlowContentSourceRefreshes } from './korean-flow-content-source-refresh';

const refreshedIds = new Set(koreanFlowContentSourceRefreshes.map((refresh) => refresh.candidateId));
const candidateIds = new Set(koreanFlowContentCandidates.map((candidate) => candidate.id));

test('source refresh entries target existing Korean Flow candidates', () => {
  assert.equal(koreanFlowContentSourceRefreshes.length, refreshedIds.size);

  for (const refresh of koreanFlowContentSourceRefreshes) {
    assert.ok(candidateIds.has(refresh.candidateId), `unknown candidate ${refresh.candidateId}`);
    assert.ok(refresh.sourceUrl.startsWith('https://'), `${refresh.candidateId} should use a real source URL`);
    assert.ok(refresh.flowItems.length >= 3, `${refresh.candidateId} should expose executable Flow items`);
    assert.ok(refresh.simulation.calendar, `${refresh.candidateId} should include calendar simulation`);
    assert.ok(refresh.simulation.detail, `${refresh.candidateId} should include detail simulation`);
    assert.ok(refresh.simulation.exportMemo, `${refresh.candidateId} should include export memo simulation`);
  }
});

test('every previously weak source quality candidate has a refresh decision', () => {
  const weakQualities = new Set(['usable_but_ai_like', 'source_unclear', 'too_broad', 'needs_exact_source']);

  for (const candidate of koreanFlowContentCandidates) {
    const review = koreanFlowContentUserReviewById.get(candidate.id);
    assert.ok(review, `missing review ${candidate.id}`);
    if (weakQualities.has(review.sourceQuality)) {
      assert.ok(refreshedIds.has(candidate.id), `${candidate.id} needs a source refresh entry`);
    }
    if (review.sourceIssue?.includes('AI')) {
      assert.ok(refreshedIds.has(candidate.id), `${candidate.id} needs a source refresh entry for AI issue`);
    }
  }
});

test('source refresh removes AI-like and unclear labels from refreshed reviews', () => {
  for (const refresh of koreanFlowContentSourceRefreshes) {
    const baseReview = koreanFlowContentUserReviewById.get(refresh.candidateId);
    assert.ok(baseReview, `missing base review ${refresh.candidateId}`);
    const refreshedReview = applyKoreanFlowContentReviewRefresh(baseReview);
    assert.notEqual(refreshedReview.sourceQuality, 'usable_but_ai_like');
    assert.notEqual(refreshedReview.sourceQuality, 'source_unclear');
  }
});

test('water purifier source refresh matches the public sheet-first filter rows', () => {
  const refresh = koreanFlowContentSourceRefreshes.find((entry) => entry.candidateId === 'water-purifier-filter-cycle');
  assert.ok(refresh);

  const executionText = [
    refresh.sourceTitle,
    refresh.sourceSignal,
    refresh.simulation.detail,
    refresh.simulation.exportMemo,
    ...refresh.flowItems.map((item) => `${item.schedule} ${item.title} ${item.memo} ${item.completion}`),
  ].join('\n');

  for (const cue of ['침전', '프리카본', 'RO/나노', '후카본', '9~12개월', '코크/출수구', '물맛·냄새']) {
    assert.match(executionText, new RegExp(cue));
  }
  assert.doesNotMatch(executionText, /UF 멤브레인|포스트 카본|LG전자 정수필터/);
});
