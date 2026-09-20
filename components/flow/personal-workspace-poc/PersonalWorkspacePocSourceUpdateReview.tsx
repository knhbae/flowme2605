'use client';

import React, {
  useEffect,
  useId,
  useMemo,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';

export type PersonalWorkspacePocSourceUpdateResolution =
  | 'keep-working'
  | 'use-incoming'
  | 'later';

export type PersonalWorkspacePocSourceUpdateChangeKind =
  | 'changed'
  | 'added'
  | 'removed';

export type PersonalWorkspacePocSourceUpdateChange = Readonly<{
  changeId: string;
  kind: PersonalWorkspacePocSourceUpdateChangeKind;
  label: string;
  baseValue?: unknown;
  workingValue?: unknown;
  incomingValue?: unknown;
}>;

export type PersonalWorkspacePocSourceUpdateCandidateSummary = Readonly<{
  changeCount: number;
  userCorrectionCount?: number;
  sourceLabel?: string;
  detectedAtLabel?: string;
}>;

export type PersonalWorkspacePocSourceUpdateStatus =
  | 'pending'
  | 'applying'
  | 'applied'
  | 'undoing'
  | 'failed'
  | 'stale';

export type PersonalWorkspacePocSourceUpdateDeferReason =
  | 'banner'
  | 'button'
  | 'backdrop'
  | 'escape';

export type PersonalWorkspacePocSourceUpdateReviewProps = Readonly<{
  candidate: PersonalWorkspacePocSourceUpdateCandidateSummary;
  changes: readonly PersonalWorkspacePocSourceUpdateChange[];
  resolutions: Readonly<Record<string, PersonalWorkspacePocSourceUpdateResolution | undefined>>;
  selectedChangeId?: string;
  status: PersonalWorkspacePocSourceUpdateStatus;
  open: boolean;
  /** Another active editor/result can own announcements; comparison stays readable. */
  announceBanner?: boolean;
  /** Practice presentation only; default output and comparison ownership stay intact. */
  practice?: Readonly<{ locked: boolean; canUndo: boolean; returnFocusSelector?: string; recordEntryOnly?: boolean }>;
  errorMessage?: string;
  onOpen: () => void;
  onDefer: (reason: PersonalWorkspacePocSourceUpdateDeferReason) => void;
  onSelectChange: (changeId: string) => void;
  onResolve: (
    changeId: string,
    resolution: PersonalWorkspacePocSourceUpdateResolution,
  ) => void;
  onApply: () => void;
  onRetry: () => void;
  onRefreshCandidate: () => void;
  onUndo: () => void;
}>;

type ResolutionOption = Readonly<{
  value: PersonalWorkspacePocSourceUpdateResolution;
  label: string;
  description: string;
}>;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const ACTION_CLASS = 'min-h-11 rounded-[var(--flowme-radius-control)] px-3 py-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';
const SECONDARY_ACTION_CLASS = `${ACTION_CLASS} border border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] text-[var(--flowme-action-strong)] hover:border-[var(--flowme-action)]`;
const PRIMARY_ACTION_CLASS = `${ACTION_CLASS} bg-[var(--flowme-action)] text-white hover:bg-[var(--flowme-action-hover)]`;

function displayValue(value: unknown): string {
  if (value == null || value === '') return '없음';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '포함' : '제외';
  if (Array.isArray(value)) return value.length > 0 ? value.map(displayValue).join(' / ') : '없음';
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['title', 'doneWhen', 'raw', 'date'] as const) {
      if (typeof record[key] === 'string') return record[key];
    }
    if (typeof record.url === 'string') {
      return typeof record.label === 'string'
        ? `${record.label} · ${record.url}`
        : record.url;
    }
    try {
      return JSON.stringify(value) ?? '구조화된 내용';
    } catch {
      return '구조화된 내용';
    }
  }
  return String(value);
}

function changeKindLabel(kind: PersonalWorkspacePocSourceUpdateChangeKind): string {
  if (kind === 'added') return '추가됨';
  if (kind === 'removed') return '빠짐';
  return '내용 변경';
}

