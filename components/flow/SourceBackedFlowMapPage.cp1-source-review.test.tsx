import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { SourceBackedFlowMapPublicPage } from './SourceBackedFlowMapPage';
import { sourceBackedMyFlowMaps } from '@/lib/flow/source-backed-my-flow';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function renderPage(mapId: string, q3CopyEnabled = true) {
  return renderToStaticMarkup(
    <PathnameContext.Provider value={`/flow-maps/${mapId}`}>
      <SourceBackedFlowMapPublicPage mapId={mapId} q3CopyEnabled={q3CopyEnabled} />
    </PathnameContext.Provider>,
  );
}

test('CP1 source-row holds explain the blocked new save and export and retain the original link', () => {
  for (const mapId of ['moving-d30', 'curated-opic-mock-course', 'curated-reading-routine-log']) {
    for (const q3CopyEnabled of [true, false]) {
      const markup = renderPage(mapId, q3CopyEnabled);
      const map = sourceBackedMyFlowMaps.find(entry => entry.id === mapId);
      assert.ok(map);
      assert.match(markup, /data-map-execution-state="review_hold"/u);
      assert.match(markup, /data-map-save-capability="hidden"/u);
      assert.match(markup, /새로 저장하거나 파일로 받을 수 없습니다/u);
      assert.match(markup, /일정과 조건을 원문에서 확인/u);
      assert.match(markup, /data-testid="flow-map-source-link"/u);
      assert.ok(markup.includes(map.sourceUrl!.replaceAll('&', '&amp;')), mapId);
      assert.doesNotMatch(markup, /개별 자료와 난이도|자료에서 실제로 실행할 항목을 고르는/u);
      assert.doesNotMatch(markup, /data-testid="flow-map-save-button"|data-testid="flow-map-choose-child"/u);
    }
  }
});

test('CP1 source refresh does not open the existing medical or tax review pages for new execution', () => {
  for (const mapId of ['baby-health-schedule', 'curated-child-vaccination-schedule', 'year-end-tax-submit']) {
    const markup = renderPage(mapId);
    assert.match(markup, /data-map-execution-state="review_hold"/u);
    assert.match(markup, /data-map-save-capability="hidden"/u);
    assert.match(markup, /data-testid="flow-map-source-link"/u);
    assert.doesNotMatch(markup, /data-testid="flow-map-save-button"/u);
  }
});
