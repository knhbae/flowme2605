import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { buildFlowManagementCommandModel } from '@/lib/flow/flow-command-grammar';
import { FlowManagementMenu } from './FlowManagementMenu';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function renderManagementMenu(
  q3CopyEnabled: boolean,
  enforce48pxActions = false,
): string {
  const actions = buildFlowManagementCommandModel({
    archived: false,
    canAdjust: true,
    canReuse: false,
    hasSource: false,
    canBackup: false,
    q3CopyEnabled,
  }).map((action) => ({
    ...action,
    testId: `management-${action.id}`,
  }));

  return renderToStaticMarkup(
    <FlowManagementMenu
      flowTitle="샘플 계획"
      actions={actions}
      testId="management-menu"
      triggerTestId="management-trigger"
      q3CopyEnabled={q3CopyEnabled}
      enforce48pxActions={enforce48pxActions}
    />,
  );
}

test('Q3 management menu uses plan wording for trigger, menu name, and adjust action', () => {
  const markup = renderManagementMenu(true);

  assert.match(markup, /data-testid="management-trigger"/u);
  assert.equal((markup.match(/aria-label="샘플 계획 계획 관리"/gu) ?? []).length, 2);
  assert.match(markup, />계획 관리<\/summary>/u);
  assert.match(markup, /data-testid="management-adjust"[^>]*>[\s\S]*?<span>계획 수정<\/span>/u);
  assert.doesNotMatch(markup, /Flow 관리|Flow 편집/u);
});

test('q3Copy off restores the prior accessible management copy and action label', () => {
  const markup = renderManagementMenu(false);

  assert.equal((markup.match(/aria-label="샘플 계획 Flow 관리"/gu) ?? []).length, 2);
  assert.match(markup, />Flow 관리<\/summary>/u);
  assert.match(markup, /data-testid="management-adjust"[^>]*>[\s\S]*?<span>Flow 편집<\/span>/u);
  assert.doesNotMatch(markup, />계획 관리<\/summary>|<span>계획 수정<\/span>/u);
});

test('48px menu actions are opt-in while legacy actions remain 44px', () => {
  const legacyMarkup = renderManagementMenu(true);
  const approvedMarkup = renderManagementMenu(true, true);
  const legacyActions = legacyMarkup.match(
    /role="menuitem"[^>]*class="[^"]*min-h-11[^"]*"/gu,
  ) ?? [];
  const approvedActions = approvedMarkup.match(
    /role="menuitem"[^>]*class="[^"]*min-h-12[^"]*"/gu,
  ) ?? [];

  assert.equal(legacyActions.length, 2);
  assert.equal(approvedActions.length, 2);
  assert.doesNotMatch(legacyMarkup, /role="menuitem"[^>]*class="[^"]*min-h-12/u);
  assert.doesNotMatch(approvedMarkup, /role="menuitem"[^>]*class="[^"]*min-h-11/u);
});
