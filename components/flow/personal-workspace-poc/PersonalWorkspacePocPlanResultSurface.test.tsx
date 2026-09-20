import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PERSONAL_WORKSPACE_POC_VERSION, toPersonalWorkspacePocFlowRef, toPersonalWorkspacePocFlowItemRef,
  type PersonalWorkspacePocFlow,
} from '@/lib/flow/personal-workspace-poc-contract';
import { createPersonalWorkspacePocState } from '@/lib/flow/personal-workspace-poc-state';
import { openPersonalWorkspacePocPlanEditor, type PersonalWorkspacePocPlanDraft } from '@/lib/flow/personal-workspace-poc-plan-editor';
import { summarizePersonalWorkspacePocPlanDraftChanges } from '@/lib/flow/personal-workspace-poc-editor-receipt';
import {
  createPersonalWorkspacePocPlanDisplay,
  type PersonalWorkspacePocPlanDisplay, type PersonalWorkspacePocPlanDisplayInput,
} from '@/lib/flow/personal-workspace-poc-plan-display';
import { PersonalWorkspacePocPlanResultSurface } from './PersonalWorkspacePocPlanResultSurface';
import {
  PersonalWorkspacePocSourceUpdateReview,
  type PersonalWorkspacePocSourceUpdateReviewProps,
} from './PersonalWorkspacePocSourceUpdateReview';

const CREATED_AT = '2026-09-03T00:00:00.000Z';

// Genuine opener and summary; no storage commit or mounted React lifecycle in this suite.
function fixture(size = 1, twoFields = false, flowTitle = false) {
  const savedCopyId = 'ssr-private-copy', flowId = 'ssr-private-flow';
  const flow: PersonalWorkspacePocFlow = {
    ref: toPersonalWorkspacePocFlowRef(savedCopyId, flowId), savedCopyId, flowId,
    origin: 'personal-draft', sourceSlug: 'PRIVATE_SOURCE_SLUG_NOT_FOR_UI', title: '원래 계획',
    items: Array.from({ length: size }, (_, index) => ({
      ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, `task-${index}`),
      savedCopyId, flowId, itemId: `task-${index}`, title: `할 일 ${index + 1}`, sourceOrder: index,
    })),
  };
  const state = createPersonalWorkspacePocState(CREATED_AT);
  const opened = openPersonalWorkspacePocPlanEditor({
    baseModel: { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [flow] }, state,
    stateRaw: JSON.stringify(state), flowRef: flow.ref,
  });
  if (!opened.ok) assert.fail(opened.failure.code);
  const draft = flow.items.reduce<PersonalWorkspacePocPlanDraft>((current, item, index) => ({
    ...current, items: { ...current.items, [item.ref]: { ...current.items[item.ref],
      memo: { mode: 'override', value: `변경된 메모 ${index + 1}` },
      ...(twoFields ? { schedule: { mode: 'fixed_date' as const, date: '2026-09-05' } } : {}),
    } },
  }), { ...opened.draft, ...(flowTitle ? { title: { mode: 'override' as const, value: '내 계획' } } : {}) });
  const summary = summarizePersonalWorkspacePocPlanDraftChanges({ sourceFlow: flow, baseline: opened.draft, draft });
  const input: PersonalWorkspacePocPlanDisplayInput = {
    receiptId: 'ssr-result-1', intentId: 'ssr-intent-1', operation: 'commit-personal-plan', status: 'success',
    createdAt: CREATED_AT, scopeRef: flow.ref, ...summary, affectedCount: summary.affectedRefs.length,
    stateRevisionBefore: 0, stateRevisionAfter: 1, targetWriteCount: 1, supportWriteCount: 4,
    rollback: 'not-needed', undoLabel: '이 변경 되돌리기',
  };
  return { flow, input };
}

function issue(value: ReturnType<typeof fixture>, patch: Partial<PersonalWorkspacePocPlanDisplayInput> = {}) {
  const made = createPersonalWorkspacePocPlanDisplay({ ...value.input, ...patch }, value.flow);
  if (!made.ok) assert.fail(made.error);
  return made.display;
}

