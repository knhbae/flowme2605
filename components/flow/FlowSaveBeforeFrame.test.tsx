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
