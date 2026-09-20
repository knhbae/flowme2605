import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { createPersonalWorkspacePocReceipt } from '@/lib/flow/personal-workspace-poc-receipt';

import { PersonalWorkspacePocReceiptSurface } from './PersonalWorkspacePocReceiptSurface';

function receipt(status: 'success' | 'noop' | 'failure') {
  const common = {
    receiptId: `receipt-${status}`,
    intentId: 'intent-plan-one',
    operation: 'commit-personal-plan',
    status,
    createdAt: '2026-09-02T12:00:00.000Z',
    scopeRef: 'flow:copy:one',
    affectedRefs: status === 'noop' ? [] : ['flow:copy:one'],
    affectedCount: status === 'noop' ? 0 : 1,
    stateRevisionBefore: 2,
    stateRevisionAfter: status === 'success' ? 3 : 2,
    changes: status === 'noop' ? [] : [{
      owner: 'poc-personal-plan' as const,
      field: 'flow.title',
      label: 'Flow 제목',
      before: '원래 제목',
      after: '내 제목',
    }],
    targetWriteCount: status === 'success' ? 1 : 0,
    supportWriteCount: status === 'success' ? 4 : 0,
    rollback: 'not-needed' as const,
    ...(status === 'success' ? { undoLabel: '이 변경 되돌리기' } : {}),
    ...(status === 'failure' ? {
      retryIntent: { kind: 'commit-personal-plan', parameters: { flowRef: 'flow:copy:one' } },
      errorCode: 'storage-failed',
    } : {}),
  };
  const built = createPersonalWorkspacePocReceipt(common);
  assert.equal(built.ok, true);
  if (!built.ok) throw new Error('receipt fixture must be valid');
  return built.receipt;
}

test('successful receipt exposes exact changed values and machine-readable write counts', () => {
  const html = renderToStaticMarkup(
    <PersonalWorkspacePocReceiptSurface receipt={receipt('success')} onUndo={() => undefined} />,
  );
  assert.match(html, /data-receipt-status="success"/u);
  assert.match(html, /data-target-write-count="1"/u);
  assert.match(html, /data-support-write-count="4"/u);
  assert.match(html, /원래 제목/u);
  assert.match(html, /내 제목/u);
  assert.match(html, /1개 변경을 저장했습니다/u);
  assert.doesNotMatch(html, /대상 쓰기|보조 쓰기|영향받은 대상/u);
  assert.match(html, /role="status"/u);
  assert.match(html, /personal-workspace-editor-receipt-undo/u);
});

test('no-op receipt states that it performed zero writes', () => {
  const html = renderToStaticMarkup(<PersonalWorkspacePocReceiptSurface receipt={receipt('noop')} />);
  assert.match(html, /같은 내용이라 저장하지 않았습니다/u);
  assert.match(html, /data-target-write-count="0"/u);
  assert.doesNotMatch(html, /receipt-undo/u);
});

test('recoverable failure retains the same-intent retry action', () => {
  const html = renderToStaticMarkup(
    <PersonalWorkspacePocReceiptSurface receipt={receipt('failure')} onRetry={() => undefined} />,
  );
  assert.match(html, /data-receipt-status="failure"/u);
  assert.match(html, /personal-workspace-editor-receipt-retry/u);
  assert.match(html, /이전 상태를 유지했습니다/u);
  assert.match(html, /role="alert"/u);
});

test('failure receipt stays visible but does not duplicate the open editor live alert', () => {
  const html = renderToStaticMarkup(
    <PersonalWorkspacePocReceiptSurface
      receipt={receipt('failure')}
      announce={false}
      onRetry={() => undefined}
    />,
  );
  assert.match(html, /data-receipt-status="failure"/u);
  assert.match(html, /aria-live="off"/u);
  assert.doesNotMatch(html, /role="alert"/u);
  assert.match(html, /personal-workspace-editor-receipt-retry/u);
});
