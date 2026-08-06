import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { cloneSeedBundles } from '@/lib/flow/storage';
import { ArtifactPreview } from './ArtifactPreview';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function renderArtifactPreview(q3CopyEnabled: boolean): string {
  const bundle = cloneSeedBundles()[0];
  assert.ok(bundle);
  return renderToStaticMarkup(
    <ArtifactPreview bundle={bundle} q3CopyEnabled={q3CopyEnabled} />,
  );
}

test('Q3 artifact preview uses plan wording in its visible and accessible headings', () => {
  const markup = renderArtifactPreview(true);

  assert.match(markup, /aria-label="계획 결과 미리보기"/u);
  assert.match(markup, />이 계획으로 만들 결과</u);
  assert.doesNotMatch(markup, /Flow artifact preview|이 Flow가 만들어주는 것/u);
});

test('q3Copy off restores the prior artifact preview aria label and eyebrow', () => {
  const markup = renderArtifactPreview(false);

  assert.match(markup, /aria-label="Flow artifact preview"/u);
  assert.match(markup, />이 Flow가 만들어주는 것</u);
  assert.doesNotMatch(markup, /aria-label="계획 결과 미리보기"|>이 계획으로 만들 결과/u);
});