function nonCommitted(value: ReturnType<typeof fixture>, status: 'preview' | 'saving' | 'noop' | 'failure' | 'canceled') {
  const { undoLabel: _undoLabel, ...input } = value.input;
  return {
    ...input, status, stateRevisionAfter: 0, targetWriteCount: 0, supportWriteCount: 0,
    ...(status === 'failure' ? { errorCode: 'storage-failed' } : {}),
    ...(status === 'canceled' ? { returnContext: 'flow-detail' as const } : {}),
    ...(status === 'noop' ? { changes: [], affectedRefs: [], affectedCount: 0 } : {}),
  };
}

function issueStatus(value: ReturnType<typeof fixture>, status: Parameters<typeof nonCommitted>[1]) {
  const made = createPersonalWorkspacePocPlanDisplay(nonCommitted(value, status), value.flow);
  if (!made.ok) assert.fail(made.error);
  return made.display;
}

const count = (html: string, pattern: RegExp) => [...html.matchAll(pattern)].length;
const render = (display: PersonalWorkspacePocPlanDisplay, props: Omit<React.ComponentProps<typeof PersonalWorkspacePocPlanResultSurface>, 'display'> = {}) =>
  renderToStaticMarkup(<PersonalWorkspacePocPlanResultSurface display={display} {...props} />);

test('PRS01 SSR success separates changed fields from exact Flow and Item owners with one live status', () => {
  const value = fixture(1, true, true);
  let undoCalls = 0, dismissCalls = 0;
  const html = render(issue(value), { onUndo: () => { undoCalls += 1; }, onDismiss: () => { dismissCalls += 1; } });
  assert.match(html, /변경 3건 · Flow 1개 · 할 일 1개/u);
  for (const [key, expected] of [['affected-count', 2], ['changed-field-count', 3], ['flow-count', 1], ['item-count', 1], ['target-write-count', 1], ['support-write-count', 4]]) {
    assert.ok(html.includes(`data-${key}="${expected}"`));
  }
  assert.equal(count(html, /role="status"/gu), 1);
  assert.equal(count(html, /aria-live="polite"/gu), 1);
  assert.equal(count(html, /<li /gu), 3);
  assert.match(html, /personal-workspace-editor-receipt-undo/u);
  assert.equal(undoCalls, 0); assert.equal(dismissCalls, 0);
});

test('PRS02 SSR 101 and 102 fields render only the first ten rows while keeping full counts and paging totals', () => {
  for (const [size, twoFields, fieldCount] of [[101, false, 101], [51, true, 102]] as const) {
    const value = fixture(size, twoFields);
    const display = issue(value);
    const before = JSON.stringify(display);
    const html = render(display);
    assert.equal(count(html, /<li /gu), 10);
    assert.ok(html.includes(`변경 ${fieldCount}건 · Flow 0개 · 할 일 ${size}개`));
    assert.ok(html.includes(`data-changed-field-count="${fieldCount}"`));
    assert.match(html, /data-page-count="11"/u);
    assert.match(html, /1 \/ 11쪽/u);
    assert.match(html, /<button[^>]* disabled=""[^>]*>이전 변경/u);
    assert.match(html, /<button(?![^>]* disabled=)[^>]*>다음 변경/u);
    assert.doesNotMatch(html, /변경된 메모 101|ssr-private-copy|ssr-private-flow|PRIVATE_SOURCE_SLUG_NOT_FOR_UI/u);
    for (const ref of display.affectedRefs) assert.equal(html.includes(ref), false);
    assert.equal(JSON.stringify(display), before);
    assert.equal(display.changes.length, fieldCount);
  }
});

test('PRS03 SSR preview stays non-live and has no commit Undo or dismiss controls even when callbacks are supplied', () => {
  const value = fixture(51, true);
  let calls = 0;
  const html = render(issueStatus(value, 'preview'), { onUndo: () => { calls += 1; }, onDismiss: () => { calls += 1; } });
  assert.match(html, /personal-workspace-plan-change-preview/u);
  assert.match(html, /반영 전 확인/u);
  assert.match(html, /변경 102건 · Flow 0개 · 할 일 51개/u);
  assert.match(html, /aria-live="off"/u);
  assert.doesNotMatch(html, /role="status"|role="alert"|receipt-undo|결과 닫기/u);
  assert.equal(count(html, /data-impact-field=/gu), 10);
  assert.equal(calls, 0);
});

