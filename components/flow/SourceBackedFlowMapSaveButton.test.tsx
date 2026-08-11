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

function renderMapActions(
  q3CopyEnabled: boolean,
  selectedArtifactMode: 'memo' | 'checklist' | 'calendar' | null = 'memo',
  visualSubtractionEnabled = true,
) {
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
      anchor=""
      onAnchorChange={() => undefined}
      selectedArtifactMode={selectedArtifactMode ?? undefined}
      selectedResultReady={selectedArtifactMode !== 'calendar'}
      q3CopyEnabled={q3CopyEnabled}
      visualSubtractionEnabled={visualSubtractionEnabled}
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
  assert.match(markup, />내 계획으로 저장<\/button>/u);
  assert.match(markup, />수정<\/button>/u);
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
  assert.doesNotMatch(markup, />내 계획으로 저장<\/button>/u);
});

test('Text and Todo stay undated while Calendar alone exposes the required anchor', () => {
  for (const q3CopyEnabled of [true, false]) {
    const memoMarkup = renderMapActions(q3CopyEnabled, 'memo');
    assert.doesNotMatch(memoMarkup, /data-testid="flow-map-anchor-input"/u);
    assert.match(
      memoMarkup,
      /data-testid="flow-map-selection-summary">선택 8 \/ 전체 8<\/span>/u,
    );
    assert.doesNotMatch(memoMarkup, /시작일 필요/u);

    const calendarMarkup = renderMapActions(q3CopyEnabled, 'calendar');
    assert.match(calendarMarkup, /data-testid="flow-map-anchor-input"/u);
    assert.match(
      calendarMarkup,
      /data-testid="flow-map-selection-summary">선택 8 \/ 전체 8<\/span> · 시작일 필요/u,
    );
    assert.match(calendarMarkup, />시작일 정하기<\/button>/u);
  }
});

test('explicit visual rollback can retain legacy Map action and anchor semantics', () => {
  const markup = renderMapActions(true, null, false);
  assert.match(markup, />내 계획에 저장<\/button>/u);
  assert.match(markup, />계획 수정<\/button>/u);
  assert.match(markup, /data-testid="flow-map-anchor-input"/u);
  assert.match(markup, /시작일 필요/u);
  assert.match(markup, /bottom-\[calc\(4\.625rem\+env\(safe-area-inset-bottom\)\)\]/u);
  assert.match(markup, /inline-flex min-h-10/u);
  assert.doesNotMatch(markup, /bottom-0/u);
});
