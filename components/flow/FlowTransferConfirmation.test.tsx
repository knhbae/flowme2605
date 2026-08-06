import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type {
  ResultTransferRequest,
  ResultTransferRunOutcome,
} from '@/lib/flow/result-transfer';
import {
  FlowTransferConfirmation,
  FlowTransferOmissionDetails,
} from './FlowTransferConfirmation';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const callbacks = {
  onConfirm: () => undefined,
  onCancel: () => undefined,
  onRetryEffect: () => undefined,
  onRetryReceipt: () => undefined,
  onSaveRecovery: () => undefined,
  onAcknowledge: () => undefined,
};

function buildRequest(
  route: ResultTransferRequest['route'] = 'saved_transfer',
): ResultTransferRequest {
  return {
    schemaVersion: 1,
    requestId: `${route}:request-1`,
    route,
    persistence: route === 'saved_transfer' ? 'persistent_receipt' : 'session',
    ...(route === 'saved_transfer' ? { savedPlanId: 'flow-one' } : {}),
    createdAt: '2030-09-01T00:00:00.000Z',
    snapshot: {
      kind: route === 'saved_transfer' ? 'effective_execution' : 'effective_authoring',
      version: 'source:v1|personal:v1|execution:v1',
      hash: 'snapshot-hash-1',
      identity: {
        flowId: 'flow-1',
        flowSlug: 'flow-one',
        sourceVersion: 'source:v1',
        personalVersion: 'personal:v1',
        executionVersion: 'execution:v1',
      },
    },
    scope: { kind: 'flow' },
    format: 'calendar',
    artifactKind: 'calendar_ics',
    itemIds: ['item-a', 'item-b', 'item-c'],
    itemCount: 3,
    projectionOutputCount: 2,
    outputCount: 2,
    omitted: {
      heldItemIds: ['item-c'],
      unavailableItemIds: [],
      excludedItemIds: [],
      reasonsByItemId: {
        'item-c': '날짜를 정하기 전에는 캘린더 결과를 만들지 않습니다.',
      },
    },
    oneWay: true,
    duplicateRisk: true,
    artifact: {
      target: 'local_file',
      mediaType: 'text/calendar;charset=utf-8',
      filename: 'flow-one.ics',
      payload: 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n',
      payloadHash: 'payload-hash-1',
      payloadByteLength: 36,
      itemIds: ['item-a', 'item-b', 'item-c'],
      itemCount: 3,
      outputCount: 2,
    },
  };
}

function outcome(state: ResultTransferRunOutcome['state']): ResultTransferRunOutcome {
  return {
    state,
    ...(state === 'failed'
      ? {
          failure: {
            code: 'artifact_failed',
            stage: 'artifact',
            message: '파일을 열지 못했어요.',
            retryable: true,
          },
        }
      : {}),
    receiptRetryAvailable: state === 'partial_local',
  } as unknown as ResultTransferRunOutcome;
}

function tagsByTestId(markup: string, testId: string): string[] {
  return markup.match(new RegExp(`<[^>]+data-testid="${testId}"[^>]*>`, 'gu')) ?? [];
}

function primaryActionCount(markup: string): number {
  return (markup.match(/data-action-priority="primary"/gu) ?? []).length;
}

