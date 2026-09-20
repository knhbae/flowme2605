import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  PersonalWorkspacePocSourceUpdateReview,
  getPersonalWorkspacePocSourceUpdateResolutionOptions,
  type PersonalWorkspacePocSourceUpdateChange,
  type PersonalWorkspacePocSourceUpdateReviewProps,
} from './PersonalWorkspacePocSourceUpdateReview';

const source = readFileSync(
  new URL('./PersonalWorkspacePocSourceUpdateReview.tsx', import.meta.url),
  'utf8',
);

const noop = () => undefined;

const changes: readonly PersonalWorkspacePocSourceUpdateChange[] = [
  {
    changeId: 'change-title',
    kind: 'changed',
    label: '제목이 달라졌습니다',
    baseValue: '기존 제목',
    workingValue: '내가 고친 제목',
    incomingValue: '새 원문 제목',
  },
  {
    changeId: 'add-item',
    kind: 'added',
    label: '새 준비물이 추가됐습니다',
    baseValue: null,
    workingValue: null,
    incomingValue: '충전 케이블 챙기기',
  },
  {
    changeId: 'remove-item',
    kind: 'removed',
    label: '준비물 하나가 빠졌습니다',
    baseValue: '종이 지도 챙기기',
    workingValue: '종이 지도 챙기기',
    incomingValue: null,
  },
];

const baseProps: PersonalWorkspacePocSourceUpdateReviewProps = {
  candidate: {
    changeCount: 3,
    userCorrectionCount: 1,
    sourceLabel: '캠핑 준비 원문',
    detectedAtLabel: '방금 확인',
  },
  changes,
  resolutions: {},
  selectedChangeId: 'change-title',
  status: 'pending',
  open: false,
  onOpen: noop,
  onDefer: noop,
  onSelectChange: noop,
  onResolve: noop,
  onApply: noop,
  onRetry: noop,
  onRefreshCandidate: noop,
  onUndo: noop,
};

function render(
  overrides: Partial<PersonalWorkspacePocSourceUpdateReviewProps> = {},
): string {
  return renderToStaticMarkup(
    <PersonalWorkspacePocSourceUpdateReview {...baseProps} {...overrides} />,
  );
}

function buttonTag(markup: string, testId: string): string {
  return markup.match(
    new RegExp(`<button[^>]*data-testid="${testId}"[^>]*>`, 'u'),
  )?.[0] ?? '';
}

function hasDisabledAttribute(tag: string): boolean {
  return /\sdisabled(?:=""|(?=[ >]))/u.test(tag);
}

test('pending candidate is a compact banner with review and defer actions', () => {
  const markup = render();

  assert.match(markup, /data-testid="personal-workspace-source-update-banner"/u);
  assert.match(markup, /새 원문에서 3곳 달라짐/u);
  assert.match(markup, /변경 확인/u);
  assert.match(markup, /나중에/u);
  assert.match(markup, /캠핑 준비 원문 · 방금 확인/u);
  assert.doesNotMatch(markup, /data-testid="personal-workspace-source-update-dialog"/u);
});

test('comparison names Base, working and incoming values without internal product jargon', () => {
  const markup = render({ open: true });

  assert.match(markup, /role="dialog"/u);
  assert.match(markup, /aria-modal="true"/u);
  assert.match(markup, /기준 원문/u);
  assert.match(markup, /기존 제목/u);
  assert.match(markup, /내 작업/u);
  assert.match(markup, /내가 고친 제목/u);
  assert.match(markup, /새 원문/u);
  assert.match(markup, /새 원문 제목/u);
  assert.match(markup, /내 작업 유지/u);
  assert.match(markup, /새 원문 선택/u);
  assert.match(markup, /나중에 결정/u);
  assert.doesNotMatch(markup, /canonical|parser|hash|receipt|revision/iu);
});

test('changed, added and removed rows expose outcome-specific radio choices', () => {
  assert.deepEqual(
    getPersonalWorkspacePocSourceUpdateResolutionOptions('changed').map((option) => option.label),
    ['내 작업 유지', '새 원문 선택', '나중에 결정'],
  );
  assert.deepEqual(
    getPersonalWorkspacePocSourceUpdateResolutionOptions('added').map((option) => option.label),
    ['추가하지 않기', '새 항목 추가', '나중에 결정'],
  );
  assert.deepEqual(
    getPersonalWorkspacePocSourceUpdateResolutionOptions('removed').map((option) => option.label),
    ['이전 항목 유지', '새 원문처럼 제외', '나중에 결정'],
  );

  const addedMarkup = render({ open: true, selectedChangeId: 'add-item' });
  const removedMarkup = render({ open: true, selectedChangeId: 'remove-item' });
  assert.match(addedMarkup, /추가하지 않기/u);
  assert.match(addedMarkup, /새 항목 추가/u);
  assert.match(removedMarkup, /이전 항목 유지/u);
  assert.match(removedMarkup, /새 원문처럼 제외/u);
});