export function getPersonalWorkspacePocSourceUpdateResolutionOptions(
  kind: PersonalWorkspacePocSourceUpdateChangeKind,
): readonly ResolutionOption[] {
  if (kind === 'added') {
    return [
      {
        value: 'keep-working',
        label: '추가하지 않기',
        description: '현재 내 작업에는 이 항목을 넣지 않습니다.',
      },
      {
        value: 'use-incoming',
        label: '새 항목 추가',
        description: '새 원문의 항목을 내 작업에 더합니다.',
      },
      {
        value: 'later',
        label: '나중에 결정',
        description: '이곳을 결정하기 전에는 변경을 적용하지 않습니다.',
      },
    ];
  }
  if (kind === 'removed') {
    return [
      {
        value: 'keep-working',
        label: '이전 항목 유지',
        description: '새 원문에서 빠졌어도 내 작업에는 남겨 둡니다.',
      },
      {
        value: 'use-incoming',
        label: '새 원문처럼 제외',
        description: '새 원문에 맞춰 내 작업에서 이 항목을 제외합니다.',
      },
      {
        value: 'later',
        label: '나중에 결정',
        description: '이곳을 결정하기 전에는 변경을 적용하지 않습니다.',
      },
    ];
  }
  return [
    {
      value: 'keep-working',
      label: '내 작업 유지',
      description: '내가 고치거나 사용하던 내용을 그대로 둡니다.',
    },
    {
      value: 'use-incoming',
      label: '새 원문 선택',
      description: '이곳은 새 원문의 내용으로 바꿉니다.',
    },
    {
      value: 'later',
      label: '나중에 결정',
      description: '이곳을 결정하기 전에는 변경을 적용하지 않습니다.',
    },
  ];
}

function focusAfterPaint(target: HTMLElement | null, fallbackSelector?: string, isCurrent?: () => boolean): void {
  if ((!target && !fallbackSelector) || typeof window === 'undefined') return;
  window.requestAnimationFrame(() => {
    if (isCurrent && !isCurrent()) return;
    // Only the practice caller supplies a fallback. Preserve the default
    // presenter's focus contract while rejecting its hidden guide opener.
    if (!fallbackSelector) {
      if (target?.isConnected) target.focus({ preventScroll: true });
      return;
    }
    const visibleOwner = (element: HTMLElement | null): element is HTMLElement => {
      if (!element?.isConnected || element.getClientRects().length === 0
        || element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (parent.tagName !== 'DETAILS' || parent.hasAttribute('open')) continue;
        const summary = Array.from(parent.children).find(child => child.tagName === 'SUMMARY');
        if (!summary?.contains(element)) return false;
      }
      return true;
    };
    if (visibleOwner(target)) {
      target.focus({ preventScroll: true });
      if (document.activeElement === target) return;
    }
    if (isCurrent && !isCurrent()) return;
    const fallback = document.querySelector<HTMLElement>(fallbackSelector);
    if (visibleOwner(fallback)) fallback.focus({ preventScroll: true });
  });
}

function bannerTone(status: PersonalWorkspacePocSourceUpdateStatus): string {
  if (status === 'failed') {
    return 'border-[var(--flowme-danger-border)] bg-[var(--flowme-danger-soft)] text-[var(--flowme-danger-strong)]';
  }
  if (status === 'stale') {
    return 'border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] text-[var(--flowme-warning-strong)]';
  }
  if (status === 'applied' || status === 'undoing') {
    return 'border-[var(--flowme-positive)] bg-[var(--flowme-positive-soft)] text-[var(--flowme-positive-strong)]';
  }
  return 'border-[var(--flowme-action-border)] bg-[var(--flowme-action-soft)] text-[var(--flowme-text)]';
}

function bannerMessage(
  status: PersonalWorkspacePocSourceUpdateStatus,
  errorMessage?: string,
): string {
  if (status === 'applying') return '결정한 변경을 적용하는 중입니다.';
  if (status === 'applied') return '결정한 변경을 내 작업에 반영했습니다.';
  if (status === 'undoing') return '마지막 적용을 되돌리는 중입니다.';
  if (status === 'stale') return '비교를 시작한 뒤 내 작업이 달라져 다시 확인해야 합니다.';
  if (status === 'failed') {
    return errorMessage ?? '적용하지 못했습니다. 내 작업과 선택은 그대로 남아 있습니다.';
  }
  return '내 작업은 변경을 적용하기 전까지 그대로 유지됩니다.';
}