test('saved transfer confirmation exposes immutable identity, count, loss, one-way, and duplicate risk', () => {
  const request = buildRequest();
  const markup = renderToStaticMarkup(
    <FlowTransferConfirmation
      request={request}
      receiptStorageKey="flow:export-receipts:v1:flow-one"
      returnFocusSelector="[data-testid='my-flow-export-entry']"
      {...callbacks}
    />,
  );

  assert.match(markup, /data-transfer-state="confirming"/u);
  assert.match(markup, /data-transfer-route="saved_transfer"/u);
  assert.match(markup, /data-transfer-persistence="persistent_receipt"/u);
  assert.match(markup, /data-transfer-request-id="saved_transfer:request-1"/u);
  assert.match(markup, /data-transfer-snapshot-kind="effective_execution"/u);
  assert.match(markup, /data-transfer-snapshot-hash="snapshot-hash-1"/u);
  assert.match(markup, /data-transfer-format="calendar"/u);
  assert.match(markup, /data-transfer-item-ids="item-a,item-b,item-c"/u);
  assert.match(markup, /data-transfer-item-count="3"/u);
  assert.match(markup, /data-transfer-projection-output-count="2"/u);
  assert.match(markup, /data-transfer-output-count="2"/u);
  assert.match(markup, /data-transfer-omitted-count="1"/u);
  assert.match(markup, /data-transfer-one-way="true"/u);
  assert.match(markup, /data-transfer-duplicate-risk="true"/u);
  assert.match(markup, /data-receipt-storage-key="flow:export-receipts:v1:flow-one"/u);
  assert.match(markup, /data-snapshot-kind="effective_execution"/u);
  assert.match(markup, /data-snapshot-version="source:v1\|personal:v1\|execution:v1"/u);
  assert.match(markup, /data-snapshot-hash="snapshot-hash-1"/u);
  assert.match(markup, /data-scope="flow"/u);
  assert.match(markup, /data-format="calendar"/u);
  assert.match(markup, /data-destination="calendar"/u);
  assert.match(markup, /data-item-ids="item-a,item-b,item-c"/u);
  assert.match(markup, /data-projection-output-count="2"/u);
  assert.match(markup, /data-output-count="2"/u);
  assert.match(markup, /data-outcome="confirming"/u);
  assert.match(markup, /data-testid="flow-transfer-format"[^>]*>캘린더 파일/u);
  assert.match(markup, /data-testid="flow-transfer-item-count"[^>]*>3개/u);
  assert.match(markup, /data-testid="flow-transfer-output-count"[^>]*>2개/u);
  assert.match(markup, /data-testid="flow-transfer-loss"/u);
  assert.match(markup, /data-transfer-omitted-item-ids="item-c"/u);
  assert.match(markup, /data-testid="flow-transfer-loss-reason" data-item-ids="item-c"/u);
  assert.match(markup, /날짜를 정하기 전에는 캘린더 결과를 만들지 않습니다\. · 1개/u);
  assert.match(markup, /data-testid="flow-transfer-one-way-warning"/u);
  assert.match(markup, /data-testid="flow-transfer-duplicate-warning"/u);
  assert.match(markup, /data-testid="flow-transfer-one-way-help-trigger"/u);
  assert.match(markup, /aria-label="일방향 결과 상세 보기"/u);
  assert.match(markup, /aria-haspopup="dialog"/u);
  assert.match(markup, /aria-expanded="false"/u);
  assert.equal(tagsByTestId(markup, 'my-flow-transfer-confirm').length, 1);
  assert.equal(tagsByTestId(markup, 'my-flow-transfer-cancel').length, 1);
  assert.equal(primaryActionCount(markup), 1);
  assert.doesNotMatch(markup, /data-testid="flow-transfer-public-not-saved"/u);
});

test('omission details group matching reasons and preserve every omitted Item ID', () => {
  const markup = renderToStaticMarkup(
    <FlowTransferOmissionDetails
      omitted={{
        heldItemIds: ['held-a', 'held-b'],
        unavailableItemIds: ['unavailable-a'],
        excludedItemIds: ['excluded-a'],
        reasonsByItemId: {
          'held-a': '날짜를 먼저 정해야 합니다.',
          'held-b': '날짜를 먼저 정해야 합니다.',
          'unavailable-a': '이 형식은 반복 규칙을 보존하지 못합니다.',
          'excluded-a': '   ',
        },
      }}
      testId="persisted-loss"
    />,
  );

  assert.match(markup, /data-testid="persisted-loss"/u);
  assert.match(markup, /data-transfer-held-count="2"/u);
  assert.match(markup, /data-transfer-unavailable-count="1"/u);
  assert.match(markup, /data-transfer-excluded-count="1"/u);
  assert.match(markup, /data-transfer-omitted-count="4"/u);
  assert.match(markup, /data-transfer-omitted-item-ids="held-a,held-b,unavailable-a,excluded-a"/u);
  assert.equal(tagsByTestId(markup, 'flow-transfer-loss-reason').length, 3);
  assert.match(markup, /data-item-ids="held-a,held-b">날짜를 먼저 정해야 합니다\. · 2개/u);
  assert.match(markup, /data-item-ids="unavailable-a">이 형식은 반복 규칙을 보존하지 못합니다\. · 1개/u);
  assert.match(markup, /data-item-ids="excluded-a">현재 계획에서 제외한 항목입니다\. · 1개/u);
});

test('public quick keeps the not-saved disclosure and save recovery next to one primary effect', () => {
  const request = {
    ...buildRequest('public_quick'),
    format: 'memo' as const,
    artifactKind: 'portable_memo' as const,
    projectionOutputCount: 3,
    outputCount: 3,
    omitted: {
      heldItemIds: [],
      unavailableItemIds: [],
      excludedItemIds: [],
      reasonsByItemId: {},
    },
    artifact: {
      ...buildRequest('public_quick').artifact,
      target: 'clipboard' as const,
      mediaType: 'text/plain;charset=utf-8',
      filename: undefined,
      outputCount: 3,
    },
  } satisfies ResultTransferRequest;
  const markup = renderToStaticMarkup(
    <FlowTransferConfirmation request={request} {...callbacks} />,
  );

  assert.match(markup, /data-transfer-route="public_quick"/u);
  assert.match(markup, /data-transfer-persistence="session"/u);
  assert.match(markup, /data-transfer-target="clipboard"/u);
  assert.match(markup, /data-testid="flow-transfer-public-not-saved"/u);
  assert.match(markup, /내 계획에 저장되지 않음/u);
  assert.match(markup, /먼저 내 계획에 저장하세요/u);
  assert.match(markup, /data-testid="public-flow-quick-result-save-recovery"/u);
  assert.match(markup, /내 계획에 저장하고 이어가기/u);
  assert.match(markup, /data-testid="public-flow-quick-result-execute"[^>]*>\s*복사하기/u);
  assert.equal(primaryActionCount(markup), 1);
});

