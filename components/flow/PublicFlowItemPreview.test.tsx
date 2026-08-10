import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { PublicFlowItemPreview } from './PublicFlowItemPreview';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test('public Item preview is readonly and preserves raw memo checklist text in one region', () => {
  const markup = renderToStaticMarkup(
    <PublicFlowItemPreview
      row={{
        id: 'item-1',
        sourceItemId: 'source-item-1',
        ownership: 'source',
        title: '집 상태 확인하기',
        role: 'action',
        completable: true,
        orderRank: 0,
        included: true,
        completed: false,
        schedule: { state: 'dated', date: '2026-08-09' },
        resources: [],
        eligibleShapes: ['memo'],
        completionCriterion: '사진을 남겼다',
      }}
      memoText={'입주 전에 확인합니다.\n- [ ] 현관 사진\n- [x] 욕실 누수'}
      onClose={() => undefined}
    />,
  );

  assert.match(markup, /data-public-preview="readonly"/u);
  assert.match(markup, /data-testid="public-flow-item-preview-raw-memo"/u);
  assert.match(markup, /- \[ \] 현관 사진/u);
  assert.match(markup, /- \[x\] 욕실 누수/u);
  assert.match(markup, /완료 기준: 사진을 남겼다/u);
  assert.equal(markup.match(/사진을 남겼다/gu)?.length, 1);
  assert.doesNotMatch(markup, /완료 기준 ·/u);
  assert.doesNotMatch(markup, /role="checkbox"/u);
});

test('public Item preview prefers an already composed raw memo without a second criterion card', () => {
  const markup = renderToStaticMarkup(
    <PublicFlowItemPreview
      row={{
        id: 'item-2',
        sourceItemId: 'source-item-2',
        ownership: 'source',
        title: '점검 결과 공유하기',
        role: 'action',
        completable: true,
        orderRank: 1,
        included: true,
        completed: false,
        schedule: { state: 'unscheduled' },
        resources: [],
        eligibleShapes: ['memo'],
        completionCriterion: '별도 필드의 오래된 기준',
      }}
      rawMemoText={'결과를 메모합니다.\r\n\r\n- [x] 사진 첨부\r\n\r\n완료 기준: 담당자에게 공유했다.'}
      onClose={() => undefined}
    />,
  );

  assert.match(markup, /결과를 메모합니다.\n\n- \[x\] 사진 첨부\n\n완료 기준: 담당자에게 공유했다./u);
  assert.doesNotMatch(markup, /별도 필드의 오래된 기준/u);
  assert.equal(markup.match(/data-testid="public-flow-item-preview-raw-memo"/gu)?.length, 1);
});