test('PRS04 SSR failure announcement can be suppressed for the active editor without inventing retry authority', () => {
  const value = fixture(101);
  const failure = issueStatus(value, 'failure');
  const quiet = render(failure, { announce: false, onUndo: () => assert.fail('SSR must not invoke Undo') });
  assert.match(quiet, /저장하지 못했습니다/u);
  assert.match(quiet, /편집 화면에 남아 있습니다/u);
  assert.match(quiet, /aria-live="off"/u);
  assert.doesNotMatch(quiet, /role="status"|role="alert"|receipt-undo|다시 시도|retryIntent/u);
  assert.equal(count(render(failure), /role="status"/gu), 1);
  const recovery = createPersonalWorkspacePocPlanDisplay({ ...nonCommitted(value, 'failure'), rollback: 'recovery-required', supportWriteCount: 2 }, value.flow);
  if (!recovery.ok) assert.fail(recovery.error);
  assert.match(render(recovery.display), /새로고침한 뒤 복구 상태를 확인/u);
});

test('PRS05 SSR canceled 101 fields renders the full cancellation count and zero writes without a v1-cap throw', () => {
  const value = fixture(101);
  const html = render(issueStatus(value, 'canceled'), { onUndo: () => assert.fail('canceled is not Undo authority'), onDismiss: () => undefined });
  assert.match(html, /data-receipt-status="canceled"/u);
  assert.match(html, /준비한 변경 101건을 버렸습니다/u);
  assert.match(html, /저장된 내용은 바뀌지 않았습니다/u);
  assert.match(html, /data-target-write-count="0"/u);
  assert.match(html, /data-support-write-count="0"/u);
  assert.equal(count(html, /<li /gu), 10);
  assert.match(html, /결과 닫기/u);
  assert.doesNotMatch(html, /receipt-undo/u);
});

test('PRS06 SSR saving noop and undone remain distinct; only actual success is offered an Undo button', () => {
  const value = fixture();
  const undone = issue(value, { status: 'undone', receiptId: 'ssr-result-undo', undoOfReceiptId: value.input.receiptId });
  const cases = [
    [issueStatus(value, 'saving'), '저장하고 있습니다'],
    [issueStatus(value, 'noop'), '같은 내용이라 저장하지 않았습니다'],
    [undone, '이전 상태로 되돌렸습니다'],
  ] as const;
  for (const [display, message] of cases) {
    const html = render(display, { onUndo: () => assert.fail('render cannot act') });
    assert.ok(html.includes(message));
    assert.equal(count(html, /role="status"/gu), 1);
    assert.doesNotMatch(html, /receipt-undo/u);
    if (display.status === 'noop') { assert.equal(count(html, /<li /gu), 0); assert.doesNotMatch(html, /변경 목록 페이지/u); }
  }
});

test('PRS07 SSR escapes caller display strings and does not serialize display DTO or identity data', () => {
  const value = fixture();
  const display = issue(value, { changes: [{ ...value.input.changes[0], label: '<b>메모 & "제목"</b>', before: '<script>bad()</script>', after: '<img src=x onerror=bad()>' }] });
  const html = render(display);
  assert.match(html, /&lt;b&gt;메모 &amp; &quot;제목&quot;&lt;\/b&gt;/u);
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/u);
  assert.match(html, /&lt;img src=x onerror=bad\(\)&gt;/u);
  // Public intent/operation diagnostics identify an issued display, not the
  // private attempt, storage guard, draft, or retry capability.
  assert.doesNotMatch(html, /<script|<img|ssr-result-1|ssr-private-copy|PRIVATE_SOURCE_SLUG_NOT_FOR_UI|affectedRefs|scopeRef|stateRaw|retryIntent/u);
  assert.match(html, /data-intent-id="ssr-intent-1"/u);
  assert.match(html, /data-operation="commit-personal-plan"/u);
  assert.match(html, /data-plan-display-contract="flowme-personal-workspace-plan-display-v1"/u);
});

