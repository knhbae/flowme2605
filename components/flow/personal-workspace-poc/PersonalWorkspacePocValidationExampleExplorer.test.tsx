import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG } from '@/lib/flow/personal-workspace-poc-validation-examples';

import {
  PersonalWorkspacePocValidationExampleExplorer,
  buildPersonalWorkspacePocValidationExampleExplorerView,
} from './PersonalWorkspacePocValidationExampleExplorer';

const source = readFileSync(
  new URL('./PersonalWorkspacePocValidationExampleExplorer.tsx', import.meta.url),
  'utf8',
);

const noop = () => undefined;

test('closed explorer renders no dialog', () => {
  const markup = renderToStaticMarkup(
    <PersonalWorkspacePocValidationExampleExplorer
      open={false}
      sourceEmpty
      entries={PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG}
      onApply={noop}
      onClose={noop}
    />,
  );
  assert.equal(markup, '');
});

test('open explorer exposes one named dialog, all 31 rows and the five frozen groups', () => {
  const markup = renderToStaticMarkup(
    <PersonalWorkspacePocValidationExampleExplorer
      open
      sourceEmpty
      entries={PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG}
      onApply={noop}
      onClose={noop}
    />,
  );

  assert.match(markup, /role="dialog"/u);
  assert.match(markup, /aria-modal="true"/u);
  assert.match(markup, /aria-labelledby=/u);
  assert.match(markup, />검증 예시 찾아보기</u);
  assert.match(markup, /고르기만 해서는 원문이 바뀌지 않습니다/u);
  assert.match(markup, /31개 중 31개/u);
  assert.equal((markup.match(/data-testid="validation-example-row"/gu) ?? []).length, 31);
  for (const expected of [
    '작성 형식 1개',
    '실제 콘텐츠 8개',
    '일정·반복 11개',
    '호환·표 6개',
    '오류·예외 입력 5개',
  ]) {
    assert.equal(markup.includes(expected), true, `missing group option: ${expected}`);
  }
  assert.doesNotMatch(markup, /이 예시로 시작/u);
});

test('view builder delegates deterministic query and group filtering without mutating entries', () => {
  const before = JSON.stringify(PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG);
  for (const group of [
    ['authoring-format', 1],
    ['real-content', 8],
    ['schedule-recurrence', 11],
    ['legacy-table', 6],
    ['error-input', 5],
  ] as const) {
    const firstInGroup = PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.find(
      (entry) => entry.groupId === group[0],
    );
    assert.ok(firstInGroup);
    const view = buildPersonalWorkspacePocValidationExampleExplorerView(
      PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG,
      '',
      group[0],
      firstInGroup.exampleId,
    );
    assert.equal(view.visibleEntries.length, group[1]);
    assert.equal(view.selectedEntry?.exampleId, firstInGroup.exampleId);
  }

  const hiddenSelection = buildPersonalWorkspacePocValidationExampleExplorerView(
    PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG,
    '',
    'authoring-format',
    PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.find(
      (entry) => entry.groupId === 'real-content',
    )?.exampleId,
  );
  assert.equal(hiddenSelection.selectedEntry, undefined);
  assert.equal(JSON.stringify(PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG), before);
});

test('browse state stays callback-free and blank-only apply is the sole primary transition', () => {
  assert.match(source, /filterPersonalWorkspacePocValidationExamples\(entries, \{/u);
  assert.match(source, /onClick=\{\(\) => selectEntry\(entry\)\}/u);
  assert.match(source, /disabled=\{!sourceEmpty\}/u);
  assert.match(source, /if \(!sourceEmpty\) return;\s+onApply\(selectedEntry\);/u);
  assert.equal((source.match(/\bonApply\(/gu) ?? []).length, 1);
  assert.match(source, /이 예시로 시작/u);
  assert.match(source, /현재 원문을 덮어쓰지 않도록 적용을 막았습니다/u);
  assert.doesNotMatch(source, /localStorage|sessionStorage|\.clear\(|setItem\(|removeItem\(/u);
});

test('keyboard, focus return, backdrop and one-layer Escape contracts are explicit', () => {
  assert.match(source, /searchInputRef\.current\?\.focus\(\{ preventScroll: true \}\)/u);
  assert.match(source, /event\.key === 'Escape'/u);
  assert.match(source, /if \(selectedEntry\) \{\s+returnToRow\(selectedEntry\.exampleId\);/u);
  assert.match(source, /requestClose\('escape'\)/u);
  assert.match(source, /event\.key !== 'Tab'/u);
  assert.match(source, /window\.matchMedia\('\(max-width: 767px\)'\)/u);
  assert.match(source, /rowRefs\.current\.get\(exampleId\)/u);
  assert.match(source, /event\.target !== event\.currentTarget/u);
  assert.match(source, /requestClose\('backdrop'\)/u);
  assert.match(source, /focus-visible:ring-2/u);
  assert.match(source, /min-h-12/u);
});

test('responsive source preview keeps mobile flow, wide split and long bytes inside the dialog', () => {
  assert.match(source, /h-\[100dvh\]/u);
  assert.match(source, /md:max-w-\[1120px\]/u);
  assert.match(source, /md:grid-cols-\[minmax\(18rem,38fr\)_minmax\(0,62fr\)\]/u);
  assert.match(source, /selectedEntry \? 'hidden md:flex' : 'flex'/u);
  assert.match(source, /selectedEntry \? 'flex' : 'hidden md:flex'/u);
  assert.match(source, /pb-\[max\(1rem,env\(safe-area-inset-bottom\)\)\]/u);
  assert.match(source, /sticky bottom-0/u);
  assert.match(source, /whitespace-pre-wrap/u);
  assert.match(source, /\[overflow-wrap:anywhere\]/u);
  assert.match(source, /expectedOriginalItemCount/u);
  assert.match(source, /expectedMode/u);
  assert.match(source, /expectedPreservation/u);
  assert.match(source, /sourceShape/u);
  assert.match(source, /provenance/u);
  assert.match(source, /upstreamBoundary/u);
  assert.doesNotMatch(source, /네 번째|주 탭|hero|히어로/u);
});
