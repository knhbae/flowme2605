import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { buildSourceBackedFlowMapPublishPackage } from '@/lib/flow/source-backed-my-flow';
import { SourceBackedFlowMapChooseChildExperience } from './SourceBackedFlowMapChooseChildExperience';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test('choose-child selector precedes the full result and describes the existing default honestly', () => {
  const publishPackage = buildSourceBackedFlowMapPublishPackage('curated-opic-mock-course');
  assert.ok(publishPackage);
  const selectedChild = publishPackage.public.childFlows[0];
  assert.ok(selectedChild);

  const markup = renderToStaticMarkup(
    <SourceBackedFlowMapChooseChildExperience
      publishPackage={publishPackage}
      displayTitle={publishPackage.public.title}
      sourceLabel="원문 보기"
    />,
  );
  const selectorIndex = markup.indexOf('data-testid="flow-map-choose-child"');
  const resultIndex = markup.indexOf('data-testid="public-flow-capability-result"');
  const firstRowIndex = markup.indexOf('data-testid="flow-capability-artifact-preview-row"');

  assert.ok(selectorIndex >= 0);
  assert.ok(resultIndex > selectorIndex);
  assert.ok(firstRowIndex > resultIndex);
  assert.equal(markup.match(/data-testid="flow-map-choose-child"/gu)?.length, 1);
  assert.equal(markup.match(/data-testid="flow-map-child-choice"/gu)?.length, 2);
  assert.match(markup, /확인할 계획/u);
  assert.match(markup, new RegExp(`현재 ${selectedChild.title} 선택됨`, 'u'));
  assert.match(markup, new RegExp(`# ${selectedChild.title}`, 'u'));
  assert.match(markup, /## 2주 계획표/u);
  assert.doesNotMatch(markup, /# 오픽 모의고사 2주\/1달 계획표/u);
  assert.doesNotMatch(markup, /## 오픽 모의고사 2주 계획표 · 2주 계획표/u);
  assert.doesNotMatch(markup, /먼저 계획 하나를 고르세요/u);
  if (publishPackage.public.choiceCopy?.heading) {
    assert.ok(!markup.includes(publishPackage.public.choiceCopy.heading));
  }
});