test('q3 copy rollback restores transfer copy and removes only the optional caution disclosure', () => {
  const publicMarkup = renderToStaticMarkup(
    <FlowTransferConfirmation
      request={buildRequest('public_quick')}
      q3CopyEnabled={false}
      {...callbacks}
    />,
  );
  assert.match(publicMarkup, /data-testid="flow-transfer-one-way-warning"/u);
  assert.match(publicMarkup, /data-testid="flow-transfer-duplicate-warning"/u);
  assert.doesNotMatch(publicMarkup, /data-testid="flow-transfer-one-way-help-trigger"/u);
  assert.match(publicMarkup, /FlowMe에 저장되지 않음/u);
  assert.match(publicMarkup, /먼저 내 Flow에 저장하세요/u);
  assert.match(publicMarkup, /내 Flow에 저장하고 이어가기/u);

  const succeededMarkup = renderToStaticMarkup(
    <FlowTransferConfirmation
      request={buildRequest()}
      outcome={outcome('succeeded')}
      q3CopyEnabled={false}
      {...callbacks}
    />,
  );
  assert.match(succeededMarkup, /data-testid="flow-transfer-success-close"[^>]*>\s*다른 형식 보기/u);
});

test('pending locks dismissal and actions while exposing a busy live region', () => {
  const markup = renderToStaticMarkup(
    <FlowTransferConfirmation request={buildRequest()} pending {...callbacks} />,
  );
  const closeTag = tagsByTestId(markup, 'my-flow-transfer-confirmation-close')[0] ?? '';
  const cancelTag = tagsByTestId(markup, 'my-flow-transfer-cancel')[0] ?? '';
  const confirmTag = tagsByTestId(markup, 'my-flow-transfer-confirm')[0] ?? '';

  assert.match(markup, /data-transfer-state="pending"/u);
  assert.match(markup, /aria-busy="true"/u);
  assert.match(markup, /data-testid="flow-transfer-pending-status"/u);
  assert.match(closeTag, /disabled=""/u);
  assert.match(cancelTag, /disabled=""/u);
  assert.match(confirmTag, /disabled=""/u);
  assert.match(confirmTag, /aria-busy="true"/u);
  assert.equal(primaryActionCount(markup), 1);
});

test('effect failure offers only effect retry while partial-local offers receipt-only retry', () => {
  const failedMarkup = renderToStaticMarkup(
    <FlowTransferConfirmation
      request={buildRequest()}
      outcome={outcome('failed')}
      errorMessage="파일을 열지 못했어요."
      {...callbacks}
    />,
  );
  assert.match(failedMarkup, /data-transfer-state="failed"/u);
  assert.match(failedMarkup, /data-testid="flow-transfer-error"/u);
  assert.match(failedMarkup, /role="alert"/u);
  assert.match(failedMarkup, /data-testid="flow-transfer-retry"/u);
  assert.doesNotMatch(failedMarkup, /data-testid="flow-transfer-receipt-retry"/u);
  assert.equal(primaryActionCount(failedMarkup), 1);

  const partialMarkup = renderToStaticMarkup(
    <FlowTransferConfirmation
      request={buildRequest()}
      outcome={outcome('partial_local')}
      errorMessage="결과 기록 저장이 거부됐어요."
      {...callbacks}
    />,
  );
  assert.match(partialMarkup, /data-transfer-state="partial_local"/u);
  assert.match(partialMarkup, /data-transfer-artifact-created="true"/u);
  assert.match(partialMarkup, /data-transfer-receipt-persisted="false"/u);
  assert.match(partialMarkup, /data-testid="my-flow-transfer-retry-receipt"/u);
  assert.match(partialMarkup, /data-transfer-retry-stage="receipt-only"/u);
  assert.doesNotMatch(partialMarkup, /data-testid="flow-transfer-retry"/u);
  assert.equal(primaryActionCount(partialMarkup), 1);

  const blockedPartialMarkup = renderToStaticMarkup(
    <FlowTransferConfirmation
      request={buildRequest()}
      outcome={{
        ...outcome('partial_local'),
        receiptRetryAvailable: false,
      } as ResultTransferRunOutcome}
      errorMessage="기록 저장소를 안전하게 읽을 수 없어요."
      {...callbacks}
    />,
  );
  assert.match(blockedPartialMarkup, /data-transfer-state="partial_local"/u);
  assert.doesNotMatch(blockedPartialMarkup, /data-testid="my-flow-transfer-retry-receipt"/u);
  assert.equal(primaryActionCount(blockedPartialMarkup), 0);
});

