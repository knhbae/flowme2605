import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { MyFlowSortMenu } from './MyFlowSortMenu';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test('compact sort trigger exposes the current value and 48px target without rendering a closed menu', () => {
  const markup = renderToStaticMarkup(
    <MyFlowSortMenu
      sort="saved"
      planCount={6}
      visible
      onChange={() => undefined}
    />,
  );

  assert.match(markup, /data-sort-menu-overlay="true"/u);
  assert.match(markup, /aria-haspopup="menu"/u);
  assert.match(markup, /aria-expanded="false"/u);
  assert.match(markup, /aria-label="정렬 기준, 최근 저장순"/u);
  assert.match(markup, /min-h-12/u);
  assert.match(markup, /min-w-12/u);
  assert.doesNotMatch(markup, /role="menu"/u);
});

test('sort trigger is absent for zero or one plan', () => {
  for (const planCount of [0, 1]) {
    assert.equal(renderToStaticMarkup(
      <MyFlowSortMenu
        sort="next"
        planCount={planCount}
        visible={planCount >= 2}
        onChange={() => undefined}
      />,
    ), '');
  }
});
