'use client';

import { FlowBottomSheet } from './FlowExecutionPrimitives';
import {
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from './flow-ui';
import type { PublicFlowSavedCopySummary } from '@/lib/flow/public-flow-save-transaction';

export type PublicFlowExistingCopyDecision = 'overwrite' | 'copy' | '';

const savedAtFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Seoul',
});

function formatSavedAt(savedAt: string): string {
  const parsed = new Date(savedAt);
  if (Number.isNaN(parsed.getTime())) return '저장 시각 확인 불가';
  return `${savedAtFormatter.format(parsed)} 저장`;
}

export function PublicFlowExistingCopyDialog({
  copies,
  decision,
  overwriteTarget,
  pending,
  error,
  recoveryRequired = false,
  q3CopyEnabled = true,
  onDecisionChange,
  onOverwriteTargetChange,
  onConfirm,
  onCancel,
}: {
  copies: readonly PublicFlowSavedCopySummary[];
  decision: PublicFlowExistingCopyDecision;
  overwriteTarget: string;
  pending: boolean;
  error?: string;
  recoveryRequired?: boolean;
  q3CopyEnabled?: boolean;
  onDecisionChange: (decision: Exclude<PublicFlowExistingCopyDecision, ''>) => void;
  onOverwriteTargetChange: (personalCopyKey: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dismissLocked = pending || recoveryRequired;
  const canConfirm = recoveryRequired
    || decision === 'copy'
    || (decision === 'overwrite' && Boolean(overwriteTarget));

  return (
    <FlowBottomSheet
      testId="public-flow-existing-copy-dialog"
      headingId="public-flow-existing-copy-heading"
      eyebrow="저장 방식 선택"
      title={q3CopyEnabled ? '이미 저장한 계획이 있어요' : '이미 저장한 Flow가 있어요'}
      onClose={dismissLocked ? () => undefined : onCancel}
      dismissible={!dismissLocked}
      returnFocusSelector="[data-testid='public-flow-save-primary-mobile'], [data-testid='public-flow-save-primary']"
      initialFocusSelector={pending
        ? '#public-flow-existing-copy-pending-status'
        : recoveryRequired
          ? "[data-testid='public-flow-save-recovery']"
          : error
            ? "[data-testid='public-flow-save-retry']"
            : undefined}
      className="inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-2xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(32rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6"
      dialogProps={{
        'aria-busy': pending ? 'true' : undefined,
        'aria-describedby': pending
          ? 'public-flow-existing-copy-description public-flow-existing-copy-pending-status'
          : 'public-flow-existing-copy-description',
      }}
    >
      <p
        id="public-flow-existing-copy-description"
        className="mt-3 text-sm leading-6 text-[var(--flowme-text-secondary)]"
      >
        기존 저장본을 바꿀지, 현재 수정 내용으로 새 사본을 만들지 선택해 주세요.
      </p>

      <fieldset className="mt-4 grid gap-3" disabled={pending || Boolean(error)}>
        <legend className="sr-only">저장 방식</legend>
        <div className="rounded-xl border border-[var(--flowme-border)] bg-white p-3">
          <div className="flex min-h-11 items-start gap-3">
            <input
              id="public-flow-existing-copy-choice-overwrite"
              data-testid="public-flow-existing-copy-choice-overwrite"
              className="mt-1 h-5 w-5"
              type="radio"
              name="public-flow-existing-copy-decision"
              checked={decision === 'overwrite'}
              onChange={() => onDecisionChange('overwrite')}
            />
            <label htmlFor="public-flow-existing-copy-choice-overwrite" className="min-w-0 flex-1 cursor-pointer">
              <span className="block text-sm font-semibold text-[var(--flowme-text)]">기존 저장본 덮어쓰기</span>
              <span className="mt-1 block text-xs leading-5 text-[var(--flowme-text-secondary)]">
                선택한 저장본에 현재 제목·일정·항목 편집을 반영합니다. 그 저장본의 완료·메모는 유지되고,
                다른 저장본은 바뀌지 않습니다.
              </span>
            </label>
          </div>
          {decision === 'overwrite' ? (
            <fieldset className="mt-3 grid gap-2 border-t border-[var(--flowme-border)] pt-3">
              <legend className="mb-1 text-xs font-semibold text-[var(--flowme-text-secondary)]">
                덮어쓸 저장본을 선택하세요
              </legend>
              {copies.map((copy, index) => {
                const targetId = `public-flow-existing-copy-overwrite-target-${index}`;
                const displayTitle = copy.personalTitle?.trim()
                  || `${q3CopyEnabled ? '저장한 계획' : '저장한 Flow'} ${index + 1}`;
                return (
                  <div
                    key={copy.personalCopyKey}
                    className="flex min-h-11 items-start gap-2 rounded-lg bg-[var(--flowme-bg)] px-3 py-2"
                  >
                    <input
                      id={targetId}
                      data-testid="public-flow-existing-copy-overwrite-target"
                      data-personal-copy-key={copy.personalCopyKey}
                      className="mt-0.5 h-4 w-4"
                      type="radio"
                      name="public-flow-existing-copy-overwrite-target"
                      checked={overwriteTarget === copy.personalCopyKey}
                      onChange={() => onOverwriteTargetChange(copy.personalCopyKey)}
                    />
                    <label htmlFor={targetId} className="min-w-0 flex-1 cursor-pointer text-xs">
                      <span className="block break-words font-semibold text-[var(--flowme-text)]">
                        {displayTitle}
                      </span>
                      <span className="mt-0.5 block text-[var(--flowme-text-secondary)]">
                        사본 {index + 1} · {formatSavedAt(copy.savedAt)}
                      </span>
                    </label>
                  </div>
                );
              })}
            </fieldset>
          ) : null}
        </div>

        <div className="flex min-h-11 items-start gap-3 rounded-xl border border-[var(--flowme-border)] bg-white p-3">
          <input
            id="public-flow-existing-copy-choice-copy"
            data-testid="public-flow-existing-copy-choice-copy"
            className="mt-1 h-5 w-5"
            type="radio"
            name="public-flow-existing-copy-decision"
            checked={decision === 'copy'}
            onChange={() => onDecisionChange('copy')}
          />
          <label htmlFor="public-flow-existing-copy-choice-copy" className="min-w-0 flex-1 cursor-pointer">
            <span className="block text-sm font-semibold text-[var(--flowme-text)]">새 사본 만들기</span>
            <span className="mt-1 block text-xs leading-5 text-[var(--flowme-text-secondary)]">
              현재 제목·일정·항목 편집으로 새 저장본을 만듭니다. 기존 저장본과 완료·메모는 그대로 두며,
              기존 실행 기록은 새 사본에 복사하지 않습니다.
            </span>
          </label>
        </div>
      </fieldset>

      {pending ? (
        <p
          id="public-flow-existing-copy-pending-status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          tabIndex={-1}
          className="sr-only"
        >
          저장 중입니다. 저장이 끝날 때까지 이 창을 닫을 수 없습니다.
        </p>
      ) : null}

      {error ? (
        <div
          data-testid="public-flow-save-error"
          role="alert"
          className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          <p className="font-semibold">{error}</p>
          <p className="mt-1 text-xs leading-5">
            {recoveryRequired
              ? '저장 전 상태를 모두 복구하기 전에는 이 창을 닫거나 다른 저장 방식을 선택할 수 없어요.'
              : '같은 방식으로 다시 저장하거나, 취소한 뒤 다른 방식을 선택할 수 있어요.'}
          </p>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-2">
        <button
          data-testid="public-flow-existing-copy-cancel"
          className={FLOW_UI_SECONDARY_ACTION_CLASS}
          type="button"
          disabled={dismissLocked}
          onClick={onCancel}
        >
          취소
        </button>
        <button
          data-testid={recoveryRequired
            ? 'public-flow-save-recovery'
            : error
              ? 'public-flow-save-retry'
              : 'public-flow-existing-copy-confirm'}
          className={`${FLOW_UI_PRIMARY_ACTION_CLASS} w-full`}
          type="button"
          disabled={!canConfirm || pending}
          aria-busy={pending ? 'true' : undefined}
          onClick={onConfirm}
        >
          {pending
            ? '저장 중…'
            : recoveryRequired
              ? '저장 전 상태 다시 복구'
              : error
              ? '같은 방식으로 다시 저장'
              : decision === 'overwrite'
                ? '선택한 저장본 덮어쓰기'
                : decision === 'copy'
                  ? '새 사본으로 저장'
                  : '저장 방식 선택 필요'}
        </button>
      </div>
    </FlowBottomSheet>
  );
}