test('non-retryable guard failure removes the impossible effect retry action', () => {
  const nonRetryableOutcome = {
    ...outcome('failed'),
    failure: {
      code: 'snapshot_changed',
      stage: 'guard',
      message: '확인한 계획이 바뀌었어요. 창을 닫고 현재 결과를 다시 확인해 주세요.',
      retryable: false,
    },
  } as ResultTransferRunOutcome;
  const markup = renderToStaticMarkup(
    <FlowTransferConfirmation
      request={buildRequest()}
      outcome={nonRetryableOutcome}
      {...callbacks}
    />,
  );

  assert.match(markup, /data-transfer-state="failed"/u);
  assert.match(markup, /현재 결과를 다시 확인해 주세요/u);
  assert.doesNotMatch(markup, /data-testid="flow-transfer-retry"/u);
  assert.doesNotMatch(markup, /같은 파일 다시 만들기/u);
  assert.equal(tagsByTestId(markup, 'my-flow-transfer-cancel').length, 1);
  assert.equal(primaryActionCount(markup), 0);
});

test('success distinguishes persistent saved receipt from session-only public confirmation', () => {
  const savedMarkup = renderToStaticMarkup(
    <FlowTransferConfirmation
      request={buildRequest()}
      outcome={outcome('succeeded')}
      {...callbacks}
    />,
  );
  assert.match(savedMarkup, /data-testid="flow-transfer-success"/u);
  assert.match(savedMarkup, /data-transfer-receipt-persistence="persistent_receipt"/u);
  assert.match(savedMarkup, /결과 기록을 남겼어요/u);
  assert.match(savedMarkup, /data-testid="flow-transfer-success-close"/u);
  assert.match(savedMarkup, /data-testid="flow-transfer-success-close"[^>]*>\s*다른 형식 보기/u);
  assert.equal(primaryActionCount(savedMarkup), 1);
  assert.doesNotMatch(savedMarkup, /data-testid="my-flow-transfer-confirm"/u);

  const quickMarkup = renderToStaticMarkup(
    <FlowTransferConfirmation
      request={buildRequest('public_quick')}
      outcome={outcome('succeeded')}
      {...callbacks}
    />,
  );
  assert.match(quickMarkup, /data-transfer-receipt-persistence="session"/u);
  assert.match(quickMarkup, /내 계획에는 저장되지 않았어요/u);
  assert.match(quickMarkup, /data-testid="flow-transfer-success-close"[^>]*>\s*닫기/u);
  assert.equal(primaryActionCount(quickMarkup), 1);
});

test('saved success returns focus to the chosen format while other states keep the opener', () => {
  const returnFocusSelector = "[data-testid='my-flow-export-entry']";
  const successReturnFocusSelector = "[data-testid='my-flow-export-calendar']";
  const confirmingMarkup = renderToStaticMarkup(
    <FlowTransferConfirmation
      request={buildRequest()}
      returnFocusSelector={returnFocusSelector}
      successReturnFocusSelector={successReturnFocusSelector}
      {...callbacks}
    />,
  );
  assert.match(
    confirmingMarkup,
    /data-transfer-return-focus-selector="\[data-testid=&#x27;my-flow-export-entry&#x27;\]"/u,
  );

  const savedSuccessMarkup = renderToStaticMarkup(
    <FlowTransferConfirmation
      request={buildRequest()}
      outcome={outcome('succeeded')}
      returnFocusSelector={returnFocusSelector}
      successReturnFocusSelector={successReturnFocusSelector}
      {...callbacks}
    />,
  );
  assert.match(
    savedSuccessMarkup,
    /data-transfer-return-focus-selector="\[data-testid=&#x27;my-flow-export-calendar&#x27;\]"/u,
  );

  const publicSuccessMarkup = renderToStaticMarkup(
    <FlowTransferConfirmation
      request={buildRequest('public_quick')}
      outcome={outcome('succeeded')}
      returnFocusSelector={returnFocusSelector}
      successReturnFocusSelector={successReturnFocusSelector}
      {...callbacks}
    />,
  );
  assert.match(
    publicSuccessMarkup,
    /data-transfer-return-focus-selector="\[data-testid=&#x27;my-flow-export-entry&#x27;\]"/u,
  );
});