test('apply remains disabled until every change has a final resolution', () => {
  const unresolvedMarkup = render({ open: true });
  const laterMarkup = render({
    open: true,
    resolutions: {
      'change-title': 'keep-working',
      'add-item': 'later',
      'remove-item': 'use-incoming',
    },
  });
  const resolvedMarkup = render({
    open: true,
    resolutions: {
      'change-title': 'keep-working',
      'add-item': 'use-incoming',
      'remove-item': 'keep-working',
    },
  });

  assert.match(unresolvedMarkup, /3곳을 더 결정해야 적용할 수 있습니다/u);
  assert.equal(hasDisabledAttribute(buttonTag(unresolvedMarkup, 'personal-workspace-source-update-apply')), true);
  assert.equal(hasDisabledAttribute(buttonTag(laterMarkup, 'personal-workspace-source-update-apply')), true);
  assert.equal(hasDisabledAttribute(buttonTag(resolvedMarkup, 'personal-workspace-source-update-apply')), false);
  assert.match(resolvedMarkup, /적용 준비 완료/u);
});

test('success offers Undo while stale and failed states keep one explicit recovery path', () => {
  const resolved = {
    'change-title': 'keep-working',
    'add-item': 'use-incoming',
    'remove-item': 'keep-working',
  } as const;
  const successMarkup = render({ status: 'applied', resolutions: resolved });
  const staleMarkup = render({ status: 'stale', open: true, resolutions: resolved });
  const failedMarkup = render({
    status: 'failed',
    open: true,
    resolutions: resolved,
    errorMessage: '네트워크 연결을 확인한 뒤 다시 적용하세요.',
  });

  assert.match(successMarkup, /data-testid="personal-workspace-source-update-banner-undo"/u);
  assert.match(successMarkup, /되돌리기/u);
  assert.doesNotMatch(successMarkup, /data-testid="personal-workspace-source-update-banner-review"/u);

  assert.match(staleMarkup, /현재 작업 기준으로 새 원문을 다시 받아 주세요/u);
  assert.match(staleMarkup, /data-testid="personal-workspace-source-update-refresh"/u);
  assert.equal(hasDisabledAttribute(buttonTag(staleMarkup, 'personal-workspace-source-update-apply')), true);

  assert.match(failedMarkup, /네트워크 연결을 확인한 뒤 다시 적용하세요/u);
  assert.match(failedMarkup, /다시 적용/u);
  assert.equal(hasDisabledAttribute(buttonTag(failedMarkup, 'personal-workspace-source-update-apply')), false);
});

test('responsive drawer-sheet, keyboard containment and local-only presentation contracts are explicit', () => {
  for (const testId of [
    'personal-workspace-source-update-banner',
    'personal-workspace-source-update-banner-review',
    'personal-workspace-source-update-banner-later',
    'personal-workspace-source-update-dialog',
    'personal-workspace-source-update-scroll',
    'personal-workspace-source-update-nav-item',
    'personal-workspace-source-update-change',
    'personal-workspace-source-update-base',
    'personal-workspace-source-update-working',
    'personal-workspace-source-update-incoming',
    'personal-workspace-source-update-unresolved',
    'personal-workspace-source-update-apply',
  ]) {
    assert.equal(source.includes(testId), true, `missing test id: ${testId}`);
  }

  assert.match(source, /data-source-update-presentation="mobile-sheet-desktop-drawer"/u);
  assert.match(source, /rounded-t-\[var\(--flowme-radius-sheet\)\]/u);
  assert.match(source, /min-\[900px\]:items-stretch/u);
  assert.match(source, /min-\[900px\]:h-\[100dvh\]/u);
  assert.match(source, /min-\[900px\]:rounded-none/u);
  assert.match(source, /overflow-y-auto/u);
  assert.match(source, /overscroll-contain/u);
  assert.match(source, /min-h-11/u);

  assert.match(source, /event\.key === 'Escape'/u);
  assert.match(source, /onDefer\('escape'\)/u);
  assert.match(source, /FOCUSABLE_SELECTOR/u);
  assert.match(source, /document\.activeElement/u);
  assert.match(source, /openerRef\.current/u);
  assert.match(source, /focusAfterPaint\(openerRef\.current, practiceReturnFocusSelector,/u);
  assert.match(source, /focusReturnEpoch\.current === epoch/u);
  assert.match(source, /requestAnimationFrame/u);
  assert.match(source, /aria-modal="true"/u);

  assert.doesNotMatch(source, /from '@\/lib\//u);
  assert.doesNotMatch(source, /localStorage|sessionStorage|flow:poc:|flow:map:/u);
});
