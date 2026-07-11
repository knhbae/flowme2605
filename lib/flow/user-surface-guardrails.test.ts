import assert from 'node:assert/strict';
import test from 'node:test';
import {
  scanUserSurfaceGuardrails,
  stripUserFacingInternalLines,
} from './user-surface-guardrails';

test('user-surface guardrails catch creator/studio structural labels', () => {
  const result = scanUserSurfaceGuardrails({
    primaryLines: [
      '채널 콘텐츠',
      '공개 콘텐츠 3개',
    ],
  });

  assert.deepEqual(result.structuralDisplayHits, ['채널 콘텐츠']);
  assert.deepEqual(result.internalCopyHits, []);
});

test('creator/studio user copy can describe made content without structural hits', () => {
  const result = scanUserSurfaceGuardrails({
    primaryLines: [
      '나의 스튜디오',
      '내가 만든 콘텐츠',
      '저장 가능한 콘텐츠',
      '모두 보기',
      '모든 주제',
    ],
  });

  assert.deepEqual(result.structuralDisplayHits, []);
  assert.deepEqual(result.internalCopyHits, []);
  assert.deepEqual(result.trailingFlowSuffixHits, []);
});

test('user-facing detail keeps useful copy while removing internal provenance lines', () => {
  assert.equal(
    stripUserFacingInternalLines(
      '예산 범위와 후보 차량을 비교합니다.\nsourceTrace: internal source row\n원문 근거: internal handoff',
    ),
    '예산 범위와 후보 차량을 비교합니다.',
  );
  assert.equal(stripUserFacingInternalLines('sourceTrace: internal only'), undefined);
});
