import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { FlowSaveBeforeFrame } from './FlowSaveBeforeFrame';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function renderSaveFrame(q3CopyEnabled: boolean): string {
  return renderToStaticMarkup(
    <FlowSaveBeforeFrame
      rootTestId="save-frame"
      previewTestId="save-preview"
      previewRowTestId="save-preview-row"
      title="샘플 계획"
      inputLabel="시작일"
      resultLabel="할 일 1개"
      itemCount={1}
      previewRows={[{ id: 'item-1', title: '준비하기' }]}
      composition="legacy"
      q3CopyEnabled={q3CopyEnabled}
    />,
  );
}

test('Q3 save-before frame names the visible and accessible summary as a plan', () => {
  const markup = renderSaveFrame(true);

  assert.match(markup, /계획 미리보기/u);
  assert.match(markup, /aria-label="저장될 계획 요약"/u);
  assert.match(markup, /저장될 전체 계획/u);
  assert.doesNotMatch(markup, /저장될 Flow/u);
});

test('q3Copy off restores prior Flow summary copy without changing frame identity', () => {
  const markup = renderSaveFrame(false);

  assert.match(markup, /data-testid="save-frame"/u);
  assert.match(markup, /Flow 미리보기/u);
  assert.match(markup, /aria-label="저장될 Flow 요약"/u);
  assert.match(markup, /저장될 전체 Flow/u);
});

test('approved public desktop catalog adds stacked, compact, and full composition without reordering mobile result and context', () => {
  const markup = renderToStaticMarkup(
    <FlowSaveBeforeFrame
      rootTestId="save-frame"
      previewTestId="save-preview"
      previewRowTestId="save-preview-row"
      title="샘플 계획"
      resultLabel="할 일 1개"
      itemCount={1}
      previewRows={[{ id: 'item-1', title: '준비하기' }]}
      artifactPreview={<div data-testid="approved-result">result</div>}
      setup={<div data-testid="approved-context">context</div>}
      actions={<button type="button">내 계획으로 저장</button>}
      desktopCatalog={<nav data-testid="approved-catalog">catalog</nav>}
      composition="artifact-first"
    />,
  );

  assert.match(markup, /data-approved-desktop-composition="catalog-result-context"/u);
  assert.match(markup, /data-workspace-breakpoints="mobile:0-767;stacked:768-1023;desktop-compact:1024-1279;desktop-full:1280\+"/u);
  assert.match(markup, /data-testid="flow-save-before-desktop-catalog"/u);
  assert.match(markup, /data-catalog-visibility="stacked:visible;compact:visible;full:visible"/u);
  assert.match(markup, /hidden md:order-first md:block md:border-b/u);
  assert.match(markup, /lg:col-start-1 lg:row-start-1 lg:row-span-2/u);
  assert.match(markup, /lg:grid-cols-\[minmax\(14rem,0\.32fr\)_minmax\(0,1fr\)\]/u);
  assert.match(markup, /xl:grid-cols-\[minmax\(14rem,0\.32fr\)_minmax\(0,1fr\)_minmax\(18rem,0\.42fr\)\]/u);
  assert.match(markup, /lg:col-start-2 lg:row-start-2/u);
  assert.match(markup, /xl:col-start-3 xl:row-start-1/u);

  const resultIndex = markup.indexOf('data-testid="flow-save-before-primary-result"');
  const contextIndex = markup.indexOf('data-testid="flow-save-before-decision"');
  const catalogIndex = markup.indexOf('data-testid="flow-save-before-desktop-catalog"');
  assert.equal(resultIndex >= 0, true);
  assert.equal(contextIndex > resultIndex, true);
  assert.equal(catalogIndex > contextIndex, true);
});

test('desktop catalog is additive to artifact-first and does not alter legacy composition', () => {
  const markup = renderToStaticMarkup(
    <FlowSaveBeforeFrame
      rootTestId="legacy-frame"
      previewTestId="legacy-preview"
      previewRowTestId="legacy-row"
      title="기존 계획"
      resultLabel="할 일 1개"
      itemCount={1}
      previewRows={[{ id: 'item-1', title: '준비하기' }]}
      desktopCatalog={<nav data-testid="must-not-render">catalog</nav>}
      composition="legacy"
    />,
  );

  assert.match(markup, /data-experience-architecture="hybrid"/u);
  assert.doesNotMatch(markup, /must-not-render/u);
  assert.doesNotMatch(markup, /data-approved-desktop-composition/u);
});

test('artifact-first callers without a desktop catalog retain the existing result-context composition', () => {
  const markup = renderToStaticMarkup(
    <FlowSaveBeforeFrame
      rootTestId="artifact-frame"
      previewTestId="artifact-preview"
      previewRowTestId="artifact-row"
      title="기존 결과"
      resultLabel="할 일 1개"
      itemCount={1}
      previewRows={[{ id: 'item-1', title: '준비하기' }]}
      artifactPreview={<div>result</div>}
      setup={<div>context</div>}
      composition="artifact-first"
    />,
  );

  assert.match(markup, /class="mt-4 grid gap-4 lg:grid-cols-\[minmax\(0,1fr\)_minmax\(18rem,0\.42fr\)\] lg:items-start lg:gap-7"/u);
  assert.doesNotMatch(markup, /flow-save-before-desktop-catalog/u);
  assert.doesNotMatch(markup, /data-approved-desktop-composition/u);
  assert.doesNotMatch(markup, /data-workspace-breakpoints/u);
});