export function PersonalWorkspacePocSourceUpdateReview({
  candidate,
  changes,
  resolutions,
  selectedChangeId,
  status,
  open,
  announceBanner = true,
  practice,
  errorMessage,
  onOpen,
  onDefer,
  onSelectChange,
  onResolve,
  onApply,
  onRetry,
  onRefreshCandidate,
  onUndo,
}: PersonalWorkspacePocSourceUpdateReviewProps) {
  const headingId = useId();
  const descriptionId = useId();
  const statusMessageId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const activeChangeRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const focusReturnEpoch = useRef(0);
  const practiceReturnFocusSelector = practice?.returnFocusSelector;
  const practiceMode = Boolean(practice);

  const unresolvedCount = changes.filter((change) => {
    const resolution = resolutions[change.changeId];
    return !resolution || resolution === 'later';
  }).length;
  const activeChange = changes.find((change) => change.changeId === selectedChangeId)
    ?? changes.find((change) => {
      const resolution = resolutions[change.changeId];
      return !resolution || resolution === 'later';
    })
    ?? changes[0];
  const activeIndex = activeChange
    ? changes.findIndex((change) => change.changeId === activeChange.changeId)
    : -1;
  const resolutionOptions = useMemo(
    () => getPersonalWorkspacePocSourceUpdateResolutionOptions(activeChange?.kind ?? 'changed'),
    [activeChange?.kind],
  );
  const compareLocked = Boolean(practice?.locked) || status === 'stale'
    || status === 'applying'
    || status === 'applied'
    || status === 'undoing';
  const applyDisabled = changes.length === 0 || unresolvedCount > 0 || compareLocked;
  const dialogDescription = unresolvedCount > 0
    ? `${unresolvedCount}곳을 더 결정해야 적용할 수 있습니다.`
    : '모든 변경을 결정했습니다. 적용 전까지 내 작업은 바뀌지 않습니다.';

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    focusReturnEpoch.current += 1;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      && document.activeElement !== document.body
      ? document.activeElement
      : null;
    openerRef.current = previouslyFocused;
    return () => {
      const epoch = ++focusReturnEpoch.current;
      focusAfterPaint(openerRef.current, practiceReturnFocusSelector,
        practiceReturnFocusSelector ? () => focusReturnEpoch.current === epoch : undefined);
    };
  }, [open, practiceReturnFocusSelector]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return undefined;
    const focusOwner = document.activeElement;
    const dialog = dialogRef.current;
    const frame = window.requestAnimationFrame(() => {
      if (practiceMode && (!dialog?.isConnected || dialogRef.current !== dialog
        || document.activeElement !== focusOwner)) return;
      const error = practiceMode && status === 'failed'
        ? dialog?.querySelector<HTMLElement>('[data-testid="personal-workspace-source-update-error"]')
        : null;
      const choice = activeChangeRef.current
        ?.querySelector<HTMLInputElement>('input[type="radio"]:not([disabled])');
      const nextAction = dialogRef.current
        ?.querySelector<HTMLElement>('[data-source-update-next-action="true"]');
      const fallback = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (error ?? choice ?? nextAction ?? fallback ?? dialogRef.current)?.focus({ preventScroll: true });
      if (error?.isConnected && document.activeElement === error && dialogRef.current === dialog) {
        error.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeChange?.changeId, open, practiceMode, status]);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onDefer('escape');
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((element) => !element.closest('[hidden]') && element.getAttribute('aria-hidden') !== 'true');
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!dialogRef.current.contains(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const handleBackdropMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onDefer('backdrop');
  };

  const bannerMeta = [candidate.sourceLabel, candidate.detectedAtLabel]
    .filter(Boolean)
    .join(' · ');
  const hideRecordBanner = Boolean(practice?.recordEntryOnly)
    && !open && !practice?.locked && !errorMessage
    && (status === 'pending' || status === 'applied');

  return (
    <>
      <section
        data-testid="personal-workspace-source-update-banner"
        hidden={hideRecordBanner ? true : undefined}
        aria-hidden={open || hideRecordBanner ? true : undefined}
        inert={open || hideRecordBanner ? true : undefined}
        role={announceBanner ? status === 'failed' || status === 'stale' ? 'alert' : 'status' : undefined}
        aria-live={announceBanner ? status === 'failed' || status === 'stale' ? 'assertive' : 'polite' : 'off'}
        className={`${hideRecordBanner ? 'hidden' : 'flex'} min-w-0 flex-wrap items-center justify-between gap-3 border px-4 py-3 ${bannerTone(status)}`}
      >
        <div className="min-w-0 flex-1">
          <h2 className="break-keep text-sm font-semibold">
            {practice ? `보관된 로컬 비교 · 결정 ${changes.length - unresolvedCount}/${changes.length}` : <>새 원문에서 {candidate.changeCount}곳 달라짐</>}
          </h2>
          <p className="mt-1 break-keep text-xs leading-5">
            {bannerMessage(status, errorMessage)}
          </p>
          {bannerMeta ? <p className="mt-1 truncate text-xs opacity-80">{bannerMeta}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {status === 'applied' ? !practice || practice.canUndo ? (
            <button
              type="button"
              data-testid="personal-workspace-source-update-banner-undo"
              className={SECONDARY_ACTION_CLASS}
              onClick={onUndo}
            >
              되돌리기
            </button>
          ) : null : status === 'applying' || status === 'undoing' ? (
            <span className="inline-flex min-h-11 items-center px-2 text-sm font-semibold" aria-busy="true">
              {status === 'applying' ? '적용하는 중…' : '되돌리는 중…'}
            </span>
          ) : (
            <>
              <button
                type="button"
                data-testid="personal-workspace-source-update-banner-review"
                className={PRIMARY_ACTION_CLASS}
                onClick={onOpen}
              >
                변경 확인
              </button>
              <button
                type="button"
                data-testid="personal-workspace-source-update-banner-later"
                className={SECONDARY_ACTION_CLASS}
                onClick={() => onDefer('banner')}
              >
                나중에
              </button>
            </>
          )}
        </div>
      </section>

      {open ? (
        <div
          data-testid="personal-workspace-source-update-backdrop"
          className="fixed inset-0 z-[100] flex min-w-0 items-end justify-center overflow-hidden bg-[var(--flowme-overlay)] min-[900px]:items-stretch min-[900px]:justify-end"
          onMouseDown={handleBackdropMouseDown}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            aria-describedby={`${descriptionId}${status === 'failed' || status === 'stale' ? ` ${statusMessageId}` : ''}`}
            tabIndex={-1}
            data-testid="personal-workspace-source-update-dialog"
            data-source-update-presentation="mobile-sheet-desktop-drawer"
            className="flex max-h-[94dvh] w-full min-w-0 flex-col overflow-hidden rounded-t-[var(--flowme-radius-sheet)] bg-[var(--flowme-surface)] text-[var(--flowme-text)] shadow-[var(--flowme-shadow-overlay)] min-[900px]:h-[100dvh] min-[900px]:max-h-[100dvh] min-[900px]:max-w-[40rem] min-[900px]:rounded-none min-[900px]:border-l min-[900px]:border-[var(--flowme-border)]"
            onKeyDown={handleDialogKeyDown}
          >
            <header className="flex shrink-0 items-start gap-3 border-b border-[var(--flowme-border)] px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5 min-[900px]:pt-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--flowme-action-strong)]">
                  {practice ? `예시 원문에서 ${candidate.changeCount}곳 달라짐` : <>새 원문에서 {candidate.changeCount}곳 달라짐</>}
                </p>
                <h2 id={headingId} className="mt-1 text-xl font-semibold tracking-[-0.02em]">
                  {practice ? '로컬 원문 비교 연습' : '새 원문과 내 작업 비교'}
                </h2>
                <p id={descriptionId} className="mt-1 break-keep text-sm leading-5 text-[var(--flowme-text-secondary)]">
                  {dialogDescription}
                </p>
              </div>
              <button
                type="button"
                data-testid="personal-workspace-source-update-close"
                aria-label="닫고 나중에"
                className={`${SECONDARY_ACTION_CLASS} min-w-11 shrink-0 px-2 text-lg`}
                onClick={() => onDefer('button')}
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <div
              data-testid="personal-workspace-source-update-scroll"
              data-source-update-dialog-scroll="true"
              className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [scroll-padding-bottom:6rem] sm:px-5"
            >
              {status === 'stale' ? (
                <div
                  id={statusMessageId}
                  role="alert"
                  data-testid="personal-workspace-source-update-stale"
                  className="mb-4 border-l-2 border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] px-3 py-3 text-sm leading-6 text-[var(--flowme-warning-strong)]"
                >
                  <p>{practice ? errorMessage ?? '비교 뒤 저장 상태가 달라졌어요. 기존 선택을 확인한 뒤 현재 원문으로 다시 비교해 주세요.' : '비교를 시작한 뒤 내 작업이 달라졌습니다. 현재 작업 기준으로 새 원문을 다시 받아 주세요.'}</p>
                  <button
                    type="button"
                    data-testid="personal-workspace-source-update-refresh"
                    data-source-update-next-action="true"
                    className={`${SECONDARY_ACTION_CLASS} mt-3`}
                    onClick={onRefreshCandidate}
                    disabled={practice?.locked}
                  >
                    {practice ? '현재 원문으로 다시 비교' : '새 원문 다시 받기'}
                  </button>
                </div>
              ) : status === 'failed' ? (
                <div
                  id={statusMessageId}
                  role="alert"
                  data-testid="personal-workspace-source-update-error"
                  tabIndex={practice ? -1 : undefined}
                  className="mb-4 border-l-2 border-[var(--flowme-danger)] bg-[var(--flowme-danger-soft)] px-3 py-3 text-sm leading-6 text-[var(--flowme-danger-strong)]"
                >
                  {errorMessage ?? '변경을 적용하지 못했습니다. 내 작업과 선택은 그대로 남아 있습니다. 아래에서 다시 적용할 수 있습니다.'}
                </div>
              ) : null}

              {changes.length > 0 && activeChange ? (
                <div className="grid min-h-0 min-w-0 gap-4 min-[900px]:grid-cols-[10rem_minmax(0,1fr)]">
                  <nav aria-label="달라진 곳" className="min-w-0" data-testid="personal-workspace-source-update-nav">
                    <ol className="flex min-w-0 gap-2 overflow-x-auto pb-1 min-[900px]:flex-col min-[900px]:overflow-visible">
                      {changes.map((change, index) => {
                        const selected = change.changeId === activeChange.changeId;
                        const resolution = resolutions[change.changeId];
                        const decided = Boolean(resolution && resolution !== 'later');
                        return (
                          <li key={change.changeId} className="shrink-0 min-[900px]:w-full">
                            <button
                              type="button"
                              data-testid="personal-workspace-source-update-nav-item"
                              data-change-id={change.changeId}
                              aria-current={selected ? 'step' : undefined}
                              aria-label={`변경 ${index + 1}: ${change.label}, ${decided ? '결정 완료' : '결정 필요'}`}
                              className={`min-h-11 w-full rounded-[var(--flowme-radius-control)] border px-3 py-2 text-left text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] ${selected
                                ? 'border-[var(--flowme-action)] bg-[var(--flowme-action-soft)] text-[var(--flowme-action-strong)]'
                                : 'border-[var(--flowme-border)] bg-[var(--flowme-surface)] text-[var(--flowme-text-secondary)]'}`}
                              onClick={() => onSelectChange(change.changeId)}
                            >
                              <span className="block">변경 {index + 1}</span>
                              <span className="mt-0.5 block truncate font-normal">
                                {decided ? '결정 완료' : '결정 필요'}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </nav>

                  <div
                    ref={activeChangeRef}
                    data-testid="personal-workspace-source-update-change"
                    data-change-id={activeChange.changeId}
                    className="min-w-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
                        변경 {activeIndex + 1}/{changes.length}
                      </p>
                      <span className="rounded-full bg-[var(--flowme-surface-subtle)] px-2 py-1 text-xs font-semibold text-[var(--flowme-text-secondary)]">
                        {changeKindLabel(activeChange.kind)}
                      </span>
                    </div>
                    <h3 className="mt-2 break-words text-lg font-semibold">{activeChange.label}</h3>

                    {(candidate.userCorrectionCount ?? 0) > 0 ? (
                      <p className="mt-2 break-keep text-xs leading-5 text-[var(--flowme-text-secondary)]">
                        내가 고친 내용 {candidate.userCorrectionCount}개는 선택하기 전까지 그대로 유지됩니다.
                      </p>
                    ) : null}

                    <dl className="mt-4 grid min-w-0 gap-2">
                      <div className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] p-3">
                        <dt className="text-xs font-semibold text-[var(--flowme-text-secondary)]">기준 원문</dt>
                        <dd
                          data-testid="personal-workspace-source-update-base"
                          className="mt-2 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]"
                        >
                          {displayValue(activeChange.baseValue)}
                        </dd>
                      </div>
                      <div className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-positive)] bg-[var(--flowme-positive-soft)] p-3">
                        <dt className="text-xs font-semibold text-[var(--flowme-positive-strong)]">{practice ? '현재 원문' : '내 작업'}</dt>
                        <dd
                          data-testid="personal-workspace-source-update-working"
                          className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold [overflow-wrap:anywhere]"
                        >
                          {displayValue(activeChange.workingValue)}
                        </dd>
                      </div>
                      <div className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] p-3">
                        <dt className="text-xs font-semibold text-[var(--flowme-text-secondary)]">새 원문</dt>
                        <dd
                          data-testid="personal-workspace-source-update-incoming"
                          className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold [overflow-wrap:anywhere]"
                        >
                          {displayValue(activeChange.incomingValue)}
                        </dd>
                      </div>
                    </dl>

                    <fieldset className="mt-4 grid gap-2">
                      <legend className="text-sm font-semibold">이 변경은 어떻게 할까요?</legend>
                      {resolutionOptions.map((option) => {
                        const selected = resolutions[activeChange.changeId] === option.value;
                        return (
                          <label
                            key={option.value}
                            className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-[var(--flowme-radius-control)] border px-3 py-3 text-sm ${selected
                              ? 'border-[var(--flowme-action)] bg-[var(--flowme-action-soft)]'
                              : 'border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)]'}`}
                          >
                            <input
                              type="radio"
                              name={`${headingId}-${activeChange.changeId}`}
                              value={option.value}
                              checked={selected}
                              data-testid={`personal-workspace-source-update-choice-${option.value}`}
                              disabled={compareLocked}
                              className="mt-1 h-4 w-4 shrink-0 accent-[var(--flowme-action)]"
                              onChange={() => onResolve(activeChange.changeId, option.value)}
                            />
                            <span className="min-w-0">
                              <span className="block font-semibold">{option.label}</span>
                              <span className="mt-0.5 block break-keep text-xs font-normal leading-5 text-[var(--flowme-text-secondary)]">
                                {option.description}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </fieldset>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--flowme-text-secondary)]">비교할 원문 변경이 없습니다.</p>
              )}
            </div>

            <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--flowme-border)] bg-[var(--flowme-surface)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 min-[900px]:pb-4">
              <p
                data-testid="personal-workspace-source-update-unresolved"
                className="mr-auto text-xs font-semibold text-[var(--flowme-text-secondary)]"
                role="status"
              >
                {unresolvedCount > 0 ? `${unresolvedCount}곳 결정 필요` : '적용 준비 완료'}
              </p>
              <button
                type="button"
                data-testid="personal-workspace-source-update-later"
                className={SECONDARY_ACTION_CLASS}
                disabled={status === 'applying' || status === 'undoing'}
                onClick={() => onDefer('button')}
              >
                닫고 나중에
              </button>
              <button
                type="button"
                data-testid="personal-workspace-source-update-apply"
                data-source-update-next-action={status === 'failed' ? 'true' : undefined}
                className={PRIMARY_ACTION_CLASS}
                disabled={applyDisabled}
                aria-describedby={applyDisabled ? descriptionId : undefined}
                onClick={status === 'failed' ? onRetry : onApply}
              >
                {status === 'applying'
                  ? '적용하는 중…'
                  : status === 'failed'
                    ? '다시 적용'
                    : '결정한 변경 적용'}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
