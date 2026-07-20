import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCompletionControlPresentation,
  buildCompletionNoticePresentation,
} from './completion-presentation';

test('completion labels keep ordinary completion and reopen on one checkbox', () => {
  assert.deepEqual(
    buildCompletionControlPresentation({ title: '보험 서류 챙기기', checked: false }),
    {
      actionLabel: '완료 체크',
      accessibleName: '보험 서류 챙기기 완료 체크',
    },
  );
  assert.deepEqual(
    buildCompletionControlPresentation({ title: '보험 서류 챙기기', checked: true }),
    {
      actionLabel: '다시 열기',
      accessibleName: '보험 서류 챙기기 다시 열기',
    },
  );
});

test('recurring completion labels include the occurrence date without changing the item title', () => {
  assert.deepEqual(
    buildCompletionControlPresentation({
      title: '필터 상태 확인하기',
      checked: true,
      recurring: true,
      occurrenceDateLabel: '7월 21일',
    }),
    {
      actionLabel: '이번 회차 다시 열기',
      accessibleName: '필터 상태 확인하기 7월 21일 이번 회차 다시 열기',
    },
  );
});

test('completion notices distinguish immediate undo from a later reopen receipt', () => {
  assert.deepEqual(
    buildCompletionNoticePresentation({
      title: '필터 상태 확인하기',
      result: 'completed',
      recurring: true,
      occurrenceDateLabel: '7월 21일',
    }),
    {
      message: '“필터 상태 확인하기” · 7월 21일 완료',
      actionLabel: '되돌리기',
    },
  );
  assert.deepEqual(
    buildCompletionNoticePresentation({
      title: '보험 서류 챙기기',
      result: 'reopened',
    }),
    {
      message: '“보험 서류 챙기기” 다시 열림',
      actionLabel: '항목 보기',
    },
  );
});
