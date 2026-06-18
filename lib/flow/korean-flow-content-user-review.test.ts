import assert from 'node:assert/strict';
import { test } from 'node:test';
import { koreanFlowContentCandidates } from './korean-flow-content-candidates';
import {
  koreanFlowContentUserReviewById,
  koreanFlowContentUserReviews,
  representativeKoreanFlowContentIds,
} from './korean-flow-content-user-review';

test('user review covers every korean Flow content candidate exactly once', () => {
  assert.equal(koreanFlowContentUserReviews.length, koreanFlowContentCandidates.length);

  const candidateIds = new Set(koreanFlowContentCandidates.map((candidate) => candidate.id));
  const reviewIds = new Set(koreanFlowContentUserReviews.map((review) => review.candidateId));

  assert.equal(reviewIds.size, koreanFlowContentUserReviews.length);

  for (const candidateId of candidateIds) {
    assert.ok(reviewIds.has(candidateId), `${candidateId} needs user review data`);
  }
});

test('representative korean Flow content set stays focused and high scoring', () => {
  assert.equal(representativeKoreanFlowContentIds.length, 8);

  for (const candidateId of representativeKoreanFlowContentIds) {
    const review = koreanFlowContentUserReviewById.get(candidateId);
    assert.ok(review, `${candidateId} needs review`);
    assert.ok(review.userScore >= 4.5, `${candidateId} should be user-scored 4.5+`);
    assert.notEqual(
      review.sourceQuality,
      'usable_but_ai_like',
      `${candidateId} should avoid AI-like source quality as representative`,
    );
  }
});

test('dorm move-in review is official-first after external ecosystem compression', () => {
  const review = koreanFlowContentUserReviewById.get('college-dorm-move-in-checklist');

  assert.ok(review);
  assert.equal(review.status, 'promote');
  assert.equal(review.sourceQuality, 'clear_official');
  assert.match(review.sourceIssue ?? '', /최신.*공지|학기별.*PDF|학교별.*규정/);
  assert.match(review.conversionNote, /최신.*기숙사.*공지|입사일|제출서류|반입금지/);
  assert.match(review.uxAction, /D-14|D-Day|최신.*공지/);
  assert.doesNotMatch(
    [review.sourceIssue, review.conversionNote, review.uxAction].join('\n'),
    /댓글.*비밀번호|무료.*배포|블로그.*근거/,
  );
});

test('elementary entry review keeps official notice separate from parent checklist cues', () => {
  const review = koreanFlowContentUserReviewById.get('elementary-school-entry-d30');

  assert.ok(review);
  assert.equal(review.status, 'promote');
  assert.equal(review.sourceQuality, 'clear_official');
  assert.match(review.sourceIssue ?? '', /공식.*취학통지|예비소집|블로그.*보조|체크리스트.*보조/);
  assert.match(review.conversionNote, /취학통지|예비소집|학교 안내.*보류|이름.*붙이기|등교.*연습/);
  assert.match(review.uxAction, /D-30|D-1|먼저.*살|학교 안내.*보류/);
  assert.doesNotMatch(
    [review.sourceIssue, review.conversionNote, review.uxAction].join('\n'),
    /지원금.*안내|건강.*기록|주민등록번호.*입력|구매.*추천.*중심/,
  );
});
