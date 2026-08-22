import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { seedBundles } from '@/lib/flow/seed-flows';
import { ArtifactWorkbench } from './ArtifactWorkbench';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test('source-observation workbench asks for follow-up evidence instead of a weekly adjustment', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'real-fitvely-video-body-fat-6kg-method');
  assert.ok(bundle);

  const markup = renderToStaticMarkup(
    <ArtifactWorkbench
      bundle={bundle}
      anchor=""
      weekdays={[]}
      checks={{}}
      itemStates={{}}
      comparisonState={{ candidates: [], notes: {} }}
      onComparisonChange={() => undefined}
      workbenchState={{ occurrences: {}, logRows: {}, memoCards: {} }}
      onWorkbenchChange={() => undefined}
      onToggleItem={() => undefined}
    />,
  );

  assert.match(markup, />추가 확인 메모</u);
  assert.match(markup, /내 상황에 적용하기 전에 더 확인할 질문/u);
  assert.doesNotMatch(markup, /주간 조정 메모|이번 주에 유지할 기준|반복 리마인더/u);
});

test('single-application diet workbench asks for a keep-or-stop decision instead of weekly adjustment', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'real-fitvely-video-carb-reason');
  assert.ok(bundle);

  const markup = renderToStaticMarkup(
    <ArtifactWorkbench
      bundle={bundle}
      anchor=""
      weekdays={[]}
      checks={{}}
      itemStates={{}}
      comparisonState={{ candidates: [], notes: {} }}
      onComparisonChange={() => undefined}
      workbenchState={{ occurrences: {}, logRows: {}, memoCards: {} }}
      onWorkbenchChange={() => undefined}
      onToggleItem={() => undefined}
    />,
  );

  assert.match(markup, />유지·중단 메모</u);
  assert.match(markup, /오늘 한 번 적용한 뒤 유지하거나 중단할지/u);
  assert.doesNotMatch(markup, /주간 조정 메모|다음 주|반복 리마인더/u);
});
