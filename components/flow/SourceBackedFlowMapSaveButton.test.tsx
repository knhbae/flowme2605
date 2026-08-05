import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  buildEffectiveFlowMapSnapshot,
} from '@/lib/flow/effective-flow-map-snapshot';
import {
  buildSourceBackedFlowMapPublishPackage,
} from '@/lib/flow/source-backed-my-flow';
import { SourceBackedFlowMapSaveButton } from './SourceBackedFlowMapSaveButton';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function renderMapActions(q3CopyEnabled: boolean) {
  const publishPackage = buildSourceBackedFlowMapPublishPackage('middle-school-math-1');
  assert.ok(publishPackage);

  const effectiveSnapshot = buildEffectiveFlowMapSnapshot({
    publishPackage,
    effectiveTitle: publishPackage.public.title,
    executionState: 'executable',
    sourceLabel: '원문 보기',
  });
  const savedFlows = publishPackage.public.childFlows.map((flow) => ({
    slug: flow.slug,
    title: flow.title,
    artifactMode: flow.destination === 'sheet'
      ? 'sheet' as const
      : flow.destination === 'calendar' || flow.destination === 'hybrid'
        ? 'calendar' as const
        : 'checklist' as const,
    steps: flow.steps.map((step) => ({ id: step.id, title: step.title })),
  }));

  return renderToStaticMarkup(
    <SourceBackedFlowMapSaveButton
      effectiveSnapshot={effectiveSnapshot}
      defaultTitle={effectiveSnapshot.effectiveTitle}
      q3CopyEnabled={q3CopyEnabled}
      onEffectiveSnapshotChange={() => undefined}
      savedFlows={savedFlows}
      setupInput={{ label: '시작일', hint: '시작일을 정합니다.' }}
    />,
  );
}

test('Q3 map actions use plan vocabulary without changing action identity', () => {
  const markup = renderMapActions(true);

  assert.match(markup, /data-p35-q3-copy="on"/u);
  assert.match(markup, /data-map-action-intent="save_all"/u);
  assert.match(markup, />내 계획에 저장<\/button>/u);
  assert.match(markup, />계획 수정<\/button>/u);
  assert.doesNotMatch(markup, />전체 저장하고 시작<\/button>/u);
  assert.doesNotMatch(markup, />Flow 편집<\/button>/u);
});

test('q3Copy off restores the current map labels while preserving action identity', () => {
  const markup = renderMapActions(false);

  assert.match(markup, /data-p35-q3-copy="off"/u);
  assert.match(markup, /data-map-action-intent="save_all"/u);
  assert.match(markup, />전체 저장하고 시작<\/button>/u);
  assert.match(markup, />Flow 편집<\/button>/u);
  assert.match(markup, />조정<\/button>/u);
  assert.doesNotMatch(markup, />내 계획에 저장<\/button>/u);
});

test('mobile sticky copy keeps selected and total counts beside a missing anchor', () => {
  for (const q3CopyEnabled of [true, false]) {
    const markup = renderMapActions(q3CopyEnabled);
    assert.match(
      markup,
      /data-testid="flow-map-selection-summary">선택 8 \/ 전체 8<\/span> · 시작일 필요/u,
    );
  }
});
