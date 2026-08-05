'use client';

import type {
  ResultTransferOmitted,
  ResultTransferRequest,
  ResultTransferRunOutcome,
} from '@/lib/flow/result-transfer';
import { FlowBottomSheet } from './FlowExecutionPrimitives';
import { FlowContextDisclosure } from './FlowContextDisclosure';
import {
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from './flow-ui';
import { Q3_USER_COPY_PROFILE } from '@/lib/flow/q3-user-copy';

type FlowTransferConfirmationProps = {
  request: ResultTransferRequest;
  outcome?: ResultTransferRunOutcome;
  pending?: boolean;
  errorMessage?: string;
  receiptStorageKey?: string;
  returnFocusSelector?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onRetryEffect: () => void;
  onRetryReceipt: () => void;
  onSaveRecovery?: () => void;
  onAcknowledge?: () => void;
  q3CopyEnabled?: boolean;
};

type TransferPresentationState =
  | 'confirming'
  | 'pending'
  | ResultTransferRunOutcome['state'];

const FORMAT_LABELS: Record<ResultTransferRequest['format'], string> = {
  calendar: '캘린더 파일',
  checklist: '체크리스트',
  sheet: '시트',
  memo: '메모',
};

const EFFECT_LABELS: Record<ResultTransferRequest['artifact']['target'], string> = {
  clipboard: '복사하기',
  local_file: '파일 만들기',
};

function getScopeLabel(scope: ResultTransferRequest['scope']): string {
  if (scope.kind === 'selected') return '선택한 항목';
  if (scope.kind === 'item') return '현재 항목';
  return '계획 전체';
}

type FlowTransferOmissionDetailsProps = {
  omitted: ResultTransferOmitted;
  testId?: string;
};

type FlowTransferOmissionReasonGroup = Readonly<{
  reason: string;
  itemIds: readonly string[];
}>;

function getOmittedItemIds(omitted: ResultTransferOmitted): string[] {
  return Array.from(new Set([
    ...omitted.heldItemIds,
    ...omitted.unavailableItemIds,
    ...omitted.excludedItemIds,
  ]));
}

function getOmissionReasonGroups(
  omitted: ResultTransferOmitted,
): FlowTransferOmissionReasonGroup[] {
  const groups = new Map<string, string[]>();
  const seenItemIds = new Set<string>();
  const categories = [
    {
      itemIds: omitted.heldItemIds,
      fallbackReason: '날짜나 추가 입력이 필요합니다.',
    },
    {
      itemIds: omitted.unavailableItemIds,
      fallbackReason: '이 형식으로 옮기기 어렵습니다.',
    },
    {
      itemIds: omitted.excludedItemIds,
      fallbackReason: '현재 계획에서 제외한 항목입니다.',
    },
  ] as const;

  categories.forEach(({ itemIds, fallbackReason }) => {
    itemIds.forEach((itemId) => {
      if (seenItemIds.has(itemId)) return;
      seenItemIds.add(itemId);
      const reason = omitted.reasonsByItemId[itemId]?.trim() || fallbackReason;
      const groupedItemIds = groups.get(reason) ?? [];
      groupedItemIds.push(itemId);
      groups.set(reason, groupedItemIds);
    });
  });

  return Array.from(groups, ([reason, itemIds]) => ({ reason, itemIds }));
}

export function FlowTransferOmissionDetails({
  omitted,
  testId = 'flow-transfer-loss',
}: FlowTransferOmissionDetailsProps) {
  const omittedItemIds = getOmittedItemIds(omitted);
  if (omittedItemIds.length === 0) return null;
  const reasonGroups = getOmissionReasonGroups(omitted);

  return (
    <section
      data-testid={testId}
      data-transfer-held-count={omitted.heldItemIds.length}
      data-transfer-unavailable-count={omitted.unavailableItemIds.length}
      data-transfer-excluded-count={omitted.excludedItemIds.length}
      data-transfer-omitted-count={omittedItemIds.length}
      data-transfer-omitted-item-ids={omittedItemIds.join(',')}
      className="mt-3 border-l-2 border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] px-3 py-2 text-xs leading-5 text-[var(--flowme-warning-strong)]"
    >
      <p className="font-semibold">이 형식에 담지 않는 항목 {omittedItemIds.length}개</p>
      <ul className="mt-1 list-disc pl-4">
        {reasonGroups.map((group) => (
          <li
            key={`${group.reason}::${group.itemIds.join(',')}`}
            data-testid="flow-transfer-loss-reason"
            data-item-ids={group.itemIds.join(',')}
          >
            {group.reason} · {group.itemIds.length}개
          </li>
        ))}
      </ul>
    </section>
  );
}

function getInitialFocusSelector(
  state: TransferPresentationState,
  route: ResultTransferRequest['route'],
  effectRetryAvailable: boolean,
  receiptRetryAvailable: boolean,
): string {
  if (state === 'failed') {
    return effectRetryAvailable
      ? "[data-testid='flow-transfer-retry']"
      : "[data-flow-transfer-testid='flow-transfer-cancel']";
  }
  if (state === 'partial_local') {
    return receiptRetryAvailable
      ? "[data-testid='my-flow-transfer-retry-receipt']"
      : "[data-flow-transfer-testid='flow-transfer-cancel']";
  }
  if (state === 'succeeded') return "[data-testid='flow-transfer-success-close']";
  if (state === 'cancelled') return "[data-testid='flow-transfer-cancelled-close']";
  if (state === 'pending') return "[data-testid='flow-transfer-pending-status']";
  return route === 'saved_transfer'
    ? "[data-testid='my-flow-transfer-confirm']"
    : "[data-testid='public-flow-quick-result-execute']";
}

function TransferOutcomeNotice({
  request,
  state,
  errorMessage,
  effectRetryAvailable,
  q3CopyEnabled,
}: {
  request: ResultTransferRequest;
  state: TransferPresentationState;
  errorMessage?: string;
  effectRetryAvailable: boolean;
  q3CopyEnabled: boolean;
}) {
  if (state === 'pending') {
    return (
      <p
        data-testid="flow-transfer-pending-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        tabIndex={-1}
        className="mt-4 rounded-[var(--flowme-radius-control)] bg-[var(--flowme-action-soft)] px-3 py-2 text-sm font-semibold text-[var(--flowme-action-strong)]"
      >
        {request.artifact.target === 'local_file' ? '파일을 만드는 중이에요…' : '결과를 복사하는 중이에요…'}
      </p>
    );
  }

  if (state === 'failed') {
    return (
      <div
        data-testid="flow-transfer-error"
        role="alert"
        tabIndex={-1}
        className="mt-4 rounded-[var(--flowme-radius-control)] bg-[var(--flowme-danger-soft)] px-3 py-2 text-sm text-[var(--flowme-danger-strong)]"
      >
        <p className="font-semibold">결과를 만들지 못했어요.</p>
        <p className="mt-1 text-xs leading-5">
          {errorMessage ?? (
            effectRetryAvailable
              ? '계획과 실행 기록은 바뀌지 않았어요. 같은 결과로 다시 시도할 수 있어요.'
              : '계획과 실행 기록은 바뀌지 않았어요. 창을 닫고 현재 결과를 다시 확인해 주세요.'
          )}
        </p>
      </div>
    );
  }

  if (state === 'partial_local') {
    return (
      <div
        data-testid="flow-transfer-partial-local"
        data-transfer-artifact-created="true"
        data-transfer-receipt-persisted="false"
        role="alert"
        tabIndex={-1}
        className="mt-4 rounded-[var(--flowme-radius-control)] bg-[var(--flowme-warning-soft)] px-3 py-2 text-sm text-[var(--flowme-warning-strong)]"
      >
        <p className="font-semibold">결과는 만들었지만 기록을 남기지 못했어요.</p>
        <p className="mt-1 text-xs leading-5">
          {errorMessage ?? '결과를 다시 만들지 않고, 이 결과 기록만 다시 저장합니다.'}
        </p>
      </div>
    );
  }

  if (state === 'succeeded') {
    return (
      <div
        data-testid="flow-transfer-success"
        data-transfer-receipt-persistence={request.persistence}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        tabIndex={-1}
        className="mt-4 rounded-[var(--flowme-radius-control)] bg-[var(--flowme-positive-soft)] px-3 py-2 text-sm text-[var(--flowme-positive-strong)]"
      >
        <p className="font-semibold">
          {request.route === 'saved_transfer'
            ? '결과를 만들고 결과 기록을 남겼어요.'
            : '결과를 만들었어요.'}
        </p>
        {request.route === 'public_quick' ? (
          <p className="mt-1 text-xs leading-5">
            {q3CopyEnabled ? '내 계획에는 저장되지 않았어요.' : 'FlowMe에는 저장되지 않았어요.'}
          </p>
        ) : null}
      </div>
    );
  }

  if (state === 'cancelled') {
    return (
      <p
        data-testid="flow-transfer-cancelled"
        role="status"
        tabIndex={-1}
        className="mt-4 text-sm text-[var(--flowme-text-secondary)]"
      >
        결과를 만들지 않았어요. 계획과 기록은 바뀌지 않았어요.
      </p>
    );
  }

  return null;
}

export function FlowTransferConfirmation({
  request,
  outcome,
  pending = false,
  errorMessage,
  receiptStorageKey,
  returnFocusSelector,
  onConfirm,
  onCancel,
  onRetryEffect,
  onRetryReceipt,
  onSaveRecovery,
  onAcknowledge,
  q3CopyEnabled = true,
}: FlowTransferConfirmationProps) {
  const state: TransferPresentationState = pending ? 'pending' : outcome?.state ?? 'confirming';
  const omittedItemIds = getOmittedItemIds(request.omitted);
  const lossCount = omittedItemIds.length;
  const effectLabel = EFFECT_LABELS[request.artifact.target];
  const dismissLocked = state === 'pending';
  const outcomeSettled = state === 'succeeded' || state === 'cancelled';
  const rootTestId = request.route === 'saved_transfer'
    ? outcome
      ? 'my-flow-transfer-receipt'
      : 'my-flow-transfer-confirmation'
    : outcome
      ? 'public-flow-quick-result-feedback'
      : 'public-flow-quick-result-confirmation';
  const outcomeLabel = state === 'succeeded'
    ? 'success'
    : state === 'failed'
      ? 'error'
      : state;
  const outcomeErrorMessage = errorMessage ?? (
    outcome?.state === 'failed' || outcome?.state === 'partial_local' || outcome?.state === 'cancelled'
      ? outcome.failure.message
      : undefined
  );
  const receiptRetryAvailable = outcome?.state === 'partial_local'
    ? outcome.receiptRetryAvailable
    : false;
  const effectRetryAvailable = outcome?.state === 'failed'
    ? outcome.failure.retryable
    : false;

  return (
    <FlowBottomSheet
      testId={rootTestId}
      headingId="flow-transfer-confirmation-heading"
      p35Marker="P35-P009-RESULT-TRANSFER-CONFIRMATION"
      eyebrow={request.route === 'saved_transfer' ? '저장한 계획의 결과' : '저장 없는 빠른 결과'}
      title={request.route === 'saved_transfer' ? '내 도구로 옮기기' : '바로 결과 만들기'}
      onClose={dismissLocked ? () => undefined : onCancel}
      dismissible={!dismissLocked}
      initialFocusSelector={getInitialFocusSelector(
        state,
        request.route,
        effectRetryAvailable,
        receiptRetryAvailable,
      )}
      returnFocusSelector={returnFocusSelector}
      className="inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-2xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(32rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6"
      dialogProps={{
        'aria-busy': state === 'pending' ? 'true' : undefined,
        'aria-describedby': 'flow-transfer-confirmation-description flow-transfer-one-way-warning',
        'data-transfer-state': state,
        'data-transfer-route': request.route,
        'data-transfer-persistence': request.persistence,
        'data-transfer-request-id': request.requestId,
        'data-transfer-saved-plan-id': request.savedPlanId,
        'data-transfer-snapshot-kind': request.snapshot.kind,
        'data-transfer-snapshot-version': request.snapshot.version,
        'data-transfer-snapshot-hash': request.snapshot.hash,
        'data-transfer-format': request.format,
        'data-transfer-artifact-kind': request.artifactKind,
        'data-transfer-target': request.artifact.target,
        'data-transfer-scope': request.scope.kind,
        'data-transfer-item-ids': request.itemIds.join(','),
        'data-transfer-item-count': request.itemCount,
        'data-transfer-projection-output-count': request.projectionOutputCount,
        'data-transfer-output-count': request.outputCount,
        'data-transfer-omitted-item-ids': omittedItemIds.join(','),
        'data-transfer-omitted-count': lossCount,
        'data-transfer-one-way': request.oneWay ? 'true' : 'false',
        'data-transfer-duplicate-risk': request.duplicateRisk ? 'true' : 'false',
        'data-transfer-return-focus-selector': returnFocusSelector,
        'data-receipt-storage-key': receiptStorageKey,
        'data-snapshot-kind': request.snapshot.kind,
        'data-snapshot-version': request.snapshot.version,
        'data-snapshot-hash': request.snapshot.hash,
        'data-scope': request.scope.kind,
        'data-format': request.format,
        'data-destination': request.format,
        'data-item-ids': request.itemIds.join(','),
        'data-projection-output-count': request.projectionOutputCount,
        'data-output-count': request.outputCount,
        'data-outcome': outcomeLabel,
      }}
    >
      <p
        id="flow-transfer-confirmation-description"
        className="mt-3 text-sm leading-6 text-[var(--flowme-text-secondary)]"
      >
        만들 형식과 범위를 확인한 뒤 시작하세요. 현재 계획과 실행 상태는 바뀌지 않아요.
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-[var(--flowme-radius-control)] bg-[var(--flowme-surface-subtle)] px-3 py-3 text-sm">
        <div>
          <dt className="text-xs text-[var(--flowme-text-tertiary)]">형식</dt>
          <dd data-testid="flow-transfer-format" className="mt-0.5 font-semibold text-[var(--flowme-text)]">
            {FORMAT_LABELS[request.format]}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--flowme-text-tertiary)]">범위</dt>
          <dd data-testid="flow-transfer-scope" className="mt-0.5 font-semibold text-[var(--flowme-text)]">
            {getScopeLabel(request.scope)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--flowme-text-tertiary)]">항목</dt>
          <dd data-testid="flow-transfer-item-count" className="mt-0.5 font-semibold text-[var(--flowme-text)]">
            {request.itemCount}개
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--flowme-text-tertiary)]">만들 결과</dt>
          <dd data-testid="flow-transfer-output-count" className="mt-0.5 font-semibold text-[var(--flowme-text)]">
            {request.outputCount}개
            {request.projectionOutputCount !== request.outputCount ? (
              <span className="mt-0.5 block text-[11px] font-medium text-[var(--flowme-text-secondary)]">
                미리보기 기준 {request.projectionOutputCount}개
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      <FlowTransferOmissionDetails omitted={request.omitted} />

      {q3CopyEnabled ? (
        <div className="mt-3 flex items-start gap-2">
          <p
            id="flow-transfer-one-way-warning"
            data-testid="flow-transfer-one-way-warning"
            className="min-w-0 flex-1 border-l-2 border-[var(--flowme-border-strong)] pl-3 text-xs font-medium leading-5 text-[var(--flowme-text-secondary)]"
          >
            일방향 결과예요. 이후 FlowMe의 수정이 외부 도구에 자동으로 반영되지 않아요.
          </p>
          <FlowContextDisclosure
            kind="caution"
            label="일방향 결과 상세 보기"
            eyebrow="주의"
            title="외부 도구와 자동으로 연결되지 않아요"
            testId="flow-transfer-one-way-help"
          >
            <p>
              외부 도구에서 만든 결과는 FlowMe의 계획과 동기화되지 않습니다. 계획을 바꾼 뒤 다시
              옮길 때는 기존 결과를 지우거나 중복 여부를 확인하세요.
            </p>
          </FlowContextDisclosure>
        </div>
      ) : (
        <p
          id="flow-transfer-one-way-warning"
          data-testid="flow-transfer-one-way-warning"
          className="mt-3 border-l-2 border-[var(--flowme-border-strong)] pl-3 text-xs font-medium leading-5 text-[var(--flowme-text-secondary)]"
        >
          일방향 결과예요. 이후 FlowMe의 수정이 외부 도구에 자동으로 반영되지 않아요.
        </p>
      )}

      {request.duplicateRisk ? (
        <p
          data-testid="flow-transfer-duplicate-warning"
          className="mt-2 border-l-2 border-[var(--flowme-warning)] pl-3 text-xs font-medium leading-5 text-[var(--flowme-warning-strong)]"
        >
          같은 결과를 다시 만들면 외부 도구에 중복될 수 있어요.
        </p>
      ) : null}

      {request.route === 'public_quick' ? (
        <div
          data-testid="flow-transfer-public-not-saved"
          className="mt-3 rounded-[var(--flowme-radius-control)] bg-[var(--flowme-action-soft)] px-3 py-2 text-xs leading-5 text-[var(--flowme-action-strong)]"
        >
          <p className="font-semibold">
            {q3CopyEnabled ? '내 계획에 저장되지 않음' : 'FlowMe에 저장되지 않음'}
          </p>
          <p className="mt-0.5">
            {q3CopyEnabled
              ? '나중에 수정하거나 다시 옮기려면 먼저 내 계획에 저장하세요.'
              : '나중에 수정하거나 다시 옮기려면 먼저 내 Flow에 저장하세요.'}
          </p>
        </div>
      ) : null}

      <TransferOutcomeNotice
        request={request}
        state={state}
        errorMessage={outcomeErrorMessage}
        effectRetryAvailable={effectRetryAvailable}
        q3CopyEnabled={q3CopyEnabled}
      />

      <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-2" data-testid="flow-transfer-actions">
        {!outcomeSettled ? (
          <button
            data-testid={request.route === 'saved_transfer'
              ? 'my-flow-transfer-cancel'
              : 'public-flow-quick-result-cancel'}
            data-flow-transfer-testid="flow-transfer-cancel"
            data-action-priority="secondary"
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            type="button"
            disabled={dismissLocked}
            onClick={onCancel}
          >
            {state === 'partial_local' ? '닫기' : '취소'}
          </button>
        ) : null}

        {state === 'confirming' || state === 'pending' ? (
          <button
            data-testid={request.route === 'saved_transfer'
              ? 'my-flow-transfer-confirm'
              : 'public-flow-quick-result-execute'}
            data-flow-transfer-testid="flow-transfer-confirm"
            data-action-priority="primary"
            className={`${FLOW_UI_PRIMARY_ACTION_CLASS} w-full`}
            type="button"
            disabled={state === 'pending'}
            aria-busy={state === 'pending' ? 'true' : undefined}
            onClick={onConfirm}
          >
            {state === 'pending'
              ? request.artifact.target === 'local_file'
                ? '파일 만드는 중…'
                : '복사하는 중…'
              : effectLabel}
          </button>
        ) : null}

        {state === 'failed' && effectRetryAvailable ? (
          <button
            data-testid="flow-transfer-retry"
            data-action-priority="primary"
            className={`${FLOW_UI_PRIMARY_ACTION_CLASS} w-full`}
            type="button"
            onClick={onRetryEffect}
          >
            {request.artifact.target === 'local_file' ? '같은 파일 다시 만들기' : '같은 결과 다시 복사하기'}
          </button>
        ) : null}

        {state === 'partial_local' && receiptRetryAvailable ? (
          <button
            data-testid="my-flow-transfer-retry-receipt"
            data-flow-transfer-testid="flow-transfer-receipt-retry"
            data-action-priority="primary"
            data-transfer-retry-stage="receipt-only"
            className={`${FLOW_UI_PRIMARY_ACTION_CLASS} w-full`}
            type="button"
            onClick={onRetryReceipt}
          >
            결과 기록만 다시 저장
          </button>
        ) : null}

        {state === 'succeeded' ? (
          <button
            data-testid="flow-transfer-success-close"
            data-action-priority="primary"
            className={`${FLOW_UI_PRIMARY_ACTION_CLASS} col-span-2 w-full`}
            type="button"
            onClick={onAcknowledge ?? onCancel}
          >
            {q3CopyEnabled ? Q3_USER_COPY_PROFILE.receipt.close : '확인'}
          </button>
        ) : null}

        {state === 'cancelled' ? (
          <button
            data-testid="flow-transfer-cancelled-close"
            data-action-priority="primary"
            className={`${FLOW_UI_PRIMARY_ACTION_CLASS} col-span-2 w-full`}
            type="button"
            onClick={onAcknowledge ?? onCancel}
          >
            {q3CopyEnabled ? Q3_USER_COPY_PROFILE.receipt.close : '확인'}
          </button>
        ) : null}
      </div>

      {request.route === 'public_quick' && onSaveRecovery && !dismissLocked ? (
        <button
          type="button"
          data-testid="public-flow-quick-result-save-recovery"
          data-flow-transfer-testid="flow-transfer-save-recovery"
          data-action-priority="secondary"
          className={`${FLOW_UI_SECONDARY_ACTION_CLASS} mt-2 w-full`}
          onClick={onSaveRecovery}
        >
          {q3CopyEnabled
            ? Q3_USER_COPY_PROFILE.transfer.saveAndContinue
            : '내 Flow에 저장하고 이어가기'}
        </button>
      ) : null}
    </FlowBottomSheet>
  );
}

export type { FlowTransferConfirmationProps, FlowTransferOmissionDetailsProps };