test('PRS08 SSR rejects cloned non-issued display and returns a safe non-live fallback without callbacks', () => {
  const display = issue(fixture());
  const cloned = JSON.parse(JSON.stringify(display)) as PersonalWorkspacePocPlanDisplay;
  let calls = 0;
  const html = render(cloned, { onUndo: () => { calls += 1; }, onDismiss: () => { calls += 1; } });
  assert.match(html, /변경 목록을 표시하지 못했습니다/u);
  assert.doesNotMatch(html, /data-receipt-status|role="status"|role="alert"|<button|<li|저장 완료/u);
  assert.equal(calls, 0);
});

function sourceBannerFixture(onAction: () => void): PersonalWorkspacePocSourceUpdateReviewProps {
  return {
    candidate: { changeCount: 1 },
    changes: [{ changeId: 'source-title', kind: 'changed', label: '제목', baseValue: '이전 제목', workingValue: '내 제목', incomingValue: '새 제목' }],
    resolutions: { 'source-title': 'keep-working' }, selectedChangeId: 'source-title', status: 'pending', open: false,
    onOpen: onAction, onDefer: onAction, onSelectChange: onAction, onResolve: onAction,
    onApply: onAction, onRetry: onAction, onRefreshCandidate: onAction, onUndo: onAction,
  };
}

test('PRS09 SSR source banner defaults to existing status or alert announcements; explicit true is equivalent', () => {
  let calls = 0;
  const props = sourceBannerFixture(() => { calls += 1; });
  for (const status of ['pending', 'applying', 'applied', 'undoing', 'failed', 'stale'] as const) {
    const implicit = renderToStaticMarkup(<PersonalWorkspacePocSourceUpdateReview {...props} status={status} />);
    const explicit = renderToStaticMarkup(<PersonalWorkspacePocSourceUpdateReview {...props} status={status} announceBanner />);
    assert.equal(explicit, implicit);
    const banner = implicit.match(/<section[^>]*data-testid="personal-workspace-source-update-banner"[^>]*>/u)?.[0];
    assert.ok(banner);
    const error = status === 'failed' || status === 'stale';
    assert.ok(banner.includes(`role="${error ? 'alert' : 'status'}"`));
    assert.ok(banner.includes(`aria-live="${error ? 'assertive' : 'polite'}"`));
    assert.equal(count(implicit, /role="(?:status|alert)"/gu), 1);
    assert.doesNotMatch(implicit, /role="dialog"/u);
  }
  assert.equal(calls, 0);
});

test('PRS10 SSR announceBanner false silences only the banner while dialog error and resolution status stay intact', () => {
  let calls = 0;
  const props = sourceBannerFixture(() => { calls += 1; });
  for (const status of ['pending', 'failed', 'stale'] as const) {
    const closed = renderToStaticMarkup(<PersonalWorkspacePocSourceUpdateReview {...props} status={status} announceBanner={false} />);
    assert.match(closed, /aria-live="off"/u);
    assert.doesNotMatch(closed, /role="status"|role="alert"|role="dialog"/u);
    assert.match(closed, /새 원문에서 1곳 달라짐/u);
    assert.match(closed, /personal-workspace-source-update-banner-review/u);
    const opened = renderToStaticMarkup(<PersonalWorkspacePocSourceUpdateReview {...props} status={status} announceBanner={false} open />);
    const banner = opened.match(/<section[^>]*data-testid="personal-workspace-source-update-banner"[^>]*>/u)?.[0];
    assert.ok(banner);
    assert.match(banner, /aria-live="off"/u);
    assert.match(banner, /aria-hidden="true"/u);
    assert.doesNotMatch(banner, /role="status"|role="alert"/u);
    assert.equal(count(opened, /role="dialog"/gu), 1);
    assert.equal(count(opened, /role="status"/gu), 1, 'existing dialog resolution status remains');
    assert.equal(count(opened, /role="alert"/gu), status === 'pending' ? 0 : 1);
    if (status === 'failed') assert.match(opened, /personal-workspace-source-update-error/u);
    if (status === 'stale') assert.match(opened, /personal-workspace-source-update-stale/u);
  }
  assert.equal(calls, 0);
});
