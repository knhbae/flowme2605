'use client';

import { useEffect, useMemo, useRef } from 'react';

import {
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from '@/components/flow/flow-ui';
import type {
  AuthoringSourceState,
  AuthoringSourceUpdateChange,
  AuthoringSourceUpdateResolution,
} from '@/lib/flow/text-authoring/types';

import { AuthoringDialog } from './AuthoringDialog';

type PendingSourceState = Extract<
  AuthoringSourceState,
  { status: 'source_updated' | 'conflict_source_vs_user' }
>;

type SourceUpdateResolution =
  | AuthoringSourceUpdateResolution
  | 'keep_previous';

const FIELD_LABEL: Record<string, string> = {
  title: '제목',
  detail: '설명',
  completion: '완료 기준',
  schedule: '날짜·반복',
  resources: '자료 링크',
  sources: '출처 링크',
  guides: '안내',
  cautions: '주의',
  role: '항목 역할',
  included: '포함 여부',
  nesting: '들여쓰기',
  order: '항목 순서',
  step_mapping: 'Step 연결',
};

const VALUE_LABEL: Record<string, string> = {
  item: '실행 항목',
  resource: '자료',
  guide: '안내',
  caution: '주의',
  completion: '완료 기준',
};

function displayValue(value: unknown): string {
  if (value == null || value === '') return '값 없음';
  if (typeof value === 'string') {
    return VALUE_LABEL[value] ?? value;
  }
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '포함' : '제외';
  if (Array.isArray(value)) {
    if (value.length === 0) return '값 없음';
    return value.map((entry) => {
      if (
        entry
        && typeof entry === 'object'
        && 'url' in entry
        && typeof entry.url === 'string'
      ) {
        const label = 'label' in entry && typeof entry.label === 'string'
          ? entry.label
          : entry.url;
        return `${label} · ${entry.url}`;
      }
      return displayValue(entry);
    }).join(' / ');
  }
  if (typeof value === 'object') {
    if ('title' in value && typeof value.title === 'string') {
      return value.title;
    }
    if ('doneWhen' in value && typeof value.doneWhen === 'string') {
      return value.doneWhen;
    }
    if ('raw' in value && typeof value.raw === 'string') {
      return value.raw;
    }
    if ('date' in value && typeof value.date === 'string') {
      return value.date;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return '구조화된 값';
    }
  }
  return String(value);
}

function changeTitle(change: AuthoringSourceUpdateChange): string {
  if (change.kind === 'changed') {
    return `${FIELD_LABEL[change.field] ?? change.field}가 달라졌습니다`;
  }
  if (change.kind === 'added') {
    return `새 원문 항목 · ${displayValue(change.incomingSourceValue)}`;
  }
  return `새 원문에서 빠진 항목 · ${displayValue(change.oldSourceValue)}`;
}

function changeStateLabel(change: AuthoringSourceUpdateChange): string {
  if (change.kind === 'removed') return 'removed';
  if (change.kind === 'added') return 'added';
  return change.userValue !== undefined ? 'conflict' : 'safe';
}

function resolutionOptions(
  change: AuthoringSourceUpdateChange,
): Array<{ value: SourceUpdateResolution; label: string }> {
  if (change.kind === 'added') {
    return [
      { value: 'include_added', label: '새 항목 포함' },
      { value: 'exclude_added', label: '새 항목은 제외' },
    ];
  }
  if (change.kind === 'removed') {
    return [
      { value: 'keep_previous', label: '이전 원문 연결 유지' },
      { value: 'remove_removed', label: '새 원문처럼 결과에서 제외' },
    ];
  }
  if (change.userValue !== undefined) {
    return [
      { value: 'keep_user', label: '내 값 유지' },
      { value: 'use_incoming', label: '새 원문 값 사용' },
    ];
  }
  return [{ value: 'use_incoming', label: '새 원문 값 사용' }];
}

export function SourceUpdateDialog({
  open,
  state,
  userCorrectionCount,
  onResolve,
  onApply,
  onReject,
  onLater,
}: {
  open: boolean;
  state: PendingSourceState | null;
  userCorrectionCount: number;
  onResolve: (
    changeId: string,
    resolution: SourceUpdateResolution,
  ) => void;
  onApply: () => void;
  onReject: () => void;
  onLater: () => void;
}) {
  const changes = state?.changes ?? [];
  const unresolvedCount = changes.filter(
    (change) => change.state === 'open',
  ).length;
  const activeChange =
    changes.find((change) => change.state === 'open') ??
    changes[changes.length - 1];
  const activeIndex = activeChange
    ? changes.findIndex((change) => change.changeId === activeChange.changeId)
    : -1;
  const changeRef = useRef<HTMLDivElement>(null);
  const options = useMemo(
    () => (activeChange ? resolutionOptions(activeChange) : []),
    [activeChange],
  );

  useEffect(() => {
    if (!open || !activeChange) return;
    const frame = window.requestAnimationFrame(() => {
      changeRef.current
        ?.querySelector<HTMLInputElement>('input[type="radio"]')
        ?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeChange?.changeId, activeChange?.state, open]);

  return (
    <AuthoringDialog
      open={open}
      testId="ta-authoring-source-compare-dialog"
      title="원문 변경 비교"
      description={`이전 원문, 새 원문, 내가 고친 값을 자동으로 합치지 않고 함께 보존합니다. ${unresolvedCount}곳 선택 필요.`}
      initialFocusSelector='[data-testid="ta-authoring-source-change"] input[type="radio"]'
      onClose={onLater}
      footer={(
        <>
          <button
            type="button"
            data-testid="ta-authoring-source-update-later"
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            onClick={onLater}
          >
            나중에
          </button>
          <button
            type="button"
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            onClick={onReject}
          >
            이 새 버전 사용하지 않기
          </button>
          <button
            type="button"
            data-testid="ta-authoring-source-update-apply"
            className={FLOW_UI_PRIMARY_ACTION_CLASS}
            disabled={!state || unresolvedCount > 0}
            onClick={onApply}
          >
            선택한 변경 {changes.length}개 적용
          </button>
        </>
      )}
    >
      {state && activeChange ? (
        <>
          <div className="rounded-[var(--flowme-radius-control)] bg-[var(--flowme-warning-soft)] px-3 py-3 text-xs leading-5 text-[var(--flowme-warning-strong)]">
            내 수정 {userCorrectionCount}개와 현재 결과는 그대로 보존했습니다.
          </div>
          <div
            ref={changeRef}
            data-testid="ta-authoring-source-change"
            data-change-state={changeStateLabel(activeChange)}
            className="mt-4"
          >
            <p className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
              변경 {activeIndex + 1}/{changes.length}
            </p>
            <h3 className="mt-1 text-lg font-semibold">
              {changeTitle(activeChange)}
            </h3>

            {activeChange.kind === 'changed' ? (
              <dl className="mt-4 grid gap-2 lg:grid-cols-3">
                <div className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--flowme-text-tertiary)]">
                    이전 원문
                  </dt>
                  <dd
                    data-testid="ta-authoring-source-old-value"
                    className="mt-2 break-words text-sm font-semibold"
                  >
                    {displayValue(activeChange.oldSourceValue)}
                  </dd>
                </div>
                <div className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)] p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--flowme-text-tertiary)]">
                    새 원문
                  </dt>
                  <dd
                    data-testid="ta-authoring-source-new-value"
                    className="mt-2 break-words text-sm font-semibold"
                  >
                    {displayValue(activeChange.incomingSourceValue)}
                  </dd>
                </div>
                <div className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-positive)] bg-[var(--flowme-positive-soft)] p-3 lg:col-span-1">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--flowme-positive-strong)]">
                    내가 고친 값
                  </dt>
                  <dd
                    data-testid="ta-authoring-source-user-value"
                    className="mt-2 break-words text-sm font-semibold"
                  >
                    {displayValue(activeChange.userValue)}
                  </dd>
                </div>
              </dl>
            ) : (
              <dl className="mt-4">
                <div className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--flowme-text-tertiary)]">
                    {activeChange.kind === 'added' ? '새 원문' : '이전 원문'}
                  </dt>
                  <dd
                    data-testid={
                      activeChange.kind === 'added'
                        ? 'ta-authoring-source-new-value'
                        : 'ta-authoring-source-old-value'
                    }
                    className="mt-2 break-words text-sm font-semibold"
                  >
                    {displayValue(
                      activeChange.kind === 'added'
                        ? activeChange.incomingSourceValue
                        : activeChange.oldSourceValue,
                    )}
                  </dd>
                </div>
              </dl>
            )}

            <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
              <legend className="sr-only">이 변경에 사용할 값</legend>
              {options.map((option) => {
                const selected = activeChange.resolution === option.value;
                const testId =
                  option.value === 'keep_user'
                    ? 'ta-authoring-source-choice-keep-user'
                    : option.value === 'use_incoming'
                      ? 'ta-authoring-source-choice-use-new'
                      : undefined;
                return (
                  <label
                    key={option.value}
                    className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-[var(--flowme-radius-control)] border px-3 py-3 text-sm font-semibold ${
                      selected
                        ? 'border-[var(--flowme-positive)] bg-[var(--flowme-positive-soft)]'
                        : 'border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`source-update-${activeChange.changeId}`}
                      value={option.value}
                      checked={selected}
                      data-testid={testId}
                      onChange={() =>
                        onResolve(activeChange.changeId, option.value)
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </fieldset>
          </div>
        </>
      ) : (
        <p className="text-sm text-[var(--flowme-text-secondary)]">
          비교할 원문 변경이 없습니다.
        </p>
      )}
    </AuthoringDialog>
  );
}
